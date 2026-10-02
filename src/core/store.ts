// Per-user storage (PRD §8.4). Runs on Durable Object SQLite in production and node:sqlite in
// tests; both are reached through a single synchronous `SqlRunner`.

import type {
  ActionRecord,
  EmailMessage,
  ProposedAction,
  Task,
  TaskStatus,
  TaskType,
  Tier,
  ToolName,
  TriageBucket,
  UserSettings,
} from "../types";
import { DEFAULT_SETTINGS, OPEN_TASK_STATUSES } from "../types";

export type SqlValue = string | number | null;
export type SqlRunner = <T = Record<string, SqlValue>>(query: string, ...params: SqlValue[]) => T[];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY, subject TEXT, participants TEXT, last_message_at INTEGER,
    triage_bucket TEXT, triage_confidence REAL, triage_reason TEXT, summary TEXT, suspicious INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, thread_id TEXT, from_email TEXT, from_name TEXT, to_emails TEXT, cc_emails TEXT,
    subject TEXT, body TEXT, internal_date INTEGER, is_from_user INTEGER, rfc_message_id TEXT,
    processed_at INTEGER, bucket TEXT, reason TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS messages_thread ON messages(thread_id, internal_date)`,
  `CREATE INDEX IF NOT EXISTS messages_from ON messages(from_email)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, thread_id TEXT, message_id TEXT, counterparty TEXT, ask TEXT,
    due_at INTEGER, owner TEXT, status TEXT NOT NULL, confidence REAL, proposed_action TEXT, rationale TEXT,
    snoozed_until INTEGER, created_at INTEGER, updated_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_thread ON tasks(thread_id, type, owner)`,
  `CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY, task_id TEXT, tool TEXT NOT NULL, args TEXT, tier TEXT, approved_by TEXT, status TEXT,
    rationale TEXT, result TEXT, created_at INTEGER, executed_at INTEGER, undone_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY, value TEXT, source TEXT, confidence REAL, updated_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, action_id TEXT, task_id TEXT, action_type TEXT, signal TEXT,
    diff TEXT, edit_distance REAL, created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS briefs (
    id TEXT PRIMARY KEY, rfc_message_id TEXT, gmail_message_id TEXT, items TEXT, created_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS fyi (
    id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT, thread_id TEXT, summary TEXT, reason TEXT,
    created_at INTEGER, briefed INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, summary TEXT, start_at INTEGER, end_at INTEGER, status TEXT, self_response TEXT,
    organizer TEXT, attendees TEXT, html_link TEXT
  )`,
];

interface TaskRow {
  id: string;
  type: string;
  thread_id: string | null;
  message_id: string | null;
  counterparty: string | null;
  ask: string;
  due_at: number | null;
  owner: string;
  status: string;
  confidence: number;
  proposed_action: string | null;
  rationale: string | null;
  snoozed_until: number | null;
  created_at: number;
  updated_at: number;
}

interface ActionRow {
  id: string;
  task_id: string | null;
  tool: string;
  args: string;
  tier: string;
  approved_by: string | null;
  status: string;
  rationale: string | null;
  result: string | null;
  created_at: number;
  executed_at: number | null;
  undone_at: number | null;
}

const toTask = (r: TaskRow): Task => ({
  id: r.id,
  type: r.type as TaskType,
  threadId: r.thread_id,
  messageId: r.message_id,
  counterparty: r.counterparty,
  ask: r.ask,
  dueAt: r.due_at,
  owner: r.owner as "user" | "them",
  status: r.status as TaskStatus,
  confidence: r.confidence,
  proposedAction: r.proposed_action ? (JSON.parse(r.proposed_action) as ProposedAction) : null,
  rationale: r.rationale,
  snoozedUntil: r.snoozed_until,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toAction = (r: ActionRow): ActionRecord => ({
  id: r.id,
  taskId: r.task_id,
  tool: r.tool as ToolName,
  args: r.args ? JSON.parse(r.args) : {},
  tier: r.tier as Tier,
  approvedBy: (r.approved_by as ActionRecord["approvedBy"]) ?? null,
  status: r.status as ActionRecord["status"],
  rationale: r.rationale,
  result: r.result ? JSON.parse(r.result) : null,
  createdAt: r.created_at,
  executedAt: r.executed_at,
  undoneAt: r.undone_at,
});

const placeholders = (n: number) => Array.from({ length: n }, () => "?").join(", ");

export class Store {
  constructor(
    private sql: SqlRunner,
    private clock: () => number = Date.now,
    private newId: () => string = () => crypto.randomUUID(),
  ) {
    for (const stmt of SCHEMA) this.sql(stmt);
  }

  now(): number {
    return this.clock();
  }

  // ── key/value ────────────────────────────────────────────────────────────
  get(key: string): string | null {
    return this.sql<{ value: string }>(`SELECT value FROM kv WHERE key = ?`, key)[0]?.value ?? null;
  }
  set(key: string, value: string): void {
    this.sql(`INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value);
  }
  getJson<T>(key: string): T | null {
    const v = this.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }
  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }
  delete(key: string): void {
    this.sql(`DELETE FROM kv WHERE key = ?`, key);
  }

  // ── settings ─────────────────────────────────────────────────────────────
  getSettings(): UserSettings | null {
    const s = this.getJson<UserSettings>("settings");
    return s ? { ...DEFAULT_SETTINGS, ...s } : null;
  }
  saveSettings(s: UserSettings): void {
    this.setJson("settings", s);
  }

  // ── threads & messages ───────────────────────────────────────────────────
  hasMessage(id: string): boolean {
    return this.sql(`SELECT 1 FROM messages WHERE id = ? AND processed_at IS NOT NULL`, id).length > 0;
  }

  saveMessage(msg: EmailMessage, isFromUser: boolean): void {
    this.sql(
      `INSERT INTO messages (id, thread_id, from_email, from_name, to_emails, cc_emails, subject, body, internal_date, is_from_user, rfc_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
      msg.id,
      msg.threadId,
      msg.from.email.toLowerCase(),
      msg.from.name ?? null,
      JSON.stringify(msg.to.map((a) => a.email.toLowerCase())),
      JSON.stringify(msg.cc.map((a) => a.email.toLowerCase())),
      msg.subject,
      msg.body,
      msg.internalDate,
      isFromUser ? 1 : 0,
      msg.headers["message-id"] ?? null,
    );
    const participants = new Set<string>(
      [msg.from, ...msg.to, ...msg.cc].map((a) => a.email.toLowerCase()),
    );
    const existing = this.sql<{ participants: string; last_message_at: number }>(
      `SELECT participants, last_message_at FROM threads WHERE id = ?`,
      msg.threadId,
    )[0];
    if (existing) {
      for (const p of JSON.parse(existing.participants) as string[]) participants.add(p);
      this.sql(
        `UPDATE threads SET participants = ?, last_message_at = ? WHERE id = ?`,
        JSON.stringify([...participants]),
        Math.max(existing.last_message_at, msg.internalDate),
        msg.threadId,
      );
    } else {
      this.sql(
        `INSERT INTO threads (id, subject, participants, last_message_at) VALUES (?, ?, ?, ?)`,
        msg.threadId,
        msg.subject,
        JSON.stringify([...participants]),
        msg.internalDate,
      );
    }
  }

  markProcessed(messageId: string, bucket: string, reason: string): void {
    this.sql(`UPDATE messages SET processed_at = ?, bucket = ?, reason = ? WHERE id = ?`, this.now(), bucket, reason, messageId);
  }

  setThreadTriage(threadId: string, bucket: TriageBucket, confidence: number, reason: string): void {
    this.sql(
      `UPDATE threads SET triage_bucket = ?, triage_confidence = ?, triage_reason = ?, suspicious = CASE WHEN ? = 'suspicious' THEN 1 ELSE suspicious END WHERE id = ?`,
      bucket,
      confidence,
      reason,
      bucket,
      threadId,
    );
  }

  isThreadSuspicious(threadId: string): boolean {
    return this.sql<{ suspicious: number }>(`SELECT suspicious FROM threads WHERE id = ?`, threadId)[0]?.suspicious === 1;
  }

  getThread(threadId: string) {
    return (
      this.sql<{ id: string; subject: string; participants: string; triage_bucket: string | null; triage_reason: string | null; suspicious: number }>(
        `SELECT id, subject, participants, triage_bucket, triage_reason, suspicious FROM threads WHERE id = ?`,
        threadId,
      ).map((r) => ({ ...r, participants: JSON.parse(r.participants) as string[], suspicious: r.suspicious === 1 }))[0] ?? null
    );
  }

  threadParticipants(threadId: string): string[] {
    return this.getThread(threadId)?.participants ?? [];
  }

  senderHistory(email: string): { messagesFromSender: number; userRepliedBefore: boolean } {
    const e = email.toLowerCase();
    const n = this.sql<{ n: number }>(`SELECT count(*) AS n FROM messages WHERE from_email = ?`, e)[0]?.n ?? 0;
    const replied = this.sql(
      `SELECT 1 FROM messages WHERE is_from_user = 1 AND (to_emails LIKE ? OR cc_emails LIKE ?) LIMIT 1`,
      `%"${e}"%`,
      `%"${e}"%`,
    ).length > 0;
    return { messagesFromSender: Math.max(0, n - 1), userRepliedBefore: replied };
  }

  /** Is this address someone the user has corresponded with (their de-facto contacts)? */
  isKnownContact(email: string): boolean {
    const e = email.toLowerCase();
    return (
      this.sql(
        `SELECT 1 FROM messages WHERE from_email = ? OR (is_from_user = 1 AND (to_emails LIKE ? OR cc_emails LIKE ?)) LIMIT 1`,
        e,
        `%"${e}"%`,
        `%"${e}"%`,
      ).length > 0
    );
  }

  threadPosition(threadId: string, internalDate: number): number {
    return (
      this.sql<{ n: number }>(`SELECT count(*) AS n FROM messages WHERE thread_id = ? AND internal_date <= ?`, threadId, internalDate)[0]?.n ?? 1
    );
  }

  /** Style few-shots (PRD §8.5.4): the user's recent sent replies, same contact first. */
  styleExamples(counterparty: string | null, limit = 4): string[] {
    const rows: { body: string }[] = [];
    if (counterparty) {
      rows.push(
        ...this.sql<{ body: string }>(
          `SELECT body FROM messages WHERE is_from_user = 1 AND to_emails LIKE ? AND length(body) > 5 ORDER BY internal_date DESC LIMIT ?`,
          `%"${counterparty.toLowerCase()}"%`,
          limit,
        ),
      );
    }
    if (rows.length < limit) {
      rows.push(
        ...this.sql<{ body: string }>(
          `SELECT body FROM messages WHERE is_from_user = 1 AND length(body) > 5 ORDER BY internal_date DESC LIMIT ?`,
          limit * 2,
        ),
      );
    }
    return [...new Set(rows.map((r) => r.body.slice(0, 800)))].slice(0, limit);
  }

  /** Rebuilds a stored (truncated) message, e.g. to draft a nudge against the user's own email. */
  getStoredMessage(id: string): EmailMessage | null {
    const r = this.sql<{
      id: string; thread_id: string; from_email: string; from_name: string | null; to_emails: string; cc_emails: string;
      subject: string; body: string; internal_date: number; is_from_user: number; rfc_message_id: string | null;
    }>(`SELECT * FROM messages WHERE id = ?`, id)[0];
    if (!r) return null;
    return {
      id: r.id,
      threadId: r.thread_id,
      internalDate: r.internal_date,
      from: { email: r.from_email, name: r.from_name ?? undefined },
      to: (JSON.parse(r.to_emails) as string[]).map((email) => ({ email })),
      cc: (JSON.parse(r.cc_emails) as string[]).map((email) => ({ email })),
      subject: r.subject,
      snippet: r.body.slice(0, 120),
      body: r.body,
      labelIds: r.is_from_user ? ["SENT"] : [],
      headers: r.rfc_message_id ? { "message-id": r.rfc_message_id } : {},
    };
  }

  /** RFC Message-IDs in a thread, oldest first, for the References header. */
  threadRfcIds(threadId: string): string[] {
    return this.sql<{ rfc_message_id: string }>(
      `SELECT rfc_message_id FROM messages WHERE thread_id = ? AND rfc_message_id IS NOT NULL ORDER BY internal_date`,
      threadId,
    ).map((r) => r.rfc_message_id);
  }

  latestMessageInThread(threadId: string): { id: string; fromEmail: string; isFromUser: boolean; internalDate: number } | null {
    const r = this.sql<{ id: string; from_email: string; is_from_user: number; internal_date: number }>(
      `SELECT id, from_email, is_from_user, internal_date FROM messages WHERE thread_id = ? ORDER BY internal_date DESC LIMIT 1`,
      threadId,
    )[0];
    return r ? { id: r.id, fromEmail: r.from_email, isFromUser: r.is_from_user === 1, internalDate: r.internal_date } : null;
  }

  // ── tasks ────────────────────────────────────────────────────────────────
  /** FR-11: one open task per (thread, type, owner); a new detection updates the existing one. */
  upsertTask(input: {
    type: TaskType;
    threadId: string | null;
    messageId: string | null;
    counterparty: string | null;
    ask: string;
    dueAt: number | null;
    owner: "user" | "them";
    confidence: number;
    rationale?: string | null;
  }): { task: Task; created: boolean } {
    const now = this.now();
    if (input.threadId) {
      const existing = this.sql<TaskRow>(
        `SELECT * FROM tasks WHERE thread_id = ? AND type = ? AND owner = ? AND status IN (${placeholders(OPEN_TASK_STATUSES.length)}) LIMIT 1`,
        input.threadId,
        input.type,
        input.owner,
        ...OPEN_TASK_STATUSES,
      )[0];
      if (existing) {
        this.sql(
          `UPDATE tasks SET message_id = ?, ask = ?, due_at = COALESCE(?, due_at), confidence = MAX(confidence, ?), counterparty = COALESCE(?, counterparty), updated_at = ? WHERE id = ?`,
          input.messageId,
          input.ask,
          input.dueAt,
          input.confidence,
          input.counterparty,
          now,
          existing.id,
        );
        return { task: this.getTask(existing.id)!, created: false };
      }
    }
    const id = this.newId();
    this.sql(
      `INSERT INTO tasks (id, type, thread_id, message_id, counterparty, ask, due_at, owner, status, confidence, rationale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'detected', ?, ?, ?, ?)`,
      id,
      input.type,
      input.threadId,
      input.messageId,
      input.counterparty,
      input.ask,
      input.dueAt,
      input.owner,
      input.confidence,
      input.rationale ?? null,
      now,
      now,
    );
    return { task: this.getTask(id)!, created: true };
  }

  getTask(id: string): Task | null {
    const r = this.sql<TaskRow>(`SELECT * FROM tasks WHERE id = ?`, id)[0];
    return r ? toTask(r) : null;
  }

  updateTask(
    id: string,
    patch: Partial<Pick<Task, "status" | "proposedAction" | "rationale" | "snoozedUntil" | "dueAt" | "ask">>,
  ): Task | null {
    const sets: string[] = [];
    const vals: SqlValue[] = [];
    if (patch.status !== undefined) (sets.push("status = ?"), vals.push(patch.status));
    if (patch.proposedAction !== undefined)
      (sets.push("proposed_action = ?"), vals.push(patch.proposedAction ? JSON.stringify(patch.proposedAction) : null));
    if (patch.rationale !== undefined) (sets.push("rationale = ?"), vals.push(patch.rationale));
    if (patch.snoozedUntil !== undefined) (sets.push("snoozed_until = ?"), vals.push(patch.snoozedUntil));
    if (patch.dueAt !== undefined) (sets.push("due_at = ?"), vals.push(patch.dueAt));
    if (patch.ask !== undefined) (sets.push("ask = ?"), vals.push(patch.ask));
    if (!sets.length) return this.getTask(id);
    sets.push("updated_at = ?");
    vals.push(this.now());
    this.sql(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, ...vals, id);
    return this.getTask(id);
  }

  openTasks(filter: { threadId?: string; type?: TaskType; owner?: "user" | "them" } = {}): Task[] {
    const where = [`status IN (${placeholders(OPEN_TASK_STATUSES.length)})`];
    const vals: SqlValue[] = [...OPEN_TASK_STATUSES];
    if (filter.threadId) (where.push("thread_id = ?"), vals.push(filter.threadId));
    if (filter.type) (where.push("type = ?"), vals.push(filter.type));
    if (filter.owner) (where.push("owner = ?"), vals.push(filter.owner));
    return this.sql<TaskRow>(`SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY COALESCE(due_at, created_at) ASC`, ...vals).map(toTask);
  }

  listTasks(limit = 200): Task[] {
    return this.sql<TaskRow>(`SELECT * FROM tasks ORDER BY updated_at DESC LIMIT ?`, limit).map(toTask);
  }

  /** Wakes snoozed tasks whose time has come. */
  unsnoozeDue(): number {
    const due = this.sql<{ id: string }>(`SELECT id FROM tasks WHERE status = 'snoozed' AND snoozed_until <= ?`, this.now());
    for (const r of due) this.updateTask(r.id, { status: "detected", snoozedUntil: null });
    return due.length;
  }

  // ── audit log ────────────────────────────────────────────────────────────
  recordAction(a: Omit<ActionRecord, "id" | "createdAt" | "undoneAt">): ActionRecord {
    const id = this.newId();
    this.sql(
      `INSERT INTO actions (id, task_id, tool, args, tier, approved_by, status, rationale, result, created_at, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      a.taskId,
      a.tool,
      JSON.stringify(a.args),
      a.tier,
      a.approvedBy,
      a.status,
      a.rationale,
      a.result ? JSON.stringify(a.result) : null,
      this.now(),
      a.executedAt,
    );
    return this.getAction(id)!;
  }

  getAction(id: string): ActionRecord | null {
    const r = this.sql<ActionRow>(`SELECT * FROM actions WHERE id = ?`, id)[0];
    return r ? toAction(r) : null;
  }

  markUndone(id: string): void {
    this.sql(`UPDATE actions SET status = 'undone', undone_at = ? WHERE id = ?`, this.now(), id);
  }

  listActions(limit = 200, taskId?: string): ActionRecord[] {
    const rows = taskId
      ? this.sql<ActionRow>(`SELECT * FROM actions WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`, taskId, limit)
      : this.sql<ActionRow>(`SELECT * FROM actions ORDER BY created_at DESC, rowid DESC LIMIT ?`, limit);
    return rows.map(toAction);
  }

  // ── learning ─────────────────────────────────────────────────────────────
  recordOutcome(o: { actionId: string | null; taskId: string | null; actionType: string; signal: string; diff?: string | null; editDistance?: number | null }): void {
    this.sql(
      `INSERT INTO outcomes (action_id, task_id, action_type, signal, diff, edit_distance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      o.actionId,
      o.taskId,
      o.actionType,
      o.signal,
      o.diff ?? null,
      o.editDistance ?? null,
      this.now(),
    );
  }

  outcomeSignals(actionType: string, limit = 20): string[] {
    return this.sql<{ signal: string }>(
      `SELECT signal FROM outcomes WHERE action_type = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
      actionType,
      limit,
    ).map((r) => r.signal);
  }

  recentEditDiffs(limit = 10): string[] {
    return this.sql<{ diff: string }>(
      `SELECT diff FROM outcomes WHERE signal = 'edited' AND diff IS NOT NULL AND diff != '' ORDER BY created_at DESC, id DESC LIMIT ?`,
      limit,
    ).map((r) => r.diff);
  }

  outcomeStats(): { actionType: string; signal: string; n: number; avgEdit: number | null }[] {
    return this.sql<{ action_type: string; signal: string; n: number; avg_edit: number | null }>(
      `SELECT action_type, signal, count(*) AS n, avg(edit_distance) AS avg_edit FROM outcomes GROUP BY action_type, signal`,
    ).map((r) => ({ actionType: r.action_type, signal: r.signal, n: r.n, avgEdit: r.avg_edit }));
  }

  setPreference(key: string, value: string, source: "explicit" | "learned", confidence = 1): void {
    this.sql(
      `INSERT INTO preferences (key, value, source, confidence, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = excluded.source, confidence = excluded.confidence, updated_at = excluded.updated_at`,
      key,
      value,
      source,
      confidence,
      this.now(),
    );
  }

  listPreferences(): { key: string; value: string; source: string; confidence: number }[] {
    return this.sql<{ key: string; value: string; source: string; confidence: number }>(
      `SELECT key, value, source, confidence FROM preferences ORDER BY key`,
    );
  }

  deletePreference(key: string): void {
    this.sql(`DELETE FROM preferences WHERE key = ?`, key);
  }

  // ── FYI & briefs ─────────────────────────────────────────────────────────
  addFyi(messageId: string, threadId: string, summary: string, reason: string): void {
    this.sql(
      `INSERT INTO fyi (message_id, thread_id, summary, reason, created_at) VALUES (?, ?, ?, ?, ?)`,
      messageId,
      threadId,
      summary,
      reason,
      this.now(),
    );
  }

  unbriefedFyi(limit = 15): { id: number; messageId: string; threadId: string; summary: string; reason: string }[] {
    return this.sql<{ id: number; message_id: string; thread_id: string; summary: string; reason: string }>(
      `SELECT id, message_id, thread_id, summary, reason FROM fyi WHERE briefed = 0 ORDER BY created_at DESC LIMIT ?`,
      limit,
    ).map((r) => ({ id: r.id, messageId: r.message_id, threadId: r.thread_id, summary: r.summary, reason: r.reason }));
  }

  markFyiBriefed(ids: number[]): void {
    if (ids.length) this.sql(`UPDATE fyi SET briefed = 1 WHERE id IN (${placeholders(ids.length)})`, ...ids);
  }

  saveBrief(b: { id: string; rfcMessageId: string; gmailMessageId: string | null; items: { n: number; taskId: string }[] }): void {
    this.sql(
      `INSERT INTO briefs (id, rfc_message_id, gmail_message_id, items, created_at) VALUES (?, ?, ?, ?, ?)`,
      b.id,
      b.rfcMessageId,
      b.gmailMessageId,
      JSON.stringify(b.items),
      this.now(),
    );
  }

  findBriefByRfcId(rfcMessageId: string): { id: string; items: { n: number; taskId: string }[] } | null {
    const r = this.sql<{ id: string; items: string }>(`SELECT id, items FROM briefs WHERE rfc_message_id = ?`, rfcMessageId)[0];
    return r ? { id: r.id, items: JSON.parse(r.items) } : null;
  }

  // ── calendar ─────────────────────────────────────────────────────────────
  upsertEvent(e: { id: string; summary: string; start: number; end: number; status: string; selfResponse?: string; organizer?: string; attendees: string[]; htmlLink?: string }): void {
    this.sql(
      `INSERT INTO events (id, summary, start_at, end_at, status, self_response, organizer, attendees, html_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET summary = excluded.summary, start_at = excluded.start_at, end_at = excluded.end_at, status = excluded.status,
         self_response = excluded.self_response, organizer = excluded.organizer, attendees = excluded.attendees, html_link = excluded.html_link`,
      e.id,
      e.summary,
      e.start,
      e.end,
      e.status,
      e.selfResponse ?? null,
      e.organizer ?? null,
      JSON.stringify(e.attendees),
      e.htmlLink ?? null,
    );
  }

  deleteEvent(id: string): void {
    this.sql(`DELETE FROM events WHERE id = ?`, id);
  }

  eventsBetween(start: number, end: number) {
    return this.sql<{ id: string; summary: string; start_at: number; end_at: number; status: string; self_response: string | null; attendees: string }>(
      `SELECT * FROM events WHERE start_at < ? AND end_at > ? AND status != 'cancelled' ORDER BY start_at`,
      end,
      start,
    ).map((r) => ({ id: r.id, summary: r.summary, start: r.start_at, end: r.end_at, status: r.status, selfResponse: r.self_response, attendees: JSON.parse(r.attendees) as string[] }));
  }

  /** Full deletion on disconnect (PRD §9.2). */
  wipe(): void {
    for (const t of ["kv", "threads", "messages", "tasks", "actions", "preferences", "outcomes", "briefs", "fyi", "events"]) {
      this.sql(`DELETE FROM ${t}`);
    }
  }
}
