import { describe, expect, it } from "vitest";
import { adminReasonSchema, blockSchema, decideSchema } from "@/modules/admin/schemas";
import { emailForTemplate } from "@/modules/billing/schemas";
import { incidentSchema, raiseIncidentSchema, raiseTicketSchema } from "@/modules/support/schemas";

const ORDER = "11111111-1111-4111-8111-111111111111";
const TENDER = "22222222-2222-4222-8222-222222222222";

describe("raising an incident", () => {
  it("needs exactly one reference", () => {
    const description = "The goods arrived damaged";
    expect(raiseIncidentSchema.safeParse({ description }).success).toBe(false);
    expect(raiseIncidentSchema.safeParse({ orderId: ORDER, description }).success).toBe(true);
    expect(
      raiseIncidentSchema.safeParse({ orderId: ORDER, tenderId: TENDER, description }).success,
    ).toBe(false);
  });

  it("needs a real description", () => {
    expect(raiseIncidentSchema.safeParse({ orderId: ORDER, description: "bad" }).success).toBe(
      false,
    );
  });

  it("refuses a named party, since the server works it out", () => {
    expect(
      raiseIncidentSchema.safeParse({
        orderId: ORDER,
        description: "Damaged goods",
        againstOrgId: ORDER,
      }).success,
    ).toBe(false);
  });
});

describe("tickets", () => {
  it("needs a known topic", () => {
    const description = "I cannot download my invoice";
    expect(raiseTicketSchema.safeParse({ type: "payment", description }).success).toBe(true);
    expect(raiseTicketSchema.safeParse({ type: "refund", description }).success).toBe(false);
  });
});

describe("admin inputs", () => {
  it("always needs a reason", () => {
    expect(adminReasonSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(adminReasonSchema.safeParse({ reason: "Fraud report" }).success).toBe(true);
  });

  it("blocks for 1 to 3,650 days, or permanently", () => {
    expect(blockSchema.safeParse({ days: null, reason: "Repeated fraud" }).success).toBe(true);
    expect(blockSchema.safeParse({ days: 30, reason: "Late deliveries" }).success).toBe(true);
    expect(blockSchema.safeParse({ days: 0, reason: "Late deliveries" }).success).toBe(false);
    expect(blockSchema.safeParse({ days: 1.5, reason: "Late deliveries" }).success).toBe(false);
  });

  it("needs a decision and a reason to decide an incident", () => {
    expect(decideSchema.safeParse({ decision: "Refund", close: true, reason: "" }).success).toBe(
      false,
    );
    expect(
      decideSchema.safeParse({ decision: "Refund", close: true, reason: "Agreed" }).success,
    ).toBe(true);
  });
});

describe("incident view", () => {
  it("has no field for the other party's identity outside support", () => {
    const shape = Object.keys(incidentSchema.shape);
    expect(shape).not.toContain("againstOrgId");
    expect(shape).not.toContain("raisedByOrgId");
  });
});

describe("support emails", () => {
  it("names the reference, not a payment", () => {
    expect(emailForTemplate("support_update", { refNo: "BM/26/INC/00001" }).subject).toBe(
      "Update on BM/26/INC/00001",
    );
  });

  it("tells a suspended account what happened", () => {
    expect(emailForTemplate("account_update", { status: "suspended" }).subject).toContain(
      "suspended",
    );
  });
});
