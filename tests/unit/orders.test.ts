import { describe, expect, it } from "vitest";
import { createOrderSchema, dispatchSchema, orderQuoteSchema } from "@/modules/orders/schemas";
import { buildInvoiceDocument, buildOrderDocument } from "@/modules/documents/order-documents";
import { formatPdfAmount, renderPdf } from "@/modules/documents/pdf";

const productId = "11111111-1111-4111-8111-111111111111";
const order = {
  productId,
  quantity: "20",
  expectedDeliveryOn: "2026-12-01",
  consigneeName: "Plant Stores",
  consigneeGstin: "",
  deliveryAddressId: "22222222-2222-4222-8222-222222222222",
  paymentTerms: "advance",
  creditDays: "",
};

describe("createOrderSchema", () => {
  it("accepts a valid order", () => {
    expect(createOrderSchema.safeParse(order).success).toBe(true);
  });

  it("rejects any price sent by the client", () => {
    expect(createOrderSchema.safeParse({ ...order, unitPaise: 1 }).success).toBe(false);
  });

  it("needs credit days for credit terms", () => {
    expect(createOrderSchema.safeParse({ ...order, paymentTerms: "credit" }).success).toBe(false);
    expect(
      createOrderSchema.safeParse({ ...order, paymentTerms: "credit", creditDays: "30" }).success,
    ).toBe(true);
  });

  it("rejects a malformed GSTIN", () => {
    expect(createOrderSchema.safeParse({ ...order, consigneeGstin: "ABC" }).success).toBe(false);
  });
});

describe("order inputs", () => {
  it("limits quantity to three decimals", () => {
    expect(orderQuoteSchema.safeParse({ productId, quantity: "1.2345" }).success).toBe(false);
    expect(orderQuoteSchema.safeParse({ productId, quantity: "1.234" }).success).toBe(true);
  });

  it("needs a product bill to dispatch", () => {
    expect(dispatchSchema.safeParse({ ewayBill: {}, transportBill: {} }).success).toBe(false);
  });
});

const facts = {
  orderNo: "BMO-26-000001",
  title: "Brass valve",
  unit: "pc",
  quantity: 2,
  unitPaise: 90000,
  totalPaise: 180000,
  paymentTerms: "credit",
  creditDays: 30,
  expectedDeliveryOn: "2026-12-01",
  consigneeName: "Plant Stores",
  deliveryAddress: "1 Road, Jaipur",
  specs: [{ label: "Material", value: "Brass", unit: null }],
  events: [{ status: "accepted", createdAt: "2026-11-05T00:00:00Z" }],
};
const party = { legalName: "Company", gstin: null, address: "Road" };
const parties = { buyer: party, seller: party };

describe("order documents", () => {
  it("prints amounts without the rupee sign, which PDF fonts lack", () => {
    expect(formatPdfAmount(180050)).toBe("INR 1,800.50");
  });

  it("states the credit terms in the contract", () => {
    const content = buildOrderDocument("contract", facts, parties);
    const terms = content.sections.find((section) => section.heading === "Terms");
    expect(terms?.rows[0]).toEqual(["Payment terms", "Credit, 30 days"]);
  });

  it("marks an invoice without a GSTIN as a test record", () => {
    const snapshot = {
      supplierName: "Bid Market",
      supplierGstin: null,
      customerName: "Buyer",
      customerGstin: null,
      customerAddress: "Road",
      customerStateCode: "08",
      feePaise: 100,
      cgstPaise: 9,
      sgstPaise: 9,
      igstPaise: 0,
      tdsPaise: 0,
      totalPaise: 118,
    };
    const content = buildInvoiceDocument({ invoice_no: "BM/1", issued_at: "2026-11-05", snapshot });
    expect(content.notes?.[0]).toContain("Test record");
  });

  it("renders a real PDF file", async () => {
    const pdf = await renderPdf(buildOrderDocument("acceptance_report", facts, parties));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
