import { describe, expect, it } from "vitest";
import {
  auctionBidSchema,
  bidSchema,
  buyerAuctionSchema,
  createTenderSchema,
  sellerTenderSchema,
  shortlistSchema,
  toIndiaTimestamp,
} from "@/modules/tenders/schemas";

const regular = {
  type: "bid",
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

describe("reverse auction inputs", () => {
  it("needs both auction times", () => {
    const auction = { ...regular, type: "ra", bidEndsAt: undefined };
    expect(createTenderSchema.safeParse(auction).success).toBe(false);
    expect(
      createTenderSchema.safeParse({
        ...auction,
        raStartsAt: "2026-11-10T11:00",
        raEndsAt: "2026-11-10T12:00",
      }).success,
    ).toBe(true);
  });

  it("needs a whole paise bid and a key", () => {
    const bid = { unitPaise: 89550, bidKey: "11111111-1111-4111-8111-111111111111" };
    expect(auctionBidSchema.safeParse(bid).success).toBe(true);
    expect(auctionBidSchema.safeParse({ ...bid, unitPaise: 895.5 }).success).toBe(false);
    expect(auctionBidSchema.safeParse({ unitPaise: 89550 }).success).toBe(false);
  });

  it("has no price field in the buyer's live view", () => {
    const fields = Object.keys(buyerAuctionSchema.shape).join(" ");
    expect(fields).not.toMatch(/paise|l1|price/i);
  });

  it("drops any price that reaches the buyer's live view", () => {
    const view = buyerAuctionSchema.parse({
      status: "auction",
      bidCount: 2,
      startsAt: "2026-11-10T11:00:00Z",
      endsAt: "2026-11-10T12:00:00Z",
      seq: 2,
      paused: false,
      serverNow: "2026-11-10T11:30:00Z",
      l1Paise: 89550,
    });
    expect(view).not.toHaveProperty("l1Paise");
  });
});

describe("Bid to RA inputs", () => {
  const combined = {
    ...regular,
    type: "bid_to_ra",
    raStartsAt: "2026-11-10T20:00",
    raEndsAt: "2026-11-10T21:00",
  };

  it("needs the sealed deadline and both auction times", () => {
    expect(createTenderSchema.safeParse(combined).success).toBe(true);
    expect(createTenderSchema.safeParse({ ...combined, bidEndsAt: undefined }).success).toBe(false);
    expect(createTenderSchema.safeParse({ ...combined, raStartsAt: undefined }).success).toBe(
      false,
    );
    expect(createTenderSchema.safeParse({ ...combined, raEndsAt: undefined }).success).toBe(false);
  });

  it("accepts only the two shortlist choices", () => {
    expect(shortlistSchema.safeParse({ mode: "highest" }).success).toBe(true);
    expect(shortlistSchema.safeParse({ mode: "highest50" }).success).toBe(true);
    expect(shortlistSchema.safeParse({ mode: "lowest" }).success).toBe(false);
    expect(shortlistSchema.safeParse({ mode: "highest", sellerIds: ["x"] }).success).toBe(false);
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
