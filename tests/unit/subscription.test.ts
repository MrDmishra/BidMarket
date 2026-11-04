import { describe, expect, it } from "vitest";
import { subscriptionFeePaise } from "@/modules/billing/fee-schedule";

describe("subscriptionFeePaise", () => {
  it.each([
    [0, 2_500_000],
    [25, 2_500_000],
    [25.5, 2_500_000],
    [26, 2_510_000],
    [40, 2_650_000],
  ])("charges correctly at ₹%d crore", (crore, paise) => {
    expect(subscriptionFeePaise(crore)).toBe(paise);
  });

  it("rejects invalid turnover", () => {
    expect(() => subscriptionFeePaise(-1)).toThrow(RangeError);
    expect(() => subscriptionFeePaise(Number.NaN)).toThrow(RangeError);
  });
});
