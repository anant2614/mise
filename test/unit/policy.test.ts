import { describe, expect, it } from "vitest";
import { authorize, shouldOfferPromotion, tierOf } from "../../src/core/policy";

const base = { approvedByUser: false, autonomy: {} };

describe("autonomy tiers (FR-17, PRD §6.3)", () => {
  it("lets free and reversible actions run automatically", () => {
    expect(authorize("create_draft", base)).toMatchObject({ allow: true, approvedBy: "auto", tier: "free" });
    expect(authorize("create_event", base)).toMatchObject({ allow: true, tier: "reversible" });
  });

  it("requires approval for outward-facing actions", () => {
    expect(authorize("send_draft", { ...base, recipientsKnown: true })).toMatchObject({ allow: false, needsApproval: true });
    expect(authorize("respond_to_invite", base)).toMatchObject({ allow: false, needsApproval: true });
    expect(authorize("send_draft", { ...base, approvedByUser: true, recipientsKnown: true })).toMatchObject({ allow: true, approvedBy: "user" });
  });

  it("honors per-action-type autonomy, except for suspicious sources", () => {
    const autonomy = { "send_draft:reply_needed": true };
    expect(authorize("send_draft", { ...base, autonomy, autonomyKey: "send_draft:reply_needed", recipientsKnown: true })).toMatchObject({ allow: true, approvedBy: "auto" });
    expect(authorize("send_draft", { ...base, autonomy, autonomyKey: "send_draft:schedule_meeting", recipientsKnown: true }).allow).toBe(false);
    expect(authorize("send_draft", { ...base, autonomy, autonomyKey: "send_draft:reply_needed", recipientsKnown: true, sourceSuspicious: true }).allow).toBe(false);
  });

  it("never sends to a recipient who is not on the thread, even with approval", () => {
    const d = authorize("send_draft", { ...base, approvedByUser: true, recipientsKnown: false });
    expect(d).toMatchObject({ allow: false, needsApproval: false });
  });

  it("blocks forwarding, deletion, payments and unknown tools outright", () => {
    for (const tool of ["forward_email", "delete_email", "make_payment", "send_email", "exfiltrate"]) {
      expect(tierOf(tool)).toBe("blocked");
      expect(authorize(tool, { ...base, approvedByUser: true })).toMatchObject({ allow: false, needsApproval: false });
    }
  });

  it("holds reversible actions from suspicious sources for approval", () => {
    expect(authorize("create_event", { ...base, sourceSuspicious: true })).toMatchObject({ allow: false, needsApproval: true });
  });

  it("offers promotion after N clean approvals in a row", () => {
    expect(shouldOfferPromotion(["approved", "approved", "approved"], 3)).toBe(true);
    expect(shouldOfferPromotion(["approved", "edited", "approved"], 3)).toBe(false);
    expect(shouldOfferPromotion(["approved"], 3)).toBe(false);
  });
});
