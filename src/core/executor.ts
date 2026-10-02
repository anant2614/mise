// FR-17/FR-20: the only path from a decision to a side effect. Every call is authorized by the
// tier policy, executed, and written to the audit log with its rationale; reversible actions
// can be undone.

import { LABELS, type LabelKey } from "../config";
import type { CalendarApi, MailApi } from "../google/types";
import { buildRawMessage, type OutgoingMessage } from "../google/mime";
import type { ActionRecord, ToolName } from "../types";
import { authorize, tierOf } from "./policy";
import type { Store } from "./store";

export interface ExecContext {
  taskId: string | null;
  rationale: string;
  approvedByUser?: boolean;
  autonomyKey?: string;
  sourceSuspicious?: boolean;
}

export type ExecResult =
  | { ok: true; action: ActionRecord; result: Record<string, unknown> }
  | { ok: false; action: ActionRecord; needsApproval: boolean; reason: string };

export interface ExecutorDeps {
  store: Store;
  mail: MailApi;
  calendar: CalendarApi;
  userEmail: string;
  /** Label key → Gmail label id. */
  labelIds: () => Promise<Record<LabelKey, string>>;
}

export class Executor {
  constructor(private d: ExecutorDeps) {}

  /** True when every recipient is already on the thread or someone the user has corresponded with. */
  recipientsKnown(threadId: string | null, recipients: string[]): boolean {
    const onThread = new Set(threadId ? this.d.store.threadParticipants(threadId) : []);
    return recipients.every((r) => {
      const e = r.toLowerCase();
      return e === this.d.userEmail.toLowerCase() || onThread.has(e) || this.d.store.isKnownContact(e);
    });
  }

  async run(tool: ToolName, args: Record<string, unknown>, ctx: ExecContext): Promise<ExecResult> {
    const store = this.d.store;
    let recipientsKnown: boolean | undefined;
    if (tool === "send_draft") {
      // Check the draft as it is *now*: the user may have edited it in Gmail since we wrote it.
      const draft = await this.d.mail.getDraft(String(args.draftId));
      if (!draft) {
        const action = store.recordAction({
          taskId: ctx.taskId, tool, args, tier: tierOf(tool), approvedBy: null, status: "failed",
          rationale: ctx.rationale, result: { error: "draft no longer exists" }, executedAt: null,
        });
        return { ok: false, action, needsApproval: false, reason: "draft no longer exists" };
      }
      recipientsKnown = this.recipientsKnown((args.threadId as string) ?? null, draft.recipients);
    }

    const decision = authorize(tool, {
      approvedByUser: !!ctx.approvedByUser,
      autonomyKey: ctx.autonomyKey,
      autonomy: store.getSettings()?.autonomy ?? {},
      sourceSuspicious: ctx.sourceSuspicious,
      recipientsKnown,
    });
    if (!decision.allow) {
      const action = store.recordAction({
        taskId: ctx.taskId, tool, args, tier: decision.tier, approvedBy: null, status: "denied",
        rationale: `${ctx.rationale} — not executed: ${decision.reason}`, result: null, executedAt: null,
      });
      return { ok: false, action, needsApproval: decision.needsApproval, reason: decision.reason };
    }

    try {
      const result = await this.execute(tool, args);
      const action = store.recordAction({
        taskId: ctx.taskId, tool, args, tier: decision.tier, approvedBy: decision.approvedBy, status: "executed",
        rationale: ctx.rationale, result, executedAt: store.now(),
      });
      return { ok: true, action, result };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      const action = store.recordAction({
        taskId: ctx.taskId, tool, args, tier: decision.tier, approvedBy: decision.approvedBy, status: "failed",
        rationale: ctx.rationale, result: { error: reason }, executedAt: null,
      });
      return { ok: false, action, needsApproval: false, reason };
    }
  }

  private async execute(tool: ToolName, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { mail, calendar } = this.d;
    switch (tool) {
      case "apply_label":
      case "remove_label": {
        const ids = await this.d.labelIds();
        const labelId = ids[args.label as LabelKey];
        if (!labelId) throw new Error(`unknown label ${String(args.label)}`);
        const add = tool === "apply_label" ? [labelId] : [];
        const remove = tool === "remove_label" ? [labelId] : [];
        await mail.modifyThread(String(args.threadId), add, remove);
        return { labelId, label: LABELS[args.label as LabelKey] };
      }
      case "archive_thread":
        await mail.modifyThread(String(args.threadId), [], ["INBOX"]);
        return {};
      case "unarchive_thread":
        await mail.modifyThread(String(args.threadId), ["INBOX"], []);
        return {};
      case "create_draft": {
        const raw = buildRawMessage(args.message as OutgoingMessage);
        const { draftId, messageId } = await mail.createDraft(String(args.threadId), raw);
        return { draftId, messageId };
      }
      case "delete_draft":
        await mail.deleteDraft(String(args.draftId));
        return {};
      case "create_event": {
        const ev = await calendar.insertEvent({
          summary: String(args.summary),
          description: args.description ? String(args.description) : undefined,
          start: Number(args.start),
          end: Number(args.end),
          tentative: true,
        });
        return { eventId: ev.id, htmlLink: ev.htmlLink ?? null };
      }
      case "delete_event":
        await calendar.deleteEvent(String(args.eventId));
        return {};
      case "send_draft": {
        const sent = await mail.sendDraft(String(args.draftId));
        return { messageId: sent.messageId, threadId: sent.threadId };
      }
      case "respond_to_invite":
        await calendar.respond(String(args.eventId), args.response as "accepted" | "declined" | "tentative");
        return { response: args.response as string };
      default:
        throw new Error(`${tool} has no implementation`);
    }
  }

  /** Undo a reversible action by running its inverse (itself audited). */
  async undo(actionId: string): Promise<{ ok: boolean; reason?: string }> {
    const store = this.d.store;
    const action = store.getAction(actionId);
    if (!action) return { ok: false, reason: "no such action" };
    if (action.status !== "executed") return { ok: false, reason: `action is ${action.status}` };
    const inverse = this.inverseOf(action);
    if (!inverse) return { ok: false, reason: `${action.tool} cannot be undone` };
    const res = await this.run(inverse.tool, inverse.args, {
      taskId: action.taskId,
      rationale: `Undo of ${action.tool} (${action.id})`,
      approvedByUser: true,
    });
    if (!res.ok) return { ok: false, reason: res.reason };
    store.markUndone(action.id);
    return { ok: true };
  }

  private inverseOf(a: ActionRecord): { tool: ToolName; args: Record<string, unknown> } | null {
    switch (a.tool) {
      case "apply_label":
        return { tool: "remove_label", args: a.args };
      case "remove_label":
        return { tool: "apply_label", args: a.args };
      case "archive_thread":
        return { tool: "unarchive_thread", args: a.args };
      case "create_draft":
        return a.result?.draftId ? { tool: "delete_draft", args: { draftId: a.result.draftId } } : null;
      case "create_event":
        return a.result?.eventId ? { tool: "delete_event", args: { eventId: a.result.eventId } } : null;
      default:
        return null;
    }
  }
}
