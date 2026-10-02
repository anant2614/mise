import { describe, expect, it } from "vitest";
import { classifyEdit, normalizedEditDistance, sentenceDiff } from "../../src/core/learning";

describe("draft-diff learning (FR-24)", () => {
  it("measures word-level edit distance", () => {
    expect(normalizedEditDistance("a b c", "a b c")).toBe(0);
    expect(normalizedEditDistance("a b c d", "a b x d")).toBe(0.25);
    expect(normalizedEditDistance("", "")).toBe(0);
  });

  it("classifies sent-as-is vs edited", () => {
    expect(classifyEdit("Hi Sam,\nYes that works.", "Hi Sam, yes that works.").signal).toBe("approved");
    expect(classifyEdit("Hi Sam, hope you're well. Yes that works.", "Yes, works.").signal).toBe("edited");
  });

  it("summarizes edits by sentence", () => {
    expect(sentenceDiff("Hope you're well. Yes that works.", "Yes that works. Cheers")).toBe("- Hope you're well.\n+ Cheers");
  });
});
