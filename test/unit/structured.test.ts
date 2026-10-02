import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateStructured, parseJsonLoose } from "../../src/ai/structured";
import { FakeAI } from "../helpers/fakes";

const Schema = z.object({ answer: z.number() });
const msgs = [{ role: "user" as const, content: "q" }];

describe("structured generation (PRD §8.5.4)", () => {
  it("parses JSON wrapped in reasoning and code fences", () => {
    expect(parseJsonLoose('<think>hmm {"no":1}</think>```json\n{"answer": 2}\n```')).toEqual({ answer: 2 });
    expect(parseJsonLoose('Sure! {"answer": 3} hope that helps')).toEqual({ answer: 3 });
  });

  it("returns on the first valid output", async () => {
    const ai = new FakeAI(() => ({}), () => '{"answer": 1}');
    expect(await generateStructured(ai, ["m1", "m2"], msgs, Schema, { name: "x" })).toEqual({ value: { answer: 1 }, model: "m1", attempts: 1 });
  });

  it("retries once with the validation error, then escalates", async () => {
    const seen: { model: string; last: string }[] = [];
    const ai = new FakeAI(
      () => ({}),
      (model, req) => {
        seen.push({ model, last: req.messages.at(-1)!.content });
        return model === "m2" && seen.length === 4 ? '{"answer": 5}' : '{"answer": "nope"}';
      },
    );
    const res = await generateStructured(ai, ["m1", "m2"], msgs, Schema, { name: "x" });
    expect(res).toEqual({ value: { answer: 5 }, model: "m2", attempts: 4 });
    expect(seen.map((s) => s.model)).toEqual(["m1", "m1", "m2", "m2"]);
    expect(seen[1].last).toMatch(/invalid/);
  });

  it("gives up (null) when every model fails, so callers fall back to FYI", async () => {
    const ai = new FakeAI(() => ({}), () => "not json");
    expect(await generateStructured(ai, ["m1", "m2"], msgs, Schema, { name: "x" })).toBeNull();
  });

  it("treats a thrown model error like invalid output", async () => {
    let n = 0;
    const ai = new FakeAI(() => ({}), () => {
      if (n++ === 0) throw new Error("capacity");
      return '{"answer": 9}';
    });
    expect((await generateStructured(ai, ["m1"], msgs, Schema, { name: "x" }))?.value).toEqual({ answer: 9 });
  });
});
