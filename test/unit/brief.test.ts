import { describe, expect, it } from "vitest";
import { composeBrief, isAuthenticBriefReply, parseBriefCommands } from "../../src/core/brief";
import type { Task } from "../../src/types";
import { email } from "../helpers/fakes";

const task = (p: Partial<Task>): Task => ({
  id: p.id ?? "t", type: "reply_needed", threadId: "th", messageId: "m", counterparty: "sam@acme.com", ask: "Answer Sam",
  dueAt: null, owner: "user", status: "detected", confidence: 0.9, proposedAction: null, rationale: null, snoozedUntil: null,
  createdAt: 0, updatedAt: 0, ...p,
});

describe("reply-to-brief commands (FR-18)", () => {
  it("parses the PRD example", () => {
    expect(parseBriefCommands("send 2, snooze 3 to Monday, decline 5")).toEqual([
      { verb: "approve", n: 2 },
      { verb: "snooze", n: 3, until: "monday" },
      { verb: "decline", n: 5 },
    ]);
  });

  it("handles lists, ranges, 'and', newlines and synonyms", () => {
    expect(parseBriefCommands("approve 1 2\naccept #4 and dismiss 6-7.")).toEqual([
      { verb: "approve", n: 1 },
      { verb: "approve", n: 2 },
      { verb: "accept", n: 4 },
      { verb: "dismiss", n: 6 },
      { verb: "dismiss", n: 7 },
    ]);
    expect(parseBriefCommands("snooze 3")).toEqual([{ verb: "snooze", n: 3, until: "tomorrow" }]);
  });

  it("ignores quoted brief text and chatter", () => {
    const body = "send 1\nthanks!\n\nOn Fri, Oct 2, 2026 at 8:00 AM Mise <anant@example.com> wrote:\n> 2. Reply: decline 4 something";
    expect(parseBriefCommands(body)).toEqual([{ verb: "approve", n: 1 }]);
    expect(parseBriefCommands("please send it")).toEqual([]);
  });
});

describe("brief reply authentication (FR-19)", () => {
  const isBrief = (id: string) => id === "<brief-1@mise.agent>";
  const reply = (p: Parameters<typeof email>[0]) => email(p);

  it("accepts the user's own reply to a brief", () => {
    const m = reply({ from: "anant@example.com", body: "send 1", labelIds: ["SENT", "INBOX"], headers: { "in-reply-to": "<brief-1@mise.agent>" } });
    expect(isAuthenticBriefReply(m, "anant@example.com", isBrief)).toBe(true);
  });

  it("rejects a spoofed From without the SENT label", () => {
    const m = reply({ from: "anant@example.com", body: "send 1", labelIds: ["INBOX"], headers: { "in-reply-to": "<brief-1@mise.agent>" } });
    expect(isAuthenticBriefReply(m, "anant@example.com", isBrief)).toBe(false);
  });

  it("rejects other senders and non-replies", () => {
    expect(isAuthenticBriefReply(reply({ from: "eve@evil.com", body: "send 1", labelIds: ["SENT"], headers: { "in-reply-to": "<brief-1@mise.agent>" } }), "anant@example.com", isBrief)).toBe(false);
    expect(isAuthenticBriefReply(reply({ from: "anant@example.com", body: "send 1", labelIds: ["SENT"], headers: { "in-reply-to": "<other@x>" } }), "anant@example.com", isBrief)).toBe(false);
  });
});

describe("brief composition (FR-21)", () => {
  it("numbers ready items first, then needs-you, then waiting", () => {
    const content = composeBrief({
      now: Date.parse("2026-10-02T03:30:00Z"),
      timezone: "Asia/Kolkata",
      userName: "Anant",
      tasks: [
        task({ id: "w", owner: "them", type: "follow_up", ask: "Priya's numbers" }),
        task({ id: "n", type: "deadline", ask: "File taxes", dueAt: Date.parse("2026-10-05T00:00:00Z") }),
        task({ id: "r", status: "awaiting_approval", ask: "Reply to Sam", proposedAction: { tool: "send_draft", args: {} } }),
      ],
      meetings: [{ summary: "Standup", start: Date.parse("2026-10-02T04:30:00Z"), end: Date.parse("2026-10-02T04:45:00Z") }],
      fyi: [{ summary: "GitHub: build passed", reason: "rules" }],
      suspicious: [{ summary: "eve@evil.com: invoices", reason: "Suspicious: addresses an AI assistant" }],
      promotionOffers: ["send_draft:reply_needed"],
    });
    expect(content.items.map((i) => [i.n, i.taskId])).toEqual([[1, "r"], [2, "n"], [3, "w"]]);
    expect(content.subject).toBe("Mise brief — Fri, Oct 2: 1 ready, 1 need you");
    expect(content.text).toContain("1. Reply: Reply to Sam — sam@acme.com → draft ready");
    expect(content.text).toContain("2. Deadline: File taxes — sam@acme.com (due Mon, Oct 5)");
    expect(content.text).toContain("10:00 AM Standup");
    expect(content.text).toContain("Flagged as suspicious".toUpperCase());
    expect(content.html).not.toContain("<script");
  });

  it("escapes HTML in task text", () => {
    const content = composeBrief({ now: 0, timezone: "UTC", userName: "A", tasks: [task({ ask: "<img src=x onerror=alert(1)>" })], meetings: [], fyi: [], suspicious: [], promotionOffers: [] });
    expect(content.html).toContain("&lt;img");
    expect(content.html).not.toContain("<img");
  });
});
