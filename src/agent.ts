// InboxAgent: one Durable Object per user (PRD §8.1). It owns the user's SQLite store, Gmail and
// Calendar sync state, schedules (watch renewal, morning brief, follow-up sweeps, learning) and
// a durable per-message processing queue. All decision logic lives in InboxCore.

import { Agent } from "agents";
import { WorkersAiInference } from "./ai/workers-ai";
import type { Inference } from "./ai/types";
import { InboxCore } from "./core/pipeline";
import { Store, type SqlRunner } from "./core/store";
import { nextLocalTime } from "./core/time";
import { decryptSecret, sign } from "./crypto";
import type { Env } from "./env";
import { ReauthRequiredError, TokenProvider } from "./google/auth";
import { CalendarRest } from "./google/calendar";
import { GmailRest } from "./google/gmail";
import { HistoryGoneError, type CalendarApi, type MailApi } from "./google/types";
import { DEFAULT_SETTINGS, type EmailMessage, type UserSettings } from "./types";

export interface AgentState {
  onboarded: boolean;
  needsReauth: boolean;
  lastSyncAt: number | null;
  awaitingApproval: number;
}

/** Test seam: lets the workerd integration tests substitute inference (there is no local AI binding). */
export const testing: { inference?: Inference } = {};

const BACKFILL_LIMIT = 300;

export class InboxAgent extends Agent<Env, AgentState> {
  initialState: AgentState = { onboarded: false, needsReauth: false, lastSyncAt: null, awaitingApproval: 0 };

  private _store?: Store;
  private _core?: InboxCore;
  private _auth?: TokenProvider;

  private get store(): Store {
    if (!this._store) {
      const runner: SqlRunner = (query, ...params) => [...this.ctx.storage.sql.exec(query, ...params)] as any[];
      this._store = new Store(runner);
    }
    return this._store;
  }

  private get auth(): TokenProvider {
    if (!this._auth) {
      this._auth = new TokenProvider(
        { clientId: this.env.GOOGLE_CLIENT_ID, clientSecret: this.env.GOOGLE_CLIENT_SECRET, redirectUri: `${this.env.PUBLIC_URL}/auth/callback` },
        async () => {
          const enc = this.store.get("refresh_token_enc");
          return enc ? decryptSecret(enc, this.env.TOKEN_ENC_KEY) : null;
        },
      );
    }
    return this._auth;
  }

  private get mail(): MailApi {
    return new GmailRest(this.auth);
  }
  private get calendar(): CalendarApi {
    return new CalendarRest(this.auth);
  }

  private get core(): InboxCore {
    if (!this._core) {
      const ai =
        testing.inference ??
        new WorkersAiInference(this.env.AI ?? missingAi(), { gatewayId: this.env.AI_GATEWAY_ID, userId: this.name });
      this._core = new InboxCore({ store: this.store, mail: this.mail, calendar: this.calendar, ai, baseUrl: this.env.PUBLIC_URL });
    }
    return this._core;
  }

  private refreshState(patch: Partial<AgentState> = {}) {
    const awaitingApproval = this.store.openTasks().filter((t) => t.status === "awaiting_approval").length;
    this.setState({ ...this.state, awaitingApproval, ...patch });
  }

  /** Runs `fn`, turning revoked Google access into a "reconnect" flag instead of a crash loop. */
  private async guarded<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ReauthRequiredError) {
        this.store.set("needs_reauth", "1");
        this.refreshState({ needsReauth: true });
        return null;
      }
      throw e;
    }
  }

  // ── onboarding (PRD §6.1) ────────────────────────────────────────────────

  async onboard(input: { email: string; name?: string; refreshTokenEnc: string; timezone?: string }): Promise<void> {
    const existing = this.store.getSettings();
    const settings: UserSettings = { ...DEFAULT_SETTINGS, ...existing, email: input.email.toLowerCase() };
    if (input.timezone && !existing) settings.timezone = input.timezone;
    this.store.saveSettings(settings);
    if (input.name) this.store.set("user_name", input.name);
    this.store.set("refresh_token_enc", input.refreshTokenEnc);
    this.store.delete("needs_reauth");
    this._auth?.invalidate();

    await this.core.labelIds();
    await this.startWatches();
    await this.resetSchedules();

    if (!this.store.get("backfill_done")) {
      // Backfill the last 30 days, oldest first, then send the first brief (PRD §6.1 step 3–4).
      const ids = (await this.mail.listMessageIds("newer_than:30d -in:chats -in:spam -in:trash", BACKFILL_LIMIT)).reverse();
      for (const id of ids) await this.queue("processMessageById", { id });
      await this.queue("finishBackfill", {});
    }
    this.refreshState({ onboarded: true, needsReauth: false });
  }

  /** Without a Pub/Sub topic (e.g. local dev, where Google can't reach the Worker) Mise polls Gmail instead. */
  private get pollMode(): boolean {
    return !this.env.PUBSUB_TOPIC;
  }

  private async startWatches() {
    if (this.pollMode) {
      if (!this.store.get("history_id")) this.store.set("history_id", (await this.mail.getProfile()).historyId);
    } else {
      const watch = await this.mail.watch(this.env.PUBSUB_TOPIC!);
      if (!this.store.get("history_id")) this.store.set("history_id", watch.historyId);
      this.store.set("watch_expiration", String(watch.expiration));
    }
    if (this.env.PUBLIC_URL.startsWith("https://")) {
      const channelId = crypto.randomUUID();
      const token = await sign(`cal:${this.name}`, this.env.SESSION_SECRET);
      await this.guarded(() => this.calendar.watch(channelId, `${this.env.PUBLIC_URL}/webhooks/calendar`, token));
    }
    await this.guarded(() => this.core.syncCalendar());
  }

  private async resetSchedules() {
    for (const s of this.getSchedules()) await this.cancelSchedule(s.id);
    await this.schedule("17 4 * * *", "renewWatch"); // FR-1: daily; watches expire after 7 days
    await this.schedule("7 * * * *", "hourly"); // follow-ups, snoozes, calendar safety sync
    await this.schedule("43 2 * * *", "nightlyLearning"); // FR-26
    if (this.pollMode) await this.schedule("*/2 * * * *", "syncMail");
    await this.scheduleBrief();
  }

  private async scheduleBrief() {
    const s = this.store.getSettings();
    if (!s) return;
    for (const sch of this.getSchedules()) if (sch.callback === "morningBrief") await this.cancelSchedule(sch.id);
    await this.schedule(new Date(nextLocalTime(Date.now(), s.timezone, s.briefTime)), "morningBrief");
  }

  async finishBackfill() {
    this.store.set("backfill_done", "1");
    await this.guarded(() => this.core.sendBrief());
    this.refreshState();
  }

  // ── ingestion (FR-1/2/3) ─────────────────────────────────────────────────

  /** Pub/Sub push: record the new historyId and sync in the background so the push is acked fast. */
  async onGmailPush(historyId: string): Promise<void> {
    this.store.set("latest_push_history_id", historyId);
    await this.queue("syncMail", {});
  }

  async syncMail(): Promise<{ queued: number }> {
    const result = await this.guarded(async () => {
      const start = this.store.get("history_id");
      let ids: string[];
      let historyId: string;
      try {
        if (!start) throw new HistoryGoneError();
        ({ messageIds: ids, historyId } = await this.mail.listHistory(start));
      } catch (e) {
        if (!(e instanceof HistoryGoneError)) throw e;
        // FR-2 fallback: full resync of recent mail.
        const profile = await this.mail.getProfile();
        ids = (await this.mail.listMessageIds("newer_than:2d -in:chats", 100)).reverse();
        historyId = profile.historyId;
      }
      for (const id of ids) if (!this.store.hasMessage(id)) await this.queue("processMessageById", { id });
      this.store.set("history_id", historyId);
      return ids.length;
    });
    this.refreshState({ lastSyncAt: Date.now() });
    return { queued: result ?? 0 };
  }

  async processMessageById(payload: { id: string }) {
    if (this.store.hasMessage(payload.id)) return;
    await this.guarded(async () => {
      let msg: EmailMessage;
      try {
        msg = await this.mail.getMessage(payload.id);
      } catch (e) {
        if ((e as { status?: number }).status === 404) return; // deleted before we got to it
        throw e;
      }
      await this.core.processMessage(msg);
    });
    this.refreshState();
  }

  async onCalendarPush(): Promise<void> {
    await this.queue("syncCalendarNow", {});
  }

  async syncCalendarNow() {
    await this.guarded(() => this.core.syncCalendar());
    this.refreshState();
  }

  /** Story 8: the user forwarded an email to their agent address with "handle this". */
  async handleDelegated(input: { subject: string; instruction: string; originalFrom?: string }): Promise<{ status: string; taskIds: string[] }> {
    const out = await this.guarded(async () => {
      const subject = input.subject.replace(/^(fwd?|fw):\s*/i, "").trim();
      const query = `subject:"${subject.replace(/"/g, "")}" newer_than:60d -in:sent${input.originalFrom ? ` from:${input.originalFrom}` : ""}`;
      const [id] = await this.mail.listMessageIds(query, 1);
      if (!id) return { status: "not_found", taskIds: [] as string[] };
      const msg = await this.mail.getMessage(id);
      const res = await this.core.processMessage({ ...msg, id: `${msg.id}#delegated-${Date.now()}` }, { delegated: true });
      return { status: res.status, taskIds: "tasks" in res ? res.tasks : [] };
    });
    this.refreshState();
    return out ?? { status: "needs_reauth", taskIds: [] };
  }

  // ── schedules ────────────────────────────────────────────────────────────

  async renewWatch() {
    await this.guarded(() => this.startWatches());
  }

  async hourly() {
    await this.guarded(async () => {
      await this.core.sweepFollowUps();
      await this.core.syncCalendar();
    });
    this.refreshState();
  }

  async morningBrief() {
    await this.guarded(() => this.core.sendBrief());
    await this.scheduleBrief();
  }

  async nightlyLearning() {
    await this.guarded(() => this.core.runLearning());
  }

  // ── dashboard RPC (FR-18, FR-20, FR-27) ──────────────────────────────────

  async getDashboard() {
    const store = this.store;
    return {
      settings: store.getSettings(),
      needsReauth: store.get("needs_reauth") === "1",
      tasks: store.listTasks(200),
      actions: store.listActions(100),
      preferences: store.listPreferences(),
      outcomes: store.outcomeStats(),
      promotionOffers: store.getJson<string[]>("promotion_offers") ?? [],
      fyi: store.unbriefedFyi(20),
      lastSyncAt: this.state.lastSyncAt,
    };
  }

  async approve(taskId: string, response?: "accepted" | "declined" | "tentative") {
    const r = (await this.guarded(() => this.core.approveTask(taskId, { via: "dashboard", response }))) ?? { ok: false, reason: "reconnect Google" };
    this.refreshState();
    return r;
  }

  async reject(taskId: string) {
    const r = (await this.guarded(() => this.core.rejectTask(taskId))) ?? { ok: false, reason: "reconnect Google" };
    this.refreshState();
    return r;
  }

  async snooze(taskId: string, until: number) {
    const r = this.core.snoozeTask(taskId, until);
    this.refreshState();
    return r;
  }

  async complete(taskId: string) {
    const r = this.core.completeTask(taskId);
    this.refreshState();
    return r;
  }

  async undo(actionId: string) {
    return (await this.guarded(() => this.core.executor.undo(actionId))) ?? { ok: false, reason: "reconnect Google" };
  }

  async updateSettings(patch: Partial<UserSettings>) {
    const current = this.store.getSettings();
    if (!current) return { ok: false, reason: "not onboarded" };
    const next: UserSettings = {
      ...current,
      ...patch,
      email: current.email,
      workingHours: { ...current.workingHours, ...patch.workingHours },
      meetings: { ...current.meetings, ...patch.meetings },
      autonomy: { ...current.autonomy, ...patch.autonomy },
    };
    this.store.saveSettings(next);
    if (patch.timezone || patch.briefTime) await this.scheduleBrief();
    return { ok: true, settings: next };
  }

  async setPreference(key: string, value: string) {
    this.store.setPreference(key, value, "explicit");
    return { ok: true };
  }

  async deletePreference(key: string) {
    this.store.deletePreference(key);
    return { ok: true };
  }

  async sendBriefNow() {
    return (await this.guarded(() => this.core.sendBrief())) ?? { briefId: null, items: 0 };
  }

  /** PRD §9.2: full deletion on disconnect. */
  async disconnect() {
    await this.guarded(() => this.mail.stopWatch()).catch(() => undefined);
    for (const s of this.getSchedules()) await this.cancelSchedule(s.id);
    this.store.wipe();
    this._core = undefined;
    this._auth = undefined;
    this.setState({ onboarded: false, needsReauth: false, lastSyncAt: null, awaitingApproval: 0 });
    return { ok: true };
  }
}

function missingAi(): never {
  throw new Error("Workers AI binding (AI) is not configured");
}
