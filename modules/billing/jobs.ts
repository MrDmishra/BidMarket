import "server-only";

import { toAppError } from "@/lib/errors/database";
import { logger } from "@/lib/logger";
import { findCapturedPayment, isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { isEmailConfigured, sendEmail } from "@/lib/providers/resend-client";
import { createServiceClient } from "@/lib/supabase/service";
import { emailForTemplate } from "@/modules/billing/schemas";

const OUTBOX_BATCH = 25;

async function reconcilePayments() {
  if (!isRazorpayConfigured()) return 0;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("unresolved_payments");
  if (error) throw toAppError(error);

  let settled = 0;
  for (const payment of data) {
    try {
      const captured = await findCapturedPayment(payment.provider_order_id);
      if (!captured) continue;
      const result = await supabase.rpc("apply_payment_event", {
        p_event_id: null,
        p_event_type: "payment.captured",
        p_provider_order_id: payment.provider_order_id,
        p_provider_payment_id: captured.id,
        p_amount_paise: captured.amount,
        p_failure_reason: "",
      });
      if (result.error) throw toAppError(result.error);
      if (result.data === "paid") settled += 1;
    } catch (error) {
      // One bad order must not stop the rest. The next run tries it again.
      logger.error("Payment reconciliation failed", { paymentId: payment.id, error });
    }
  }
  return settled;
}

async function sendOutbox() {
  if (!isEmailConfigured()) return 0;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("claim_outbox", { p_limit: OUTBOX_BATCH });
  if (error) throw toAppError(error);

  let sent = 0;
  for (const message of data) {
    const { subject, text } = emailForTemplate(message.template, message.payload);
    const failure = await sendEmail(message.email, subject, text).then(
      () => null,
      (cause: unknown) => (cause instanceof Error ? cause.message : "Email failed"),
    );
    const finished = await supabase.rpc("finish_outbox", { p_id: message.id, p_error: failure });
    if (finished.error) throw toAppError(finished.error);
    if (!failure) sent += 1;
  }
  return sent;
}

export async function runBillingJobs() {
  const supabase = createServiceClient();
  const reconciled = await reconcilePayments();
  const emailed = await sendOutbox();
  const { data: expired, error } = await supabase.rpc("expire_subscriptions");
  if (error) throw toAppError(error);
  const unpaid = await supabase.rpc("expire_unpaid_orders");
  if (unpaid.error) throw toAppError(unpaid.error);
  return { reconciled, emailed, expired, unpaidOrdersCancelled: unpaid.data };
}
