import { describe, expect, it } from "vitest";
import {
  bidSchema,
  createTenderSchema,
  sellerTenderSchema,
  toIndiaTimestamp,
} from "@/modules/tenders/schemas";

const regular = {
  kind: "regular",
  productId: "11111111-1111-4111-8111-111111111111",
  quantity: "100",
  paymentTerms: "advance",
  creditDays: "",
  consigneeName: "Plant Stores",
  consigneeGstin: "08AABCN1234F1Z5",
  consigneeAddressId: "22222222-2222-4222-8222-222222222222",
  contractMonths: "12",
  bidEndsAt: "2026-11-10T18:00",
  minBids: "3",
  extensionsAllowed: "1",
  extensionHours: "24",
};

describe("createTenderSchema", () => {
  it("accepts a regular tender", () => {
    expect(createTenderSchema.safeParse(regular).success).toBe(true);
  });

  it("checks the consignee GSTIN", () => {
    expect(createTenderSchema.safeParse({ ...regular, consigneeGstin: "ABC" }).success).toBe(false);
  });

  it("rejects a price sent for a regular tender", () => {
    expect(createTenderSchema.safeParse({ ...regular, unitPaise: 1 }).success).toBe(false);
  });

  it("needs details for a custom tender", () => {
    const custom = { ...regular, kind: "custom", productId: undefined };
    expect(createTenderSchema.safeParse(custom).success).toBe(false);
    expect(
      createTenderSchema.safeParse({
        ...custom,
        categoryId: "33333333-3333-4333-8333-333333333333",
        title: "Valves",
        unit: "pc",
        estimateUnit: "900",
      }).success,
    ).toBe(true);
  });
});

describe("tender helpers", () => {
  it("reads entered times as India time", () => {
    expect(toIndiaTimestamp("2026-11-10T18:00")).toBe("2026-11-10T12:30:00.000Z");
  });

  it("turns a bid into whole paise", () => {
    expect(bidSchema.parse({ unitPrice: "1250.50" }).unitPrice).toBe(125050);
  });

  it("rejects a bid of zero", () => {
    expect(bidSchema.safeParse({ unitPrice: "0" }).success).toBe(false);
  });

  it("has no field for rival sellers in a seller's view", () => {
    expect(Object.keys(sellerTenderSchema.shape)).not.toContain("bids");
    expect(Object.keys(sellerTenderSchema.shape)).not.toContain("bidCount");
  });
});
