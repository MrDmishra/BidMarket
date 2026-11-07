import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

const percentToBps = (label: string) =>
  z
    .string()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, `Enter ${label} as a percentage, such as 18.`)
    .transform((value) => Number(rupeesToPaise(value)))
    .refine((bps) => bps <= 10_000, `${label} cannot be above 100%.`);

const rupees = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 25000.")
  .transform((value) => rupeesToPaise(value));

export const settingsSchema = z.object({
  directFee: percentToBps("Direct order fee"),
  tenderFee: percentToBps("Tender fee"),
  gst: percentToBps("GST"),
  tds: percentToBps("TDS"),
  subscriptionBase: rupees,
  subscriptionStep: rupees,
  launchOfferSellers: z.coerce.number().int("Enter a whole number.").min(0),
  launchOffer: percentToBps("Launch discount"),
  reason: z.string().trim().min(3, "Say why you are changing these settings."),
});

export const quoteSchema = z.object({
  turnoverPaise: z.number().int(),
  feePaise: z.number().int(),
  gstPaise: z.number().int(),
  free: z.boolean(),
  offerBps: z.number().int(),
});

export const checkoutResultSchema = z.object({
  status: z.string(),
  amountPaise: z.number().int(),
  paymentId: z.string().optional(),
  providerOrderId: z.string().nullable().optional(),
});

export const invoiceSnapshotSchema = z.object({
  supplierName: z.string(),
  supplierGstin: z.string().nullable(),
  supplierStateCode: z.string(),
  customerName: z.string(),
  customerGstin: z.string().nullable(),
  customerStateCode: z.string(),
  customerAddress: z.string(),
  kind: z.string(),
  feePaise: z.number().int(),
  cgstPaise: z.number().int(),
  sgstPaise: z.number().int(),
  igstPaise: z.number().int(),
  tdsPaise: z.number().int(),
  totalPaise: z.number().int(),
});

/** Only the fields billing needs. Razorpay events carry much more. */
export const razorpayEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string().nullable(),
        amount: z.number().int(),
        error_description: z.string().nullable().optional(),
      }),
    }),
  }),
});

export function emailForTemplate(template: string, payload: unknown) {
  const details = z.object({ endsOn: z.string() }).safeParse(payload);
  const order = z.object({ orderNo: z.string() }).safeParse(payload);
  if (template === "order_update" && order.success) {
    return {
      subject: `Update on order ${order.data.orderNo}`,
      text: `There is an update on order ${order.data.orderNo}. Log in to Bid Market to see it.`,
    };
  }
  const tender = z.object({ tenderNo: z.string() }).safeParse(payload);
  if (template === "tender_update" && tender.success) {
    return {
      subject: `Update on tender ${tender.data.tenderNo}`,
      text: `There is an update on tender ${tender.data.tenderNo}. Log in to Bid Market to see it.`,
    };
  }
  if (template === "subscription_expiring" && details.success) {
    return {
      subject: "Your Bid Market subscription is ending",
      text: `Your subscription ends on ${details.data.endsOn}. Renew it from Billing to keep your products listed.`,
    };
  }
  return {
    subject: "Bid Market payment received",
    text: "We received your payment. Your tax invoice is in Billing.",
  };
}
