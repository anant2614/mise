// In-memory stand-ins for Gmail, Calendar and Workers AI.

import type { ClefAnswer, ClefAnswers, ClefQuestions, GenerateRequest, Inference } from "../../src/ai/types";
import type { CalendarApi, MailApi } from "../../src/google/types";
import { HistoryGoneError } from "../../src/google/types";
import { base64UrlDecode, parseAddressList } from "../../src/google/mime";
import type { Address, CalendarEvent, EmailMessage, Interval } from "../../src/types";

let seq = 0;
const nextId = (p: string) => `${p}${++seq}`;

export function email(partial: Omit<Partial<EmailMessage>, "from"> & { from: Address | string; body: string }): EmailMessage {
  const from = typeof partial.from === "string" ? { email: partial.from } : partial.from;
  const id = partial.id ?? nextId("m");
  return {
    id,
    threadId: partial.threadId ?? `t-${id}`,
    internalDate: partial.internalDate ?? Date.parse("2026-10-02T09:00:00Z"),
    to: partial.to ?? [{ email: "anant@example.com" }],
    cc: partial.cc ?? [],
    subject: partial.subject ?? "Hello",
    snippet: partial.snippet ?? partial.body.slice(0, 100),
    labelIds: partial.labelIds ?? ["INBOX"],
    headers: partial.headers ?? { "message-id": `<${id}@mail.example.com>` },
    ...(partial as Partial<EmailMessage>),
    from,
    body: partial.body,
  };
}

interface DraftRecord {
  threadId: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  headers: Record<string, string>;
}

export function decodeRaw(raw: string): { headers: Record<string, string>; body: string } {
  const text = base64UrlDecode(raw);
  const split = text.indexOf("\r\n\r\n");
  const head = text.slice(0, split);
  const headers: Record<string, string> = {};
  for (const line of head.split("\r\n")) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body: text.slice(split + 4) };
}

export class FakeMail implements MailApi {
  messages = new Map<string, EmailMessage>();
  labels = new Map<string, string>();
  threadLabels = new Map<string, Set<string>>();
  drafts = new Map<string, DraftRecord>();
  sent: (DraftRecord & { id: string })[] = [];
  selfSent: { raw: string; headers: Record<string, string>; body: string }[] = [];
  history: { historyId: number; messageId: string }[] = [];
  historyFloor = 0;
  watches: string[] = [];
  /** Every call, for asserting that nothing outward happened. */
  calls: { method: string; args: unknown[] }[] = [];

  constructor(public userEmail = "anant@example.com") {}

  private log(method: string, ...args: unknown[]) {
    this.calls.push({ method, args });
  }

  deliver(msg: EmailMessage): number {
    this.messages.set(msg.id, msg);
    const historyId = (this.history.at(-1)?.historyId ?? 100) + 1;
    this.history.push({ historyId, messageId: msg.id });
    return historyId;
  }

  labelsOn(threadId: string): string[] {
    const ids = this.threadLabels.get(threadId) ?? new Set();
    const byId = new Map([...this.labels].map(([n, id]) => [id, n]));
    return [...ids].map((id) => byId.get(id) ?? id);
  }

  editDraft(draftId: string, patch: Partial<DraftRecord>) {
    const d = this.drafts.get(draftId)!;
    this.drafts.set(draftId, { ...d, ...patch });
  }

  async getProfile() {
    return { emailAddress: this.userEmail, historyId: String(this.history.at(-1)?.historyId ?? 100) };
  }
  async listHistory(start: string) {
    if (Number(start) < this.historyFloor) throw new HistoryGoneError();
    const items = this.history.filter((h) => h.historyId > Number(start));
    return { messageIds: items.map((h) => h.messageId), historyId: String(this.history.at(-1)?.historyId ?? start) };
  }
  async listMessageIds(_query: string, max: number) {
    return [...this.messages.keys()].slice(-max);
  }
  async getMessage(id: string) {
    const m = this.messages.get(id);
    if (!m) throw new Error(`no message ${id}`);
    return m;
  }
  async getThread(threadId: string) {
    return [...this.messages.values()].filter((m) => m.threadId === threadId);
  }
  async ensureLabels(names: string[]) {
    this.log("ensureLabels", names);
    for (const n of names) if (!this.labels.has(n)) this.labels.set(n, `Label_${this.labels.size + 1}`);
    return Object.fromEntries(names.map((n) => [n, this.labels.get(n)!]));
  }
  async modifyThread(threadId: string, add: string[], remove: string[]) {
    this.log("modifyThread", threadId, add, remove);
    const set = this.threadLabels.get(threadId) ?? new Set<string>();
    for (const a of add) set.add(a);
    for (const r of remove) set.delete(r);
    this.threadLabels.set(threadId, set);
  }
  async createDraft(threadId: string, raw: string) {
    this.log("createDraft", threadId);
    const { headers, body } = decodeRaw(raw);
    const draftId = nextId("d");
    this.drafts.set(draftId, {
      threadId,
      to: parseAddressList(headers.to).map((a) => a.email),
      cc: parseAddressList(headers.cc).map((a) => a.email),
      subject: headers.subject ?? "",
      body,
      headers,
    });
    return { draftId, messageId: nextId("dm") };
  }
  async getDraft(draftId: string) {
    const d = this.drafts.get(draftId);
    return d ? { messageId: `msg-${draftId}`, recipients: [...d.to, ...d.cc], body: d.body } : null;
  }
  async deleteDraft(draftId: string) {
    this.log("deleteDraft", draftId);
    this.drafts.delete(draftId);
  }
  async sendDraft(draftId: string) {
    this.log("sendDraft", draftId);
    const d = this.drafts.get(draftId);
    if (!d) throw new Error("draft not found");
    this.drafts.delete(draftId);
    const id = nextId("s");
    this.sent.push({ ...d, id });
    return { messageId: id, threadId: d.threadId };
  }
  async sendToSelf(raw: string) {
    this.log("sendToSelf");
    const decoded = decodeRaw(raw);
    this.selfSent.push({ raw, ...decoded });
    return { messageId: nextId("b"), threadId: nextId("bt") };
  }
  async watch(topic: string) {
    this.watches.push(topic);
    return { historyId: String(this.history.at(-1)?.historyId ?? 100), expiration: Date.now() + 7 * 864e5 };
  }
  async stopWatch() {}
}

export class FakeCalendar implements CalendarApi {
  busy: Interval[] = [];
  events = new Map<string, CalendarEvent>();
  holds = new Map<string, { summary: string; start: number; end: number; tentative: boolean }>();
  responses: { eventId: string; response: string }[] = [];
  pending: (CalendarEvent & { cancelled?: boolean })[] = [];
  syncTokenValid = true;

  async freeBusy(min: number, max: number) {
    return [...this.busy, ...[...this.holds.values()]].filter((b) => b.start < max && b.end > min).map(({ start, end }) => ({ start, end }));
  }
  async insertEvent(e: { summary: string; start: number; end: number; tentative: boolean }) {
    const id = nextId("ev");
    this.holds.set(id, e);
    return { id, htmlLink: `https://calendar.example/${id}` };
  }
  async deleteEvent(id: string) {
    this.holds.delete(id);
  }
  async respond(eventId: string, response: "accepted" | "declined" | "tentative") {
    this.responses.push({ eventId, response });
  }
  async listEvents(syncToken: string | null) {
    if (syncToken && !this.syncTokenValid) {
      const e = new Error("sync token expired");
      e.name = "SyncTokenGoneError";
      throw e;
    }
    const events = this.pending;
    this.pending = [];
    return { events, nextSyncToken: `sync-${nextId("")}` };
  }
  async watch() {
    return { resourceId: "res", expiration: Date.now() + 864e5 };
  }
}

// ── AI fakes ───────────────────────────────────────────────────────────────

export type SimpleAnswer = number | string | { top: string; p: number } | { level: number; p?: number };

/** Builds well-formed Clef answers from terse values: noul → p, choice → option, score → level. */
export function clefAnswers(questions: ClefQuestions, simple: Record<string, SimpleAnswer | undefined>): ClefAnswers {
  const out: ClefAnswers = {};
  for (const [id, q] of Object.entries(questions)) {
    const v = simple[id];
    if (q.type === "noul") {
      out[id] = { kind: "noul", p: typeof v === "number" ? v : 0.02 };
    } else if (q.type === "choice") {
      const options = Object.keys(q.criteria);
      const top = typeof v === "string" ? v : v && typeof v === "object" && "top" in v ? v.top : options[options.length - 1];
      const p = v && typeof v === "object" && "top" in v ? v.p : 0.93;
      const dist = Object.fromEntries(options.map((o) => [o, o === top ? p : (1 - p) / (options.length - 1)]));
      out[id] = { kind: "choice", top, p, dist };
    } else {
      const level = typeof v === "number" ? v : v && typeof v === "object" && "level" in v ? v.level : 0;
      const p = v && typeof v === "object" && "p" in v && v.p !== undefined ? v.p : 0.9;
      const dist = q.criteria.map((_, i) => (i === level ? p : (1 - p) / (q.criteria.length - 1)));
      out[id] = { kind: "score", value: dist.reduce((s, x, i) => s + x * i, 0), dist } as ClefAnswer;
    }
  }
  return out;
}

export interface AiCall {
  kind: "decide" | "generate";
  model: string;
  input: unknown;
}

export class FakeAI implements Inference {
  calls: AiCall[] = [];
  constructor(
    private onDecide: (model: string, state: any, questions: ClefQuestions) => Record<string, SimpleAnswer | undefined>,
    private onGenerate: (model: string, req: GenerateRequest, purpose: string) => string,
  ) {}

  async decide(model: string, state: unknown, questions: ClefQuestions) {
    this.calls.push({ kind: "decide", model, input: { state, questions: Object.keys(questions) } });
    return clefAnswers(questions, this.onDecide(model, state, questions));
  }

  async generate(model: string, req: GenerateRequest) {
    this.calls.push({ kind: "generate", model, input: req });
    return this.onGenerate(model, req, purposeOf(model, req));
  }

  count(kind: "decide" | "generate", model?: string) {
    return this.calls.filter((c) => c.kind === kind && (!model || c.model === model)).length;
  }
}

export function purposeOf(model: string, req: GenerateRequest): string {
  if (model.includes("llama-guard")) return "safety";
  const sys = req.messages[0]?.content ?? "";
  if (sys.includes("extract pending work")) return "extract";
  if (sys.includes("write email drafts")) return "draft";
  if (sys.includes("style rules")) return "style";
  if (sys.includes("morning email brief")) return "brief";
  return "other";
}

const lower = (s: unknown) => String(s ?? "").toLowerCase();

/**
 * A deterministic keyword "model" standing in for Clef and the LLMs. It is not meant to be
 * smart; it lets tests drive every branch of the pipeline with realistic-looking emails.
 */
export function heuristicAI(opts: { userFirstName?: string } = {}): FakeAI {
  return new FakeAI(
    (_model, state, questions) => {
      const keys = Object.keys(questions);
      if (keys.includes("bucket")) {
        const text = lower(`${state.subject}\n${state.body}`);
        const injection = /(ai assistant|ignore (all )?previous|assistant:|system prompt)/.test(text);
        const sensitive = /(forward all|wire transfer|bank details|gift card|password|verify your account)/.test(text);
        const phishing = /(verify your account|suspended|gift card)/.test(text) ? 3 : 0;
        const meeting = /(meet|call|catch up|find a time|schedule)/.test(text);
        const question = /\?|can you|could you|please/.test(text);
        const fyi = /(fyi|heads up|no action needed)/.test(text);
        const waiting = /(i'll get back|will send|working on it)/.test(text);
        const bucket = fyi ? "fyi" : waiting ? "waiting_on_others" : question || meeting ? "action_for_user" : "fyi";
        return {
          bucket,
          task_type: meeting ? "schedule_meeting" : question ? "reply" : "none",
          needs_reply: question ? 0.9 : 0.1,
          urgency: /urgent|asap/.test(text) ? 3 : 1,
          is_automated_sender: 0.05,
          addresses_ai_assistant: injection ? 0.96 : 0.02,
          requests_sensitive_action: sensitive ? 0.93 : 0.03,
          phishing_likelihood: phishing,
          sender_importance: 1,
          tone: "neutral",
        };
      }
      if (keys.includes("user_commitment")) {
        const body = lower(state.body);
        return { user_commitment: /\bi'll\b|\bi will\b/.test(body) ? 0.9 : 0.05, expects_reply: body.includes("?") ? 0.85 : 0.1 };
      }
      if (keys.includes("answers_request")) return { answers_request: 0.9 };
      if (keys.includes("answers_all_asks")) return { answers_all_asks: 0.9, tone_matches: 0.8 };
      return {};
    },
    (_model, req, purpose) => {
      const user = req.messages.at(-1)?.content ?? "";
      if (purpose === "safety") return "safe";
      if (purpose === "brief") return "Good morning! You have a few drafts ready to go.";
      if (purpose === "style") return JSON.stringify({ notes: ["Keep replies to two or three sentences", "Sign off with 'Cheers'"] });
      if (purpose === "extract") {
        const text = lower(user.slice(user.indexOf("<email_body>")));
        const from = user.match(/From: .*?<([^>]+)>/)?.[1] ?? null;
        const sent = user.includes("SENT BY the mailbox owner");
        const to = user.match(/To: ([^\n,]+)/)?.[1]?.trim() ?? null;
        const tasks = [];
        if (sent) {
          if (/\bi'll\b|\bi will\b/.test(text)) tasks.push({ type: "commitment", ask: "Send what you promised", counterparty: to, due_date: "2026-10-09", owner: "user", confidence: 0.9 });
          if (text.includes("?")) tasks.push({ type: "follow_up", ask: "Waiting on an answer", counterparty: to, due_date: null, owner: "them", confidence: 0.85 });
        } else if (/(meet|call|catch up|find a time|schedule)/.test(text)) {
          tasks.push({ type: "schedule_meeting", ask: "Find a time to meet", counterparty: from, due_date: null, owner: "user", confidence: 0.9, meeting_duration_minutes: 30 });
        } else if (/\?|can you|could you|please/.test(text)) {
          tasks.push({ type: "reply_needed", ask: "Answer their question", counterparty: from, due_date: null, owner: "user", confidence: 0.9 });
        }
        return JSON.stringify({ tasks });
      }
      if (purpose === "draft") {
        const slots = [...user.matchAll(/^- (.+)$/gm)].map((m) => m[1]).filter((l) => /\d/.test(l));
        const name = opts.userFirstName ?? "Anant";
        const body = slots.length
          ? `Hi,\n\nHappy to meet. Any of these work for me:\n${slots.map((s) => `- ${s}`).join("\n")}\n\nBest,\n${name}`
          : user.includes("follow-up nudge")
            ? `Hi,\n\nJust bumping this up — any update?\n\nBest,\n${name}`
            : `Hi,\n\nThanks for the note — yes, that works for me.\n\nBest,\n${name}`;
        return JSON.stringify({ body, rationale: slots.length ? "Proposed free slots" : "Short reply answering the question" });
      }
      return "";
    },
  );
}
