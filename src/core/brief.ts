// FR-21: the morning brief, and FR-18/19: reply-to-brief commands.

import type { EmailMessage, Task } from "../types";
import { formatLocal } from "./time";

export interface BriefItem {
  n: number;
  taskId: string;
  section: "ready" | "needs_you" | "waiting";
  line: string;
}

export interface BriefContent {
  subject: string;
  text: string;
  html: string;
  items: BriefItem[];
}

export interface BriefInput {
  now: number;
  timezone: string;
  userName: string;
  tasks: Task[];
  meetings: { summary: string; start: number; end: number }[];
  fyi: { summary: string; reason: string }[];
  suspicious: { summary: string; reason: string }[];
  promotionOffers: string[];
  intro?: string;
  dashboardUrl?: string;
}

const TYPE_LABEL: Record<string, string> = {
  reply_needed: "Reply",
  schedule_meeting: "Schedule",
  follow_up: "Follow up",
  deadline: "Deadline",
  rsvp: "RSVP",
  review_doc: "Review",
  commitment: "You promised",
  pay_bill: "Bill",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function composeBrief(input: BriefInput): BriefContent {
  const tz = input.timezone;
  const due = (t: Task) => (t.dueAt ? ` (due ${formatLocal(t.dueAt, tz, { hour: undefined, minute: undefined })})` : "");
  const who = (t: Task) => (t.counterparty ? ` — ${t.counterparty}` : "");
  const ready = input.tasks.filter((t) => t.status === "awaiting_approval");
  const needsYou = input.tasks.filter((t) => t.owner === "user" && (t.status === "detected" || t.status === "planned"));
  const waiting = input.tasks.filter((t) => t.owner === "them" && t.status !== "awaiting_approval" && t.status !== "snoozed");

  const items: BriefItem[] = [];
  let n = 1;
  const push = (section: BriefItem["section"], t: Task, suffix = "") =>
    items.push({ n: n++, taskId: t.id, section, line: `${TYPE_LABEL[t.type] ?? t.type}: ${t.ask}${who(t)}${due(t)}${suffix}` });
  for (const t of ready) push("ready", t, t.proposedAction?.tool === "respond_to_invite" ? ` → proposed: ${String(t.proposedAction.args.response)}` : " → draft ready");
  for (const t of needsYou) push("needs_you", t);
  for (const t of waiting) push("waiting", t);

  const dateLabel = formatLocal(input.now, tz, { hour: undefined, minute: undefined });
  const subject = `Mise brief — ${dateLabel}: ${ready.length} ready, ${needsYou.length} need you`;

  const sections: { title: string; lines: string[] }[] = [];
  if (input.meetings.length)
    sections.push({
      title: "Today's meetings",
      lines: input.meetings.map((m) => `${formatLocal(m.start, tz, { weekday: undefined, month: undefined, day: undefined })} ${m.summary}`),
    });
  const numbered = (section: BriefItem["section"]) => items.filter((i) => i.section === section).map((i) => `${i.n}. ${i.line}`);
  if (ready.length) sections.push({ title: "Ready for your OK", lines: numbered("ready") });
  if (needsYou.length) sections.push({ title: "Needs you", lines: numbered("needs_you") });
  if (waiting.length) sections.push({ title: "Waiting on others", lines: numbered("waiting") });
  if (input.suspicious.length)
    sections.push({ title: "Flagged as suspicious (not acted on)", lines: input.suspicious.map((s) => `• ${s.summary} — ${s.reason}`) });
  if (input.fyi.length) sections.push({ title: "FYI", lines: input.fyi.map((f) => `• ${f.summary}`) });
  if (input.promotionOffers.length)
    sections.push({
      title: "Automate?",
      lines: input.promotionOffers.map((k) => `• You've approved "${k}" every time lately. Turn it on in the dashboard to let Mise do it automatically.`),
    });

  const help =
    'Reply with commands, e.g. "send 1, snooze 3 to Monday, decline 4". Commands: send/approve, accept, decline, snooze N [to day], dismiss, done.';
  const intro = input.intro?.trim() || `Good morning ${input.userName}. Here's what's pending.`;
  const text = [
    intro,
    "",
    ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.lines, ""]),
    sections.length ? help : "Nothing pending. Enjoy the quiet.",
    input.dashboardUrl ? `\nDashboard: ${input.dashboardUrl}` : "",
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px">
<p>${esc(intro)}</p>
${sections.map((s) => `<h3 style="margin:16px 0 4px">${esc(s.title)}</h3><div>${s.lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>`).join("\n")}
<p style="color:#666;font-size:13px">${esc(sections.length ? help : "Nothing pending. Enjoy the quiet.")}</p>
${input.dashboardUrl ? `<p><a href="${esc(input.dashboardUrl)}">Open dashboard</a></p>` : ""}
</div>`;
  return { subject, text, html, items };
}

export type BriefVerb = "approve" | "accept" | "decline" | "snooze" | "dismiss" | "done";

export interface BriefCommand {
  verb: BriefVerb;
  n: number;
  /** For snooze: the raw target ("monday", "tomorrow"). */
  until?: string;
}

const VERBS: Record<string, BriefVerb> = {
  send: "approve",
  approve: "approve",
  ok: "approve",
  yes: "approve",
  accept: "accept",
  decline: "decline",
  snooze: "snooze",
  later: "snooze",
  dismiss: "dismiss",
  reject: "dismiss",
  skip: "dismiss",
  ignore: "dismiss",
  no: "dismiss",
  done: "done",
  close: "done",
};

/** Only the user's new text counts: quoted history (the brief itself) is stripped first. */
export function newTextOfReply(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const l of lines) {
    if (/^On .*wrote:\s*$/.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l.trim())) break;
    if (l.trim().startsWith(">")) continue;
    out.push(l);
  }
  return out.join("\n");
}

/** Parses "send 2, snooze 3 to Monday and decline 5" (also "send 1 2", "send 1-3"). */
export function parseBriefCommands(body: string): BriefCommand[] {
  const text = newTextOfReply(body).toLowerCase();
  const cmds: BriefCommand[] = [];
  const clauses = text.split(/[,;\n]|\band\b|\bthen\b/);
  for (const clause of clauses) {
    const m = clause.trim().match(/^([a-z]+)\s+((?:#?\d+(?:\s*-\s*\d+)?\s*)+)(?:\s*(?:to|until|till)\s+([a-z ]+?))?\s*[.!]?$/);
    if (!m) continue;
    const verb = VERBS[m[1]];
    if (!verb) continue;
    const ns: number[] = [];
    for (const tok of m[2].matchAll(/#?(\d+)(?:\s*-\s*(\d+))?/g)) {
      const a = Number(tok[1]);
      const b = tok[2] ? Number(tok[2]) : a;
      for (let i = Math.min(a, b); i <= Math.max(a, b) && i - Math.min(a, b) < 50; i++) ns.push(i);
    }
    for (const n of ns) cmds.push({ verb, n, ...(verb === "snooze" ? { until: m[3]?.trim() || "tomorrow" } : {}) });
  }
  return cmds;
}

/**
 * FR-19: commands count only when the reply was sent from the user's own account (Gmail's SENT
 * label, which an outside sender cannot forge), from the user's address, in reply to a brief
 * the agent sent.
 */
export function isAuthenticBriefReply(msg: EmailMessage, userEmail: string, briefRfcIds: (id: string) => boolean): boolean {
  if (!msg.labelIds.includes("SENT")) return false;
  if (msg.from.email.toLowerCase() !== userEmail.toLowerCase()) return false;
  const refs = `${msg.headers["in-reply-to"] ?? ""} ${msg.headers["references"] ?? ""}`.match(/<[^>]+>/g) ?? [];
  return refs.some((r) => briefRfcIds(r));
}
