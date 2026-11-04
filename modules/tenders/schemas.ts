import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const wholeNumber = (minimum: number, maximum: number, message: string) =>
  z.coerce.number().int(message).min(minimum, message).max(maximum, message);

const amount = z
  .string()
  .trim()
  .regex(AMOUNT, "Enter an amount such as 1250.50.")
  .transform((value) => rupeesToPaise(value))
  .refine((paise) => paise > 0, "Enter an amount above zero.");

export const createTenderSchema = z
  .strictObject({
    kind: z.enum(["regular", "custom"]),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    title: z.string().trim().max(160).optional(),
    unit: z.string().trim().max(20).optional(),
    estimateUnit: z.string().trim().optional(),
    specs: z
      .array(z.object({ label: z.string().trim().max(60), value: z.string().trim().max(120) }))
      .max(20)
      .optional(),
    quantity: z
      .string()
      .trim()
      .regex(/^\d{1,11}(\.\d{1,3})?$/, "Enter a quantity such as 20."),
    paymentTerms: z.enum(["advance", "on_delivery", "credit"]),
    creditDays: z
      .string()
      .trim()
      .regex(/^\d{0,3}$/, "Enter the number of days."),
    consigneeName: z.string().trim().min(2, "Enter who will receive the goods.").max(120),
    consigneeGstin: z.string().trim().toUpperCase().regex(GSTIN, "Check the GSTIN."),
    consigneeAddressId: z.uuid("Choose a delivery address."),
    contractMonths: wholeNumber(1, 60, "Enter a contract period of 1 to 60 months."),
    bidEndsAt: z.string().regex(LOCAL_DATE_TIME, "Choose when bidding ends."),
    minBids: wholeNumber(1, 50, "Enter at least 1 bid."),
    extensionsAllowed: wholeNumber(0, 5, "Enter 0 to 5 extensions."),
    extensionHours: wholeNumber(1, 168, "Enter 1 to 168 hours."),
  })
  .superRefine((value, context) => {
    if (value.paymentTerms === "credit" && Number(value.creditDays) <= 0) {
      context.addIssue({ code: "custom", path: ["creditDays"], message: "Enter the credit days." });
    }
    if (value.kind === "regular" && !z.uuid().safeParse(value.productId).success) {
      context.addIssue({ code: "custom", path: ["productId"], message: "Choose a product." });
    }
    if (value.kind === "custom") {
      if (!z.uuid().safeParse(value.categoryId).success) {
        context.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category." });
      }
      if (!value.title) {
        context.addIssue({ code: "custom", path: ["title"], message: "Enter what you need." });
      }
      if (!value.unit) {
        context.addIssue({ code: "custom", path: ["unit"], message: "Enter the unit." });
      }
      if (!amount.safeParse(value.estimateUnit ?? "").success) {
        context.addIssue({
          code: "custom",
          path: ["estimateUnit"],
          message: "Enter an estimated unit price.",
        });
      }
    }
  });

export const reasonSchema = z.strictObject({
  reason: z.string().trim().min(3, "Give a short reason.").max(300),
});
export const bidSchema = z.strictObject({ unitPrice: amount });
export const awardSchema = z.strictObject({ rank: z.number().int().min(1) });

/** Tender times are entered in India time. */
export const toIndiaTimestamp = (localDateTime: string) =>
  new Date(`${localDateTime}:00+05:30`).toISOString();

export const estimateToPaise = (value: string) => amount.parse(value);

const specs = z.array(
  z.object({ label: z.string(), value: z.string(), unit: z.string().nullable() }),
);
const charge = z.object({
  id: z.string(),
  status: z.string(),
  feePaise: z.number().int(),
  gstPaise: z.number().int(),
  totalPaise: z.number().int(),
});
const terms = z.enum(["advance", "on_delivery", "credit"]);

export const publicTenderSchema = z.object({
  id: z.string(),
  tenderNo: z.string(),
  title: z.string(),
  categoryName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  deliveryStateCode: z.string(),
  bidEndsAt: z.string(),
  contractMonths: z.number().int(),
  paymentTerms: terms,
  creditDays: z.number().int().nullable(),
  specs,
});

export const buyerTenderSchema = z.object({
  id: z.string(),
  tenderNo: z.string(),
  title: z.string(),
  kind: z.enum(["regular", "custom"]),
  status: z.enum([
    "draft",
    "unpaid",
    "bidding",
    "evaluating",
    "shortlisting",
    "auction_scheduled",
    "auction",
    "awarding",
    "ordered",
    "cancelled",
  ]),
  quantity: z.number(),
  unit: z.string(),
  estimateUnitPaise: z.number().int(),
  estimateTotalPaise: z.number().int(),
  bidEndsAt: z.string(),
  minBids: z.number().int(),
  extensionsUsed: z.number().int(),
  extensionsAllowed: z.number().int(),
  cancelReason: z.string().nullable(),
  consigneeName: z.string(),
  contractMonths: z.number().int(),
  specs,
  charge: charge.extend({ kind: z.string() }).nullable(),
  orderId: z.string().nullable(),
  awardStatus: z.string().nullable(),
});
export type BuyerTender = z.infer<typeof buyerTenderSchema>;

export const sellerTenderSchema = z.object({
  id: z.string(),
  tenderNo: z.string(),
  title: z.string(),
  open: z.boolean(),
  quantity: z.number(),
  unit: z.string(),
  deliveryStateCode: z.string(),
  bidEndsAt: z.string(),
  contractMonths: z.number().int(),
  paymentTerms: terms,
  creditDays: z.number().int().nullable(),
  eligible: z.boolean(),
  attemptsUsed: z.number().int(),
  myBidPaise: z.number().int().nullable(),
  specs,
  award: z
    .object({
      status: z.string(),
      unitPaise: z.number().int(),
      totalPaise: z.number().int(),
      expiresAt: z.string().nullable(),
    })
    .nullable(),
  charge: charge.nullable(),
  orderId: z.string().nullable(),
});
export type SellerTender = z.infer<typeof sellerTenderSchema>;
