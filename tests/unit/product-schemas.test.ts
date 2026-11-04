import { describe, expect, it } from "vitest";
import { commercialsSchema, productReviewSchema, productSchema } from "@/modules/catalogue/schemas";

const product = {
  categoryId: "11111111-1111-4111-8111-111111111111",
  title: "Brass ball valve",
  description: "",
  mrp: "780.50",
  discount: "15",
  stock: "10",
  unit: "pc",
  states: ["08"],
  specs: {},
};

describe("productSchema", () => {
  it("converts money and percentages without floats", () => {
    const parsed = productSchema.parse(product);
    expect(parsed.mrp).toBe(78_050);
    expect(parsed.discount).toBe(1_500);
  });

  it("requires the minimum discount", () => {
    expect(productSchema.safeParse({ ...product, discount: "9.99" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, discount: "10" }).success).toBe(true);
    expect(productSchema.safeParse({ ...product, discount: "91" }).success).toBe(false);
  });

  it("requires a state and a valid price", () => {
    expect(productSchema.safeParse({ ...product, states: [] }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, mrp: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, mrp: "12.345" }).success).toBe(false);
  });

  it("ignores status and seller values sent by the client", () => {
    const parsed = productSchema.parse({ ...product, status: "published", sellerOrgId: "x" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("sellerOrgId");
  });
});

describe("other product schemas", () => {
  it("checks commercial updates", () => {
    expect(commercialsSchema.safeParse({ mrp: "100", discount: "5", stock: "1" }).success).toBe(
      false,
    );
  });

  it("limits review decisions", () => {
    expect(productReviewSchema.safeParse({ decision: "published", note: "Clear" }).success).toBe(
      true,
    );
    expect(productReviewSchema.safeParse({ decision: "pending", note: "Clear" }).success).toBe(
      false,
    );
    expect(productReviewSchema.safeParse({ decision: "rejected", note: "" }).success).toBe(false);
  });
});
