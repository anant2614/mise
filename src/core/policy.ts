// FR-17 / PRD §6.3: autonomy tiers enforced in code, never in a prompt. Every tool call the
// agent makes goes through `authorize`, and anything not listed here is blocked.

import type { Tier, ToolName } from "../types";

export const TOOL_TIERS: Record<ToolName, Tier> = {
  get_thread: "free",
  search_threads: "free",
  apply_label: "free",
  remove_label: "free",
  archive_thread: "free",
  unarchive_thread: "free",
  create_draft: "free",
  delete_draft: "free",
  get_free_busy: "free",
  create_event: "reversible",
  delete_event: "reversible",
  snooze_task: "reversible",
  send_draft: "outward",
  respond_to_invite: "outward",
  // Deliberately not implemented as tools at all; listed so the policy can name them as blocked.
  send_email: "blocked",
  forward_email: "blocked",
  delete_email: "blocked",
  make_payment: "blocked",
};

export function tierOf(tool: string): Tier {
  return (TOOL_TIERS as Record<string, Tier>)[tool] ?? "blocked";
}

export interface AuthorizeContext {
  /** Set when a human approved this specific action (dashboard, push, or reply-to-brief). */
  approvedByUser: boolean;
  /** Key for per-action-type autonomy, e.g. "send_draft:reply_needed". */
  autonomyKey?: string;
  autonomy: Record<string, boolean>;
  /** The source email was flagged suspicious; nothing it triggers may run without a human. */
  sourceSuspicious?: boolean;
  /** For sends: every recipient already appears on the thread or in the user's contacts. */
  recipientsKnown?: boolean;
}

export type Decision =
  | { allow: true; approvedBy: "auto" | "user"; tier: Tier }
  | { allow: false; needsApproval: boolean; tier: Tier; reason: string };

export function authorize(tool: string, ctx: AuthorizeContext): Decision {
  const tier = tierOf(tool);
  if (tier === "blocked") {
    return { allow: false, needsApproval: false, tier, reason: `${tool} is blocked and never allowed` };
  }
  if (tier === "outward") {
    if (ctx.recipientsKnown === false) {
      return {
        allow: false,
        needsApproval: !ctx.approvedByUser,
        tier,
        reason: ctx.approvedByUser
          ? "draft addresses a recipient who is not on the thread; edit it in Gmail and send it yourself"
          : "outward action to a new recipient requires approval",
      };
    }
    if (ctx.approvedByUser) return { allow: true, approvedBy: "user", tier };
    if (!ctx.sourceSuspicious && ctx.autonomyKey && ctx.autonomy[ctx.autonomyKey]) {
      return { allow: true, approvedBy: "auto", tier };
    }
    return { allow: false, needsApproval: true, tier, reason: "outward-facing action requires approval" };
  }
  if (ctx.sourceSuspicious && tier === "reversible" && !ctx.approvedByUser) {
    return { allow: false, needsApproval: true, tier, reason: "source email is suspicious" };
  }
  return { allow: true, approvedBy: ctx.approvedByUser ? "user" : "auto", tier };
}

/**
 * PRD §6.3: offer to promote an action type to automatic after N approvals in a row with no
 * edits. `signals` is newest-first.
 */
export function shouldOfferPromotion(signals: string[], n: number): boolean {
  if (signals.length < n) return false;
  return signals.slice(0, n).every((s) => s === "approved");
}
