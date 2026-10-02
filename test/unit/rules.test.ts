import { describe, expect, it } from "vitest";
import { applyRules } from "../../src/core/rules";
import { email } from "../helpers/fakes";

const USER = "anant@example.com";

describe("rules pre-filter (FR-5)", () => {
  it("skips spam, trash and drafts", () => {
    expect(applyRules(email({ from: "x@y.com", body: "hi", labelIds: ["SPAM"] }), USER).action).toBe("skip");
    expect(applyRules(email({ from: "x@y.com", body: "hi", labelIds: ["DRAFT"] }), USER).action).toBe("skip");
  });

  it("routes the user's own mail to sent handling", () => {
    expect(applyRules(email({ from: USER, body: "hi", labelIds: ["SENT"] }), USER).action).toBe("sent");
  });

  it("does not trust a forged From: the user without the SENT label", () => {
    expect(applyRules(email({ from: "Anant@Example.com", body: "hi", labelIds: ["INBOX"] }), USER).action).toBe("triage");
  });

  it("ignores newsletters by List-Unsubscribe, category and precedence without a model call", () => {
    const n1 = applyRules(email({ from: "news@shop.com", body: "sale", headers: { "list-unsubscribe": "<mailto:u@shop.com>" } }), USER);
    expect(n1).toMatchObject({ action: "bucket", bucket: "ignore", newsletter: true });
    const n2 = applyRules(email({ from: "a@b.com", body: "x", labelIds: ["INBOX", "CATEGORY_PROMOTIONS"] }), USER);
    expect(n2).toMatchObject({ action: "bucket", bucket: "ignore" });
    const n3 = applyRules(email({ from: "a@b.com", body: "x", headers: { precedence: "bulk" } }), USER);
    expect(n3).toMatchObject({ action: "bucket", bucket: "ignore" });
  });

  it("marks automated senders as FYI", () => {
    expect(applyRules(email({ from: "no-reply@github.com", body: "x" }), USER)).toMatchObject({ action: "bucket", bucket: "fyi" });
    expect(applyRules(email({ from: "notifications+abc@service.io", body: "x" }), USER)).toMatchObject({ bucket: "fyi" });
    expect(applyRules(email({ from: "bot@x.io", body: "x", headers: { "auto-submitted": "auto-generated" } }), USER)).toMatchObject({ bucket: "fyi" });
  });

  it("still triages automated senders that carry work, VIPs and personal mail", () => {
    expect(applyRules(email({ from: "calendar-notification@google.com", body: "Invitation" }), USER).action).toBe("triage");
    expect(applyRules(email({ from: "priya@acme.com", body: "Can you review?" }), USER)).toMatchObject({ action: "triage", vip: false });
    const vip = applyRules(email({ from: "ceo@acme.com", body: "x", headers: { "list-id": "x" } }), USER, ["CEO@acme.com"]);
    expect(vip).toMatchObject({ action: "triage", vip: true });
  });
});
