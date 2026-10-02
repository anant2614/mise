// The agent's brain, free of any Cloudflare or Google specifics: it takes normalized messages and
// calendar events, decides (Clef), extracts and drafts (LLMs), and acts only through the
// Executor. The Durable Object in src/agent.ts wires it to real services; tests wire it to fakes.

import { LABELS, MODELS, THRESHOLDS, type LabelKey } from "../config";
import { noul, type Inference } from "../ai/types";
import type { CalendarApi, MailApi } from "../google/types";
import { buildRawMessage, replySubject, type OutgoingMessage } from "../google/mime";
import type { EmailMessage, Task, UserSettings } from "../types";
import { composeBrief, isAuthenticBriefReply, parseBriefCommands, type BriefContent } from "./brief";
import { contentSafe, gateDraft, writeDraft, type DraftKind } from "./draft";
import { Executor } from "./executor";
import { extractTasks } from "./extract";
import { classifyEdit, learnStyleFromEdits, sentenceDiff } from "./learning";
import { shouldOfferPromotion } from "./policy";
import { applyRules } from "./rules";
import { formatSlot, hasConflict, proposeSlots } from "./slots";
import type { Store } from "./store";
import { addBusinessDays, localTimeOnDay, resolveRelativeDay } from "./time";
import { buildTriageState, triage, type TriageResult } from "./triage";

export interface CoreDeps {
  store: Store;
  mail: MailApi;
  calendar: CalendarApi;
  ai: Inference;
  /** Public base URL of the deployment, used for links in the brief. */
  baseUrl?: string;
}

export type ProcessOutcome =
  | { status: "duplicate" | "skipped"; reason: string }
  | { status: "brief_reply"; results: string[] }
  | { status: "sent"; tasks: string[] }
  | { status: "triaged"; bucket: string; reason: string; tasks: string[] };

const SUSPICIOUS_PREFIX = "Suspicious";

export class InboxCore {
  readonly executor: Executor;
  private labelCache: Record<LabelKey, string> | null = null;

  constructor(private d: CoreDeps) {
    this.executor = new Executor({
      store: d.store,
      mail: d.mail,
      calendar: d.calendar,
      get userEmail() {
        return d.store.getSettings()?.email ?? "";
      },
      labelIds: () => this.labelIds(),
    });
  }

  private get store() {
    return this.d.store;
  }

  settings(): UserSettings {
    const s = this.store.getSettings();
    if (!s) throw new Error("user is not onboarded");
    return s;
  }

  private userName(): string {
    return this.store.get("user_name") ?? this.settings().email.split("@")[0];
  }

  async labelIds(): Promise<Record<LabelKey, string>> {
    if (this.labelCache) return this.labelCache;
    const stored = this.store.getJson<Record<LabelKey, string>>("label_ids");
    if (stored && Object.keys(LABELS).every((k) => stored[k as LabelKey])) return (this.labelCache = stored);
    const byName = await this.d.mail.ensureLabels(Object.values(LABELS));
    const ids = Object.fromEntries(Object.entries(LABELS).map(([k, name]) => [k, byName[name]])) as Record<LabelKey, string>;
    this.store.setJson("label_ids", ids);
    return (this.labelCache = ids);
  }

  /** Puts exactly one Mise state label on a thread (Needs you → Draft ready → Handled …). */
  private async setLabel(threadId: string, label: LabelKey, taskId: string | null, rationale: string) {
    const ids = await this.labelIds();
    const res = await this.executor.run("apply_label", { threadId, label }, { taskId, rationale });
    const others = Object.entries(ids).filter(([k]) => k !== label && k !== "suspicious").map(([, id]) => id);
    if (res.ok && others.length) await this.d.mail.modifyThread(threadId, [], others).catch(() => undefined);
    return res;
  }

  // ── ingestion ────────────────────────────────────────────────────────────

  async processMessage(msg: EmailMessage, opts: { delegated?: boolean } = {}): Promise<ProcessOutcome> {
    const store = this.store;
    if (store.hasMessage(msg.id)) return { status: "duplicate", reason: "already processed" };
    const settings = this.settings();

    if (isAuthenticBriefReply(msg, settings.email, (id) => !!store.findBriefByRfcId(id))) {
      store.saveMessage(msg, true);
      const results = await this.handleBriefReply(msg);
      store.markProcessed(msg.id, "brief_reply", results.join("; "));
      return { status: "brief_reply", results };
    }
    if (msg.headers["x-mise-brief-id"]) {
      store.markProcessed(msg.id, "skip", "agent's own brief");
      return { status: "skipped", reason: "agent's own brief" };
    }

    const rule = opts.delegated ? ({ action: "triage", reason: "delegated by the user", vip: true } as const) : applyRules(msg, settings.email, settings.vips);
    if (rule.action === "skip") {
      return { status: "skipped", reason: rule.reason };
    }
    store.saveMessage(msg, rule.action === "sent");

    if (rule.action === "sent") {
      const tasks = await this.handleSent(msg);
      store.markProcessed(msg.id, "sent", "sent by the user");
      return { status: "sent", tasks };
    }

    await this.resolveFollowUps(msg);

    if (rule.action === "bucket") {
      if (rule.newsletter && settings.autoArchiveNewsletters) {
        await this.executor.run("archive_thread", { threadId: msg.threadId }, { taskId: null, rationale: `Auto-archived: ${rule.reason}` });
      }
      if (rule.bucket === "fyi") store.addFyi(msg.id, msg.threadId, this.fyiSummary(msg), rule.reason);
      store.markProcessed(msg.id, rule.bucket, `rules: ${rule.reason}`);
      return { status: "triaged", bucket: rule.bucket, reason: `rules: ${rule.reason}`, tasks: [] };
    }

    const history = store.senderHistory(msg.from.email);
    const state = buildTriageState(msg, {
      threadPosition: store.threadPosition(msg.threadId, msg.internalDate),
      senderMessages: history.messagesFromSender,
      userRepliedBefore: history.userRepliedBefore,
      vip: rule.vip,
    });
    const t = await triage(this.d.ai, state);
    store.setThreadTriage(msg.threadId, t.bucket, t.confidence, t.reason);
    const tasks = await this.routeTriaged(msg, t, !!opts.delegated);
    store.markProcessed(msg.id, t.bucket, t.reason);
    return { status: "triaged", bucket: t.bucket, reason: t.reason, tasks };
  }

  private fyiSummary(msg: EmailMessage): string {
    return `${msg.from.name ?? msg.from.email}: ${msg.subject || msg.snippet.slice(0, 80)}`;
  }

  private async routeTriaged(msg: EmailMessage, t: TriageResult, delegated: boolean): Promise<string[]> {
    const store = this.store;
    if (t.bucket === "suspicious") {
      await this.setLabel(msg.threadId, "suspicious", null, t.reason);
      store.addFyi(msg.id, msg.threadId, this.fyiSummary(msg), t.reason);
      return [];
    }
    if (t.bucket === "ignore") return [];
    if (t.bucket === "waiting_on_others") {
      await this.setLabel(msg.threadId, "waiting", null, t.reason);
      return [];
    }
    const actionable = t.bucket === "action_for_user" && (t.extract || delegated);
    if (!actionable) {
      store.addFyi(msg.id, msg.threadId, this.fyiSummary(msg), t.reason);
      return [];
    }

    const settings = this.settings();
    const extraction = await extractTasks(this.d.ai, msg, { userEmail: settings.email, now: store.now(), timezone: settings.timezone });
    for (const low of extraction.lowConfidence) {
      store.addFyi(msg.id, msg.threadId, `${low.ask} (${msg.from.email})`, `Low-confidence ${low.type} (p=${low.confidence.toFixed(2)})`);
    }
    if (extraction.failed || !extraction.tasks.length) {
      store.addFyi(msg.id, msg.threadId, this.fyiSummary(msg), extraction.failed ? "Extraction failed validation; listed as FYI" : "No concrete task found");
      return [];
    }

    const ids: string[] = [];
    let labeled = false;
    for (const x of extraction.tasks) {
      // Waiting-on tasks only come from the user's own sent mail.
      if (x.owner === "them" && x.type !== "follow_up") continue;
      const { task } = store.upsertTask({
        type: x.type,
        threadId: msg.threadId,
        messageId: msg.id,
        counterparty: x.counterparty,
        ask: x.ask,
        dueAt: x.dueAt,
        owner: x.owner,
        confidence: Math.min(x.confidence, t.confidence),
        rationale: `${t.reason} Extracted by ${extraction.model}.`,
      });
      ids.push(task.id);
      const planned = await this.planTask(task, msg, { meetingMinutes: x.meetingDurationMinutes });
      labeled ||= planned === "draft";
    }
    if (!labeled) await this.setLabel(msg.threadId, "needsYou", ids[0] ?? null, t.reason);
    return ids;
  }

  // ── planning & drafting ──────────────────────────────────────────────────

  /** Returns "draft" when a draft was prepared and the thread now carries "Draft ready". */
  async planTask(task: Task, msg: EmailMessage, opts: { meetingMinutes?: number } = {}): Promise<"draft" | "task"> {
    if (task.owner !== "user") return "task";
    if (task.type === "reply_needed") return this.prepareDraft(task, msg, "reply");
    if (task.type === "schedule_meeting") return this.prepareSchedule(task, msg, opts.meetingMinutes);
    return "task";
  }

  private styleNotes(): string[] {
    return this.store.listPreferences().filter((p) => p.key.startsWith("style.")).map((p) => p.value);
  }

  private replyEnvelope(msg: EmailMessage, kind: DraftKind): OutgoingMessage {
    const settings = this.settings();
    const self = settings.email.toLowerCase();
    // Recipients come only from the thread: the sender for replies, the original recipients for nudges.
    const to = kind === "nudge" ? msg.to.filter((a) => a.email.toLowerCase() !== self) : [msg.replyTo ?? msg.from];
    const rfc = msg.headers["message-id"];
    const refs = this.store.threadRfcIds(msg.threadId);
    return {
      from: { email: settings.email, name: this.store.get("user_name") ?? undefined },
      to,
      subject: replySubject(msg.subject),
      body: "",
      inReplyTo: rfc,
      references: refs.length ? refs.join(" ") : rfc,
    };
  }

  private async draftAndGate(task: Task, msg: EmailMessage, kind: DraftKind, slots?: string[]) {
    const settings = this.settings();
    const styleExamples = this.store.styleExamples(task.counterparty);
    const allowedEmails = [settings.email, ...this.store.threadParticipants(msg.threadId)];
    let lastReasons: string[] = [];
    // Default model first; one escalation if the gate rejects the draft.
    for (const models of [MODELS.drafting, MODELS.drafting.slice(1)]) {
      if (!models.length) break;
      const draft = await writeDraft(
        this.d.ai,
        { kind, userName: this.userName(), userEmail: settings.email, message: msg, ask: task.ask, styleExamples, slots, styleNotes: this.styleNotes() },
        models,
      );
      if (!draft) {
        lastReasons = ["drafting model output failed validation"];
        continue;
      }
      const gate = await gateDraft(this.d.ai, draft.body, msg, { kind, allowedEmails, styleExamples });
      if (gate.pass && (await contentSafe(this.d.ai, draft.body))) return { draft, reasons: [] as string[] };
      lastReasons = gate.pass ? ["failed content-safety check"] : gate.reasons;
    }
    return { draft: null, reasons: lastReasons };
  }

  private async saveDraft(task: Task, msg: EmailMessage, kind: DraftKind, body: string, rationale: string, extraArgs: Record<string, unknown> = {}) {
    const envelope = { ...this.replyEnvelope(msg, kind), body };
    const res = await this.executor.run("create_draft", { threadId: msg.threadId, message: envelope }, { taskId: task.id, rationale });
    if (!res.ok) return false;
    const draftId = String(res.result.draftId);
    this.store.updateTask(task.id, {
      status: "awaiting_approval",
      rationale,
      proposedAction: {
        tool: "send_draft",
        args: { draftId, threadId: msg.threadId, body, recipients: envelope.to.map((a) => a.email), kind, ...extraArgs },
      },
    });
    await this.setLabel(msg.threadId, "draftReady", task.id, rationale);
    await this.maybeAutoApprove(task.id);
    return true;
  }

  private async prepareDraft(task: Task, msg: EmailMessage, kind: DraftKind): Promise<"draft" | "task"> {
    const { draft, reasons } = await this.draftAndGate(task, msg, kind);
    if (!draft) {
      this.store.updateTask(task.id, { rationale: `Draft held back: ${reasons.join("; ")}. Needs you.` });
      return "task";
    }
    const ok = await this.saveDraft(task, msg, kind, draft.body, draft.rationale);
    return ok ? "draft" : "task";
  }

  private async prepareSchedule(task: Task, msg: EmailMessage, minutes?: number): Promise<"draft" | "task"> {
    const settings = this.settings();
    const now = this.store.now();
    const horizonEnd = localTimeOnDay(now, settings.timezone, "23:59", 14);
    const busy = await this.d.calendar.freeBusy(now, horizonEnd);
    const slots = proposeSlots({ now, busy, settings, durationMinutes: minutes, count: 3, horizonDays: 14 });
    if (!slots.length) {
      this.store.updateTask(task.id, { rationale: "No free slots in the next two weeks; needs you." });
      return "task";
    }
    const slotText = slots.map((s) => formatSlot(s, settings.timezone));
    const { draft, reasons } = await this.draftAndGate(task, msg, "schedule", slotText);
    if (!draft) {
      this.store.updateTask(task.id, { rationale: `Draft held back: ${reasons.join("; ")}. Needs you.` });
      return "task";
    }
    const holdEventIds: string[] = [];
    if (settings.meetings.createHolds && !this.store.isThreadSuspicious(msg.threadId)) {
      for (const s of slots) {
        const res = await this.executor.run(
          "create_event",
          { summary: `Hold: ${msg.subject}`.slice(0, 120), description: `Tentative hold proposed by Mise for ${task.counterparty ?? "a meeting"}.`, start: s.start, end: s.end },
          { taskId: task.id, rationale: `Tentative hold for a proposed slot (${formatSlot(s, settings.timezone)})` },
        );
        if (res.ok) holdEventIds.push(String(res.result.eventId));
      }
    }
    const rationale = `${draft.rationale} Proposed ${slots.length} slots from your free/busy${holdEventIds.length ? ` with ${holdEventIds.length} tentative holds` : ""}.`;
    const ok = await this.saveDraft(task, msg, "schedule", draft.body, rationale, { holdEventIds, slots });
    return ok ? "draft" : "task";
  }

  /** Graduated autonomy: if the user has promoted this action type, act without asking. */
  private async maybeAutoApprove(taskId: string) {
    const task = this.store.getTask(taskId);
    if (!task?.proposedAction) return;
    const key = `${task.proposedAction.tool}:${task.type}`;
    if (!this.settings().autonomy[key]) return;
    await this.approveTask(taskId, { via: "auto" });
  }

  // ── sent mail: commitments, waiting-on, closing loops, learning ─────────

  private async handleSent(msg: EmailMessage): Promise<string[]> {
    const store = this.store;
    const settings = this.settings();
    // FR-11: the user replied, so tasks asking them to reply on this thread are resolved.
    for (const t of store.openTasks({ threadId: msg.threadId, owner: "user" })) {
      if (!["reply_needed", "schedule_meeting", "follow_up"].includes(t.type)) continue;
      const pa = t.proposedAction;
      if (pa?.tool === "send_draft") this.recordDraftOutcome(t, String(pa.args.body ?? ""), msg.body, null);
      store.updateTask(t.id, { status: "done", rationale: `${t.rationale ?? ""} Closed: you replied.`.trim() });
    }
    // Nudge drafts the user sent themselves.
    for (const t of store.openTasks({ threadId: msg.threadId, owner: "them" })) {
      if (t.proposedAction?.tool === "send_draft") {
        this.recordDraftOutcome(t, String(t.proposedAction.args.body ?? ""), msg.body, null);
        store.updateTask(t.id, { proposedAction: null, status: "detected", dueAt: addBusinessDays(store.now(), settings.followUpBusinessDays, settings.timezone) });
      }
    }

    const answers = await this.d.ai.decide(
      MODELS.quickDecision[0],
      { from: "mailbox owner", to: msg.to.map((a) => a.email), subject: msg.subject, body: msg.body },
      {
        user_commitment: { type: "noul", instructions: "Did the sender promise to do or send something (e.g. 'I'll send it by Friday')?" },
        expects_reply: { type: "noul", instructions: "Did the sender ask a question or request something they are now waiting on?" },
      },
    );
    const commits = noul(answers, "user_commitment") >= THRESHOLDS.commitment;
    const waits = noul(answers, "expects_reply") >= THRESHOLDS.expectsReply;
    if (!commits && !waits) return [];

    const ext = await extractTasks(this.d.ai, msg, { userEmail: settings.email, now: store.now(), timezone: settings.timezone, sentByUser: true });
    const ids: string[] = [];
    for (const x of ext.tasks) {
      if (x.type === "commitment" && commits) {
        ids.push(store.upsertTask({ ...x, owner: "user", threadId: msg.threadId, messageId: msg.id, rationale: "You made this commitment in a sent email." }).task.id);
      } else if (x.type === "follow_up" && waits) {
        const dueAt = x.dueAt ?? addBusinessDays(store.now(), settings.followUpBusinessDays, settings.timezone);
        ids.push(
          store.upsertTask({ ...x, dueAt, owner: "them", threadId: msg.threadId, messageId: msg.id, rationale: `Waiting on a reply; nudge drafted if nothing by the due date.` }).task.id,
        );
        await this.setLabel(msg.threadId, "waiting", ids[ids.length - 1], "You're waiting on a reply");
      }
    }
    return ids;
  }

  /** Follow-up resolution (clef-flash): does this inbound message answer what the user was waiting on? */
  private async resolveFollowUps(msg: EmailMessage) {
    const waiting = this.store.openTasks({ threadId: msg.threadId, owner: "them" });
    for (const t of waiting) {
      const answers = await this.d.ai.decide(
        MODELS.quickDecision[0],
        { waiting_for: t.ask, reply: { from: msg.from.email, body: msg.body } },
        { answers_request: { type: "noul", instructions: "Does the reply deliver or substantively answer what the owner was waiting for?" } },
      );
      if (noul(answers, "answers_request") < THRESHOLDS.followUpResolved) continue;
      if (t.proposedAction?.tool === "send_draft") {
        await this.executor.run("delete_draft", { draftId: t.proposedAction.args.draftId }, { taskId: t.id, rationale: "They replied; nudge no longer needed." });
      }
      this.store.updateTask(t.id, { status: "done", proposedAction: null, rationale: `${t.rationale ?? ""} Closed: ${msg.from.email} replied.`.trim() });
      const ids = await this.labelIds();
      await this.d.mail.modifyThread(msg.threadId, [], [ids.waiting]).catch(() => undefined);
    }
  }

  /** FR-14: draft nudges for waiting-on tasks that are past due. */
  async sweepFollowUps(): Promise<string[]> {
    const store = this.store;
    store.unsnoozeDue();
    const nudged: string[] = [];
    for (const t of store.openTasks({ type: "follow_up", owner: "them" })) {
      if (t.status !== "detected" || t.proposedAction || !t.dueAt || t.dueAt > store.now() || !t.messageId) continue;
      const original = store.getStoredMessage(t.messageId);
      if (!original) continue;
      const { draft, reasons } = await this.draftAndGate(t, original, "nudge");
      if (!draft) {
        store.updateTask(t.id, { rationale: `Nudge held back: ${reasons.join("; ")}` });
        continue;
      }
      if (await this.saveDraft(t, original, "nudge", draft.body, `No reply since ${new Date(original.internalDate).toDateString()}. ${draft.rationale}`)) {
        nudged.push(t.id);
      }
    }
    return nudged;
  }

  private recordDraftOutcome(task: Task, draftBody: string, finalBody: string, actionId: string | null) {
    const { signal, distance } = classifyEdit(draftBody, finalBody);
    const actionType = `send_draft:${task.type}`;
    this.store.recordOutcome({
      actionId,
      taskId: task.id,
      actionType,
      signal,
      diff: signal === "edited" ? sentenceDiff(draftBody, finalBody) : null,
      editDistance: distance,
    });
    if (signal === "edited") this.store.set("learning_pending", "1");
    this.updatePromotionOffers(actionType);
  }

  private updatePromotionOffers(actionType: string) {
    const offers = new Set(this.store.getJson<string[]>("promotion_offers") ?? []);
    const enabled = this.settings().autonomy[actionType];
    if (!enabled && shouldOfferPromotion(this.store.outcomeSignals(actionType), THRESHOLDS.promoteAfter)) offers.add(actionType);
    else offers.delete(actionType);
    this.store.setJson("promotion_offers", [...offers]);
  }

  /** Nightly (or right after an edit): turn recent edits into style notes (FR-24/26). */
  async runLearning(limit = 10): Promise<string[]> {
    if (this.store.get("learning_pending") !== "1") return [];
    const notes = await learnStyleFromEdits(this.d.ai, this.store, this.store.recentEditDiffs(limit));
    this.store.set("learning_pending", "0");
    return notes;
  }

  // ── approvals (FR-17/18) ─────────────────────────────────────────────────

  async approveTask(taskId: string, opts: { via: "dashboard" | "brief" | "push" | "auto"; response?: "accepted" | "declined" | "tentative" }): Promise<{ ok: boolean; reason?: string }> {
    const store = this.store;
    const task = store.getTask(taskId);
    if (!task) return { ok: false, reason: "no such task" };
    if (!task.proposedAction) return { ok: false, reason: "nothing to approve on this task" };
    const pa = task.proposedAction;
    const suspicious = task.threadId ? store.isThreadSuspicious(task.threadId) : false;
    const byUser = opts.via !== "auto";
    const args = pa.tool === "respond_to_invite" && opts.response ? { ...pa.args, response: opts.response } : pa.args;

    let finalBody: string | null = null;
    if (pa.tool === "send_draft") finalBody = (await this.d.mail.getDraft(String(args.draftId)))?.body ?? null;

    const res = await this.executor.run(pa.tool, args, {
      taskId,
      rationale: `${byUser ? `Approved via ${opts.via}` : "Automatic (you enabled autonomy for this action type)"}: ${task.rationale ?? task.ask}`,
      approvedByUser: byUser,
      autonomyKey: `${pa.tool}:${task.type}`,
      sourceSuspicious: suspicious,
    });
    if (!res.ok) {
      if (res.needsApproval && !byUser) return { ok: false, reason: res.reason };
      store.updateTask(taskId, { rationale: `${task.rationale ?? ""} Not sent: ${res.reason}`.trim() });
      return { ok: false, reason: res.reason };
    }
    if (pa.tool === "send_draft") {
      this.recordDraftOutcome(task, String(pa.args.body ?? ""), finalBody ?? String(pa.args.body ?? ""), res.action.id);
      if (task.owner === "them") {
        // A nudge went out: keep waiting, with a fresh due date.
        const s = this.settings();
        store.updateTask(taskId, { status: "detected", proposedAction: null, dueAt: addBusinessDays(store.now(), s.followUpBusinessDays, s.timezone) });
        return { ok: true };
      }
      if (task.threadId) await this.setLabel(task.threadId, "handled", taskId, "Reply sent");
    } else {
      store.recordOutcome({ actionId: res.action.id, taskId, actionType: `${pa.tool}:${task.type}`, signal: opts.response && opts.response !== pa.args.response ? "edited" : "approved" });
      this.updatePromotionOffers(`${pa.tool}:${task.type}`);
    }
    store.updateTask(taskId, { status: "done" });
    return { ok: true };
  }

  async rejectTask(taskId: string, reason = "dismissed"): Promise<{ ok: boolean; reason?: string }> {
    const store = this.store;
    const task = store.getTask(taskId);
    if (!task) return { ok: false, reason: "no such task" };
    const pa = task.proposedAction;
    if (pa?.tool === "send_draft") {
      await this.executor.run("delete_draft", { draftId: pa.args.draftId }, { taskId, rationale: `Draft rejected (${reason})`, approvedByUser: true });
      for (const eventId of (pa.args.holdEventIds as string[] | undefined) ?? []) {
        await this.executor.run("delete_event", { eventId }, { taskId, rationale: "Tentative hold released (draft rejected)", approvedByUser: true });
      }
    }
    if (pa) {
      store.recordOutcome({ actionId: null, taskId, actionType: `${pa.tool}:${task.type}`, signal: "rejected" });
      this.updatePromotionOffers(`${pa.tool}:${task.type}`);
    }
    store.updateTask(taskId, { status: "dismissed", proposedAction: null });
    if (task.threadId && !task.threadId.startsWith("event:")) {
      const ids = await this.labelIds();
      await this.d.mail.modifyThread(task.threadId, [], [ids.draftReady, ids.needsYou]).catch(() => undefined);
    }
    return { ok: true };
  }

  snoozeTask(taskId: string, until: number): { ok: boolean; reason?: string } {
    const task = this.store.getTask(taskId);
    if (!task) return { ok: false, reason: "no such task" };
    this.store.updateTask(taskId, { status: "snoozed", snoozedUntil: until });
    this.store.recordAction({
      taskId, tool: "snooze_task", args: { until }, tier: "reversible", approvedBy: "user", status: "executed",
      rationale: `Snoozed until ${new Date(until).toISOString()}`, result: null, executedAt: this.store.now(),
    });
    return { ok: true };
  }

  completeTask(taskId: string): { ok: boolean; reason?: string } {
    const task = this.store.getTask(taskId);
    if (!task) return { ok: false, reason: "no such task" };
    this.store.updateTask(taskId, { status: "done" });
    return { ok: true };
  }

  // ── reply-to-brief (FR-18/19) ────────────────────────────────────────────

  private async handleBriefReply(msg: EmailMessage): Promise<string[]> {
    const refs = `${msg.headers["in-reply-to"] ?? ""} ${msg.headers["references"] ?? ""}`.match(/<[^>]+>/g) ?? [];
    const brief = refs.map((r) => this.store.findBriefByRfcId(r)).find(Boolean);
    if (!brief) return ["no matching brief"];
    const settings = this.settings();
    const results: string[] = [];
    for (const cmd of parseBriefCommands(msg.body)) {
      const item = brief.items.find((i) => i.n === cmd.n);
      if (!item) {
        results.push(`${cmd.verb} ${cmd.n}: no such item`);
        continue;
      }
      const task = this.store.getTask(item.taskId);
      let r: { ok: boolean; reason?: string };
      switch (cmd.verb) {
        case "approve":
          r = await this.approveTask(item.taskId, { via: "brief" });
          break;
        case "accept":
        case "decline":
          r =
            task?.proposedAction?.tool === "respond_to_invite"
              ? await this.approveTask(item.taskId, { via: "brief", response: cmd.verb === "accept" ? "accepted" : "declined" })
              : cmd.verb === "accept"
                ? await this.approveTask(item.taskId, { via: "brief" })
                : await this.rejectTask(item.taskId, "declined from brief");
          break;
        case "snooze": {
          const until = resolveRelativeDay(cmd.until ?? "tomorrow", this.store.now(), settings.timezone, settings.briefTime);
          r = until ? this.snoozeTask(item.taskId, until) : { ok: false, reason: `don't understand "${cmd.until}"` };
          break;
        }
        case "dismiss":
          r = await this.rejectTask(item.taskId, "dismissed from brief");
          break;
        case "done":
          r = this.completeTask(item.taskId);
          break;
      }
      results.push(`${cmd.verb} ${cmd.n}: ${r.ok ? "ok" : r.reason}`);
    }
    return results.length ? results : ["no commands found"];
  }

  // ── calendar (FR-3, FR-15) ───────────────────────────────────────────────

  async syncCalendar(): Promise<{ events: number; rsvps: string[] }> {
    const store = this.store;
    let token = store.get("calendar_sync_token");
    let page;
    try {
      page = await this.d.calendar.listEvents(token, token ? undefined : store.now() - 24 * 3600 * 1000);
    } catch (e) {
      if ((e as Error).name !== "SyncTokenGoneError" && !(e as Error).message.includes("sync token")) throw e;
      token = null;
      page = await this.d.calendar.listEvents(null, store.now() - 24 * 3600 * 1000);
    }
    if (page.nextSyncToken) store.set("calendar_sync_token", page.nextSyncToken);
    const rsvps: string[] = [];
    for (const e of page.events) {
      if (e.cancelled || e.status === "cancelled") {
        store.deleteEvent(e.id);
        for (const t of store.openTasks({ threadId: `event:${e.id}` })) store.updateTask(t.id, { status: "expired", proposedAction: null });
        continue;
      }
      store.upsertEvent(e);
      if (e.selfResponse === "needsAction" && e.start > store.now()) {
        const id = await this.planRsvp(e);
        if (id) rsvps.push(id);
      }
    }
    return { events: page.events.length, rsvps };
  }

  private async planRsvp(e: { id: string; summary: string; start: number; end: number; organizer?: string }): Promise<string | null> {
    const store = this.store;
    const settings = this.settings();
    const { task, created } = store.upsertTask({
      type: "rsvp",
      threadId: `event:${e.id}`,
      messageId: null,
      counterparty: e.organizer ?? null,
      ask: `Respond to "${e.summary}"`,
      dueAt: e.start,
      owner: "user",
      confidence: 1,
    });
    if (!created && task.proposedAction) return task.id;
    const busy = (await this.d.calendar.freeBusy(e.start, e.end)).filter((b) => !(b.start === e.start && b.end === e.end));
    const conflict = hasConflict({ start: e.start, end: e.end }, busy);
    const wh = settings.workingHours;
    const outsideHours =
      e.start < localTimeOnDay(e.start, settings.timezone, wh.start) || e.end > localTimeOnDay(e.start, settings.timezone, wh.end);
    const response = conflict ? "declined" : "accepted";
    const rationale = conflict
      ? "Conflicts with something already on your calendar; proposing decline."
      : outsideHours
        ? "Free, but outside your working hours; proposing accept — check before approving."
        : "You're free and it's within working hours; proposing accept.";
    store.updateTask(task.id, { status: "awaiting_approval", rationale, proposedAction: { tool: "respond_to_invite", args: { eventId: e.id, response } } });
    await this.maybeAutoApprove(task.id);
    return task.id;
  }

  // ── brief (FR-21) ────────────────────────────────────────────────────────

  async buildBrief(): Promise<{ content: BriefContent; fyiIds: number[] }> {
    const store = this.store;
    const settings = this.settings();
    store.unsnoozeDue();
    const now = store.now();
    const tasks = store.openTasks().filter((t) => t.status !== "snoozed");
    const fyiRows = store.unbriefedFyi(20);
    const suspicious = fyiRows.filter((f) => f.reason.startsWith(SUSPICIOUS_PREFIX));
    const fyi = fyiRows.filter((f) => !f.reason.startsWith(SUSPICIOUS_PREFIX)).slice(0, 10);
    const meetings = store.eventsBetween(localTimeOnDay(now, settings.timezone, "00:00"), localTimeOnDay(now, settings.timezone, "00:00", 1));

    let intro: string | undefined;
    if (tasks.length) {
      try {
        // The brief model sees only structured task fields, never raw email bodies.
        intro = (
          await this.d.ai.generate(MODELS.brief[0], {
            messages: [
              { role: "system", content: "Write a two-sentence, friendly opener for a morning email brief. Mention the most important item. Plain text, no lists." },
              { role: "user", content: JSON.stringify({ name: this.userName(), meetings: meetings.map((m) => m.summary), tasks: tasks.slice(0, 15).map((t) => ({ type: t.type, ask: t.ask, status: t.status, owner: t.owner, due: t.dueAt })) }) },
            ],
            maxTokens: 200,
          })
        )
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim()
          .slice(0, 500);
      } catch {
        intro = undefined;
      }
    }
    const content = composeBrief({
      now,
      timezone: settings.timezone,
      userName: this.userName(),
      tasks,
      meetings,
      fyi,
      suspicious,
      promotionOffers: store.getJson<string[]>("promotion_offers") ?? [],
      intro,
      dashboardUrl: this.d.baseUrl ? `${this.d.baseUrl}/` : undefined,
    });
    return { content, fyiIds: [...suspicious, ...fyi].map((f) => f.id) };
  }

  async sendBrief(): Promise<{ briefId: string; items: number }> {
    const settings = this.settings();
    const { content, fyiIds } = await this.buildBrief();
    const briefId = crypto.randomUUID();
    const rfcMessageId = `<brief-${briefId}@mise.agent>`;
    const raw = buildRawMessage({
      from: { email: settings.email, name: "Mise" },
      to: [{ email: settings.email }],
      subject: content.subject,
      body: content.text,
      html: content.html,
      messageId: rfcMessageId,
      extraHeaders: { "X-Mise-Brief-Id": briefId },
    });
    const sent = await this.d.mail.sendToSelf(raw);
    this.store.saveBrief({ id: briefId, rfcMessageId, gmailMessageId: sent.messageId, items: content.items.map((i) => ({ n: i.n, taskId: i.taskId })) });
    this.store.markFyiBriefed(fyiIds);
    return { briefId, items: content.items.length };
  }
}
