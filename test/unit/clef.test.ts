import { describe, expect, it } from "vitest";
import { extractText, parseClefResponse, WorkersAiInference } from "../../src/ai/workers-ai";
import { routeTriage, triage, TRIAGE_QUESTIONS } from "../../src/core/triage";
import { clefAnswers, FakeAI } from "../helpers/fakes";

describe("Clef response parsing", () => {
  const questions = {
    urgent: { type: "noul" as const, instructions: "?" },
    team: { type: "choice" as const, instructions: "?", criteria: { billing: "b", technical: "t", sales: "s" } },
    severity: { type: "score" as const, instructions: "?", criteria: ["none", "minor", "major", "critical"] },
  };

  it("reads the documented shape", () => {
    const parsed = parseClefResponse(
      {
        answers: {
          urgent: { noul: 0.91 },
          team: { choice: "technical", probabilities: { billing: 0.05, technical: 0.9, sales: 0.05 }, confidence: 0.9 },
          severity: { score: 2.4, probabilities: [0.0, 0.1, 0.4, 0.5] },
        },
      },
      questions,
    );
    expect(parsed.urgent).toEqual({ kind: "noul", p: 0.91 });
    expect(parsed.team).toMatchObject({ kind: "choice", top: "technical", p: 0.9 });
    expect(parsed.severity).toMatchObject({ kind: "score", value: 2.4, dist: [0, 0.1, 0.4, 0.5] });
  });

  it("tolerates bare values and missing distributions", () => {
    const parsed = parseClefResponse({ answers: { urgent: 0.3, team: { choice: "sales", confidence: 0.6 }, severity: { score: 1 } } }, questions);
    expect(parsed.urgent).toEqual({ kind: "noul", p: 0.3 });
    expect(parsed.team).toMatchObject({ top: "sales", p: 0.6 });
    expect((parsed.team as any).dist.billing).toBeCloseTo(0.2);
    expect(parsed.severity).toMatchObject({ value: 1, dist: [0, 1, 0, 0] });
  });

  it("treats missing answers as zero confidence rather than throwing", () => {
    const parsed = parseClefResponse({}, questions);
    expect(parsed.urgent).toEqual({ kind: "noul", p: 0 });
    expect(parsed.team.kind).toBe("choice");
  });

  it("sends the documented request through the binding and gateway", async () => {
    const calls: any[] = [];
    const ai = new WorkersAiInference({ run: async (...args: any[]) => (calls.push(args), { answers: { urgent: { noul: 0.7 } } }) }, { gatewayId: "gw", userId: "u1" });
    const out = await ai.decide("@cf/cloudflare/clef-flash", "state", { urgent: questions.urgent });
    expect(out.urgent).toEqual({ kind: "noul", p: 0.7 });
    expect(calls[0][0]).toBe("@cf/cloudflare/clef-flash");
    expect(calls[0][1]).toMatchObject({ model: "clef-flash", state: "state" });
    expect(calls[0][2]).toEqual({ gateway: { id: "gw", metadata: { userId: "u1" } } });
  });

  it("extracts text from every Workers AI response shape", () => {
    expect(extractText({ response: "a" })).toBe("a");
    expect(extractText({ response: { x: 1 } })).toBe('{"x":1}');
    expect(extractText({ choices: [{ message: { content: "b" } }] })).toBe("b");
    expect(extractText({ output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "c" }] }] })).toBe("c");
  });
});

describe("triage routing (PRD §8.5.3)", () => {
  const route = (simple: Record<string, any>) => routeTriage(clefAnswers(TRIAGE_QUESTIONS, simple), "clef");

  it("labels injection attempts suspicious regardless of bucket", () => {
    const r = route({ bucket: { top: "action_for_user", p: 0.99 }, addresses_ai_assistant: 0.8 });
    expect(r.bucket).toBe("suspicious");
    expect(r.extract).toBe(false);
    expect(r.reason).toMatch(/AI assistant/);
    expect(route({ bucket: "fyi", requests_sensitive_action: 0.5 }).bucket).toBe("suspicious");
    expect(route({ bucket: "fyi", phishing_likelihood: { level: 3, p: 0.7 } }).bucket).toBe("suspicious");
  });

  it("extracts only when action_for_user is at least 0.85", () => {
    expect(route({ bucket: { top: "action_for_user", p: 0.9 } })).toMatchObject({ bucket: "action_for_user", extract: true });
    expect(route({ bucket: { top: "action_for_user", p: 0.8 } })).toMatchObject({ bucket: "action_for_user", extract: false });
  });

  it("falls back to FYI when the top bucket is below 0.7", () => {
    expect(route({ bucket: { top: "action_for_user", p: 0.6 } })).toMatchObject({ bucket: "fyi", lowConfidence: true });
  });

  it("escalates along the model chain while confidence is low", async () => {
    const ai = new FakeAI(
      (model) => ({ bucket: { top: "action_for_user", p: model.endsWith("clef-flash") ? 0.5 : 0.95 } }),
      () => "",
    );
    const state = { sender: "a", recipients: [], subject: "", body: "", thread_position: 1, sender_history: { messages_from_sender: 0, user_replied_before: false, vip: false } };
    const r = await triage(ai, state, ["@cf/cloudflare/clef-flash", "@cf/cloudflare/clef"]);
    expect(r).toMatchObject({ bucket: "action_for_user", model: "@cf/cloudflare/clef", extract: true });
    expect(ai.count("decide")).toBe(2);
  });

  it("answers the whole question set in one call", async () => {
    const ai = new FakeAI(() => ({ bucket: "fyi" }), () => "");
    const state = { sender: "a", recipients: [], subject: "", body: "", thread_position: 1, sender_history: { messages_from_sender: 0, user_replied_before: false, vip: false } };
    await triage(ai, state);
    expect(ai.count("decide")).toBe(1);
    expect((ai.calls[0].input as any).questions).toEqual(Object.keys(TRIAGE_QUESTIONS));
  });
});
