import { describe, expect, it } from "vitest";
import { extractTasks, sanitizeCounterparty, sanitizeDue } from "../../src/core/extract";
import { email, FakeAI } from "../helpers/fakes";

const NOW = Date.parse("2026-10-02T00:00:00Z");
const USER = "anant@example.com";

describe("task extraction (FR-8/9)", () => {
  const msg = email({ from: { email: "sam@acme.com", name: "Sam" }, to: [{ email: USER }], cc: [{ email: "lee@acme.com" }], body: "Can you send the deck by Friday?" });

  it("keeps counterparties on the email and rejects injected ones", () => {
    expect(sanitizeCounterparty("lee@acme.com", msg, USER)).toBe("lee@acme.com");
    expect(sanitizeCounterparty("attacker@evil.com", msg, USER)).toBe("sam@acme.com");
    expect(sanitizeCounterparty(USER, msg, USER)).toBe("sam@acme.com");
  });

  it("accepts only plausible due dates", () => {
    expect(sanitizeDue("2026-10-09", NOW)).toBe(Date.parse("2026-10-09"));
    expect(sanitizeDue("next friday", NOW)).toBeNull();
    expect(sanitizeDue("1999-01-01", NOW)).toBeNull();
  });

  it("splits confident tasks from low-confidence ones", async () => {
    const ai = new FakeAI(() => ({}), () =>
      JSON.stringify({
        tasks: [
          { type: "deadline", ask: "Send the deck", counterparty: "sam@acme.com", due_date: "2026-10-09", owner: "user", confidence: 0.92 },
          { type: "review_doc", ask: "Maybe review", counterparty: null, due_date: null, owner: "user", confidence: 0.3 },
        ],
      }),
    );
    const out = await extractTasks(ai, msg, { userEmail: USER, now: NOW, timezone: "UTC" });
    expect(out.failed).toBe(false);
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]).toMatchObject({ type: "deadline", counterparty: "sam@acme.com", dueAt: Date.parse("2026-10-09") });
    expect(out.lowConfidence).toHaveLength(1);
  });

  it("reports failure when output never validates", async () => {
    const ai = new FakeAI(() => ({}), () => '{"tasks": [{"type": "launch_missiles"}]}');
    const out = await extractTasks(ai, msg, { userEmail: USER, now: NOW, timezone: "UTC" });
    expect(out).toMatchObject({ failed: true, tasks: [] });
  });

  it("marks the email body as untrusted data in the prompt", async () => {
    const ai = new FakeAI(() => ({}), () => '{"tasks": []}');
    await extractTasks(ai, msg, { userEmail: USER, now: NOW, timezone: "UTC" });
    const req = ai.calls[0].input as any;
    expect(req.messages[0].content).toMatch(/untrusted data/);
    expect(req.messages[1].content).toMatch(/<email_body>[\s\S]*Can you send the deck[\s\S]*<\/email_body>/);
    expect(req.jsonSchema.name).toBe("tasks");
  });

  it("only keeps commitments and follow-ups from sent mail", async () => {
    const ai = new FakeAI(() => ({}), () =>
      JSON.stringify({
        tasks: [
          { type: "commitment", ask: "Send deck", counterparty: "sam@acme.com", due_date: null, owner: "user", confidence: 0.9 },
          { type: "reply_needed", ask: "x", counterparty: null, due_date: null, owner: "user", confidence: 0.9 },
        ],
      }),
    );
    const sent = email({ from: USER, to: [{ email: "sam@acme.com" }], body: "I'll send the deck Friday", labelIds: ["SENT"] });
    const out = await extractTasks(ai, sent, { userEmail: USER, now: NOW, timezone: "UTC", sentByUser: true });
    expect(out.tasks.map((t) => t.type)).toEqual(["commitment"]);
  });
});
