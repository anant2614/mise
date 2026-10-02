// FR-5: cheap rules that run before any model call.

import type { EmailMessage } from "../types";

export type RuleOutcome =
  | { action: "skip"; reason: string }
  | { action: "sent"; reason: string }
  | { action: "bucket"; bucket: "ignore" | "fyi"; reason: string; newsletter: boolean }
  | { action: "triage"; reason: string; vip: boolean };

const SKIP_LABELS = ["SPAM", "TRASH", "DRAFT", "CHAT"];
const CATEGORY_IGNORE = ["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL"];
const CATEGORY_FYI = ["CATEGORY_UPDATES", "CATEGORY_FORUMS"];
const AUTOMATED_LOCAL_PARTS =
  /^(no-?reply|do-?not-?reply|notifications?|mailer-daemon|postmaster|bounce[s]?|alerts?|news(letter)?|digest|updates?)([+._-].*)?$/i;
/** Senders whose mail is automated but may still carry actionable work (invites, doc shares). */
const ACTIONABLE_AUTOMATED = [/^calendar-notification@google\.com$/i, /^drive-shares-.*@google\.com$/i, /^comments-noreply@docs\.google\.com$/i];

export function applyRules(msg: EmailMessage, userEmail: string, vips: string[] = []): RuleOutcome {
  const labels = msg.labelIds;
  if (labels.some((l) => SKIP_LABELS.includes(l))) return { action: "skip", reason: "spam, trash, draft or chat" };

  const from = msg.from.email.toLowerCase();
  if (labels.includes("SENT") || from === userEmail.toLowerCase()) {
    return { action: "sent", reason: "sent by the user" };
  }

  if (vips.some((v) => v.toLowerCase() === from)) return { action: "triage", reason: "VIP sender", vip: true };

  if (ACTIONABLE_AUTOMATED.some((re) => re.test(from))) {
    return { action: "triage", reason: "automated sender that can carry work", vip: false };
  }

  const h = msg.headers;
  if (h["list-unsubscribe"] || h["list-id"]) {
    return { action: "bucket", bucket: "ignore", reason: "mailing list / newsletter", newsletter: true };
  }
  if (labels.some((l) => CATEGORY_IGNORE.includes(l))) {
    return { action: "bucket", bucket: "ignore", reason: "promotions or social category", newsletter: true };
  }
  const precedence = (h["precedence"] ?? "").toLowerCase();
  if (["bulk", "list", "junk"].includes(precedence)) {
    return { action: "bucket", bucket: "ignore", reason: `precedence: ${precedence}`, newsletter: true };
  }
  const autoSubmitted = (h["auto-submitted"] ?? "").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") {
    return { action: "bucket", bucket: "fyi", reason: "auto-submitted", newsletter: false };
  }
  if (AUTOMATED_LOCAL_PARTS.test(from.split("@")[0] ?? "")) {
    return { action: "bucket", bucket: "fyi", reason: "known automated sender", newsletter: false };
  }
  if (labels.some((l) => CATEGORY_FYI.includes(l))) {
    return { action: "bucket", bucket: "fyi", reason: "updates or forums category", newsletter: false };
  }
  return { action: "triage", reason: "personal mail", vip: false };
}
