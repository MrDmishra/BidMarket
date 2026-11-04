import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { logger } from "@/lib/logger";
import { isValidRazorpaySignature } from "@/lib/providers/razorpay-signature";
import { createServiceClient } from "@/lib/supabase/service";
import { razorpayEventSchema } from "@/modules/billing/schemas";

const HANDLED_EVENTS = new Set(["payment.captured", "payment.failed", "order.paid"]);

function signatureMatches(rawBody: string, signature: string) {
  const env = getServerEnv();
  const secrets = [env.RAZORPAY_WEBHOOK_SECRET, env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS];
  return secrets.some((secret) => secret && isValidRazorpaySignature(rawBody, signature, secret));
}

export async function handleRazorpayWebhook(rawBody: string, signature: string, eventId: string) {
  if (!signature || !eventId || !signatureMatches(rawBody, signature)) {
    throw new AppError("VALIDATION_FAILED");
  }
  const parsed: unknown = JSON.parse(rawBody);
  const type = (parsed as { event?: unknown }).event;
  if (typeof type !== "string" || !HANDLED_EVENTS.has(type)) return "ignored";

  const { event, payload } = razorpayEventSchema.parse(parsed);
  const payment = payload.payment.entity;
  if (!payment.order_id) return "ignored";

  const { data, error } = await createServiceClient().rpc("apply_payment_event", {
    p_event_id: eventId,
    p_event_type: event,
    p_provider_order_id: payment.order_id,
    p_provider_payment_id: payment.id,
    p_amount_paise: payment.amount,
    p_failure_reason: payment.error_description ?? "",
  });
  if (error) throw toAppError(error);
  if (data === "amount_mismatch" || data === "charge_already_settled") {
    logger.error("Payment needs review", { eventId, result: data });
  }
  return data;
}
