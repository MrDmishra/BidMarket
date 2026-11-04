import { z } from "zod";

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const QUANTITY = /^\d{1,11}(\.\d{1,3})?$/;

const quantity = z.string().trim().regex(QUANTITY, "Enter a quantity such as 20 or 2.5.");

export const orderQuoteSchema = z.strictObject({ productId: z.uuid(), quantity });

export const createOrderSchema = z
  .strictObject({
    productId: z.uuid(),
    quantity,
    expectedDeliveryOn: z.iso.date("Choose a delivery date."),
    consigneeName: z.string().trim().min(2, "Enter who will receive the goods.").max(120),
    consigneeGstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value === "" || GSTIN.test(value), "Check the GSTIN."),
    deliveryAddressId: z.uuid("Choose a delivery address."),
    paymentTerms: z.enum(["advance", "on_delivery", "credit"]),
    creditDays: z
      .string()
      .trim()
      .regex(/^\d{0,3}$/, "Enter the number of days."),
  })
  .refine((value) => value.paymentTerms !== "credit" || Number(value.creditDays) > 0, {
    path: ["creditDays"],
    message: "Enter the credit days.",
  });

export const orderReasonSchema = z.strictObject({
  reason: z.string().trim().min(3, "Give a short reason.").max(300),
});

const dispatchDocument = z.object({
  fileId: z.uuid().optional(),
  referenceNo: z.string().trim().max(60).optional(),
  notApplicableReason: z.string().trim().max(200).optional(),
});

export const dispatchSchema = z.strictObject({
  productBillFileId: z.uuid("Upload the product bill."),
  ewayBill: dispatchDocument,
  transportBill: dispatchDocument,
});

export const receiveSchema = z.strictObject({ fileId: z.uuid("Upload a delivery photo.") });

export const orderQuoteResultSchema = z.object({
  valuePaise: z.number().int(),
  feePaise: z.number().int(),
  gstPaise: z.number().int(),
  limitPaise: z.number().int(),
});

export const createdOrderSchema = z.object({ orderId: z.string(), chargeId: z.string() });

const orderStatus = z.enum([
  "unpaid",
  "awaiting_seller",
  "accepted",
  "dispatched",
  "completed",
  "cancelled",
]);

export const orderDetailSchema = z.object({
  id: z.string(),
  orderNo: z.string(),
  side: z.enum(["buyer", "seller", "admin"]),
  status: orderStatus,
  title: z.string(),
  unit: z.string(),
  quantity: z.number(),
  unitPaise: z.number().int(),
  totalPaise: z.number().int(),
  specs: z.array(z.object({ label: z.string(), value: z.string(), unit: z.string().nullable() })),
  paymentTerms: z.enum(["advance", "on_delivery", "credit"]),
  creditDays: z.number().int().nullable(),
  expectedDeliveryOn: z.string().nullable(),
  createdAt: z.string(),
  deliveryCity: z.string(),
  deliveryStateCode: z.string(),
  consigneeName: z.string().nullable(),
  consigneeGstin: z.string().nullable(),
  deliveryAddress: z.string().nullable(),
  contactsUnlocked: z.boolean(),
  charge: z
    .object({
      id: z.string(),
      status: z.string(),
      feePaise: z.number().int(),
      gstPaise: z.number().int(),
      totalPaise: z.number().int(),
    })
    .nullable(),
  events: z.array(
    z.object({ status: orderStatus, note: z.string().nullable(), createdAt: z.string() }),
  ),
  documents: z.array(
    z.object({
      kind: z.string(),
      referenceNo: z.string().nullable(),
      notApplicableReason: z.string().nullable(),
      path: z.string().nullable(),
      scanStatus: z.string().nullable(),
      readable: z.boolean().nullable(),
    }),
  ),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderContactsSchema = z.object({
  legalName: z.string(),
  gstin: z.string().nullable(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string(),
});

export type OrderContacts = z.infer<typeof orderContactsSchema>;
