import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidRazorpaySignature } from "@/lib/providers/razorpay-signature";
import {
  checkoutResultSchema,
  emailForTemplate,
  razorpayEventSchema,
  settingsSchema,
} from "@/modules/billing/schemas";
import { PROPOSED_FEES, subscriptionFeePaise } from "@/modules/billing/fee-schedule";

const body = '{"event":"payment.captured"}';
const signature = createHmac("sha256", "secret").update(body).digest("hex");

describe("isValidRazorpaySignature", () => {
  it("accepts the exact body", () => {
    expect(isValidRazorpaySignature(body, signature, "secret")).toBe(true);
  });

  it("rejects a changed body, a wrong secret and a short signature", () => {
    expect(isValidRazorpaySignature(`${body} `, signature, "secret")).toBe(false);
    expect(isValidRazorpaySignature(body, signature, "other")).toBe(false);
    expect(isValidRazorpaySignature(body, "abc", "secret")).toBe(false);
  });
});

describe("razorpayEventSchema", () => {
  it("reads the payment fields", () => {
    const event = razorpayEventSchema.parse({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 100 } } },
    });
    expect(event.payload.payment.entity.order_id).toBe("order_1");
  });

  it("rejects an amount that is not whole paise", () => {
    const entity = { id: "pay_1", order_id: "order_1", amount: 10.5 };
    expect(() =>
      razorpayEventSchema.parse({ event: "x", payload: { payment: { entity } } }),
    ).toThrow();
  });
});

describe("settingsSchema", () => {
  const settings = {
    directFee: "0.1",
    tenderFee: "0.5",
    gst: "18",
    tds: "0",
    subscriptionBase: "25000",
    subscriptionStep: "100",
    launchOfferSellers: "100",
    launchOffer: "50",
    reason: "Launch offer",
  };

  it("converts percentages to basis points and rupees to paise", () => {
    const result = settingsSchema.parse(settings);
    expect(result.directFee).toBe(10);
    expect(result.gst).toBe(1800);
    expect(result.subscriptionBase).toBe(2_500_000);
    expect(result.launchOfferSellers).toBe(100);
    expect(result.launchOffer).toBe(5000);
  });

  it("rejects a rate above 100% and a missing reason", () => {
    expect(settingsSchema.safeParse({ ...settings, gst: "101" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, reason: " " }).success).toBe(false);
  });
});

describe("billing helpers", () => {
  it("uses the supplied fee schedule", () => {
    const fees = { ...PROPOSED_FEES, subscriptionBasePaise: 100 };
    expect(subscriptionFeePaise(1, fees)).toBe(100);
  });

  it("accepts a checkout that is already paid", () => {
    expect(checkoutResultSchema.parse({ status: "paid", amountPaise: 0 }).status).toBe("paid");
  });

  it("writes an expiry email with the end date", () => {
    expect(emailForTemplate("subscription_expiring", { endsOn: "2027-01-01" }).text).toContain(
      "2027-01-01",
    );
  });
});
