import "server-only";

import type { z } from "zod";
import { publicEnv } from "@/lib/env/public";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { createRazorpayOrder } from "@/lib/providers/razorpay-client";
import { createUserClient } from "@/lib/supabase/server";
import {
  checkoutResultSchema,
  invoiceSnapshotSchema,
  quoteSchema,
  type settingsSchema,
} from "@/modules/billing/schemas";

export async function getSubscriptionQuote() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("quote_subscription");
  if (error) throw toAppError(error);
  return quoteSchema.parse(data);
}

export async function startSubscription() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("start_subscription");
  if (error) throw toAppError(error);
  return { chargeId: data };
}

/** The Razorpay call sits between two transactions, so no lock is held during it. */
export async function createCheckout(chargeId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("begin_checkout", { p_charge_id: chargeId });
  if (error) throw toAppError(error);
  const checkout = checkoutResultSchema.parse(data);
  if (checkout.status !== "pending" || !checkout.paymentId) {
    return { status: checkout.status };
  }

  const candidateOrderId =
    checkout.providerOrderId ??
    (await createRazorpayOrder(checkout.amountPaise, checkout.paymentId));
  const { data: orderId, error: recordError } = await supabase.rpc("record_provider_order", {
    p_payment_id: checkout.paymentId,
    p_provider_order_id: candidateOrderId,
  });
  if (recordError) throw toAppError(recordError);
  return {
    status: "pending",
    orderId,
    amountPaise: checkout.amountPaise,
    keyId: publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  };
}

export async function getChargeStatus(chargeId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("fee_charges")
    .select("status")
    .eq("id", chargeId)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError("NOT_FOUND");
  return { status: data.status };
}

export async function getBillingOverview() {
  const supabase = await createUserClient();
  const [wallet, subscriptions, charges, invoices] = await Promise.all([
    supabase.rpc("wallet_summary").single(),
    supabase
      .from("subscriptions")
      .select("id, status, fee_paise, starts_on, ends_on")
      .in("status", ["active", "expired"])
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("fee_charges")
      .select("id, kind, total_paise, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tax_invoices")
      .select("id, invoice_no, issued_at, charge_id")
      .order("issued_at", { ascending: false })
      .limit(20),
  ]);
  if (wallet.error) throw toAppError(wallet.error);
  if (subscriptions.error) throw toAppError(subscriptions.error);
  if (charges.error) throw toAppError(charges.error);
  if (invoices.error) throw toAppError(invoices.error);
  return {
    wallet: wallet.data,
    subscription: subscriptions.data[0] ?? null,
    charges: charges.data,
    invoices: invoices.data,
  };
}

export async function getInvoice(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("tax_invoices")
    .select("id, invoice_no, financial_year, issued_at, snapshot")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  return { ...data, snapshot: invoiceSnapshotSchema.parse(data.snapshot) };
}

export async function saveSettings(input: z.output<typeof settingsSchema>) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_save_settings", {
    p_direct_fee_bps: input.directFee,
    p_tender_fee_bps: input.tenderFee,
    p_gst_bps: input.gst,
    p_tds_bps: input.tds,
    p_subscription_base_paise: input.subscriptionBase,
    p_subscription_step_paise: input.subscriptionStep,
    p_free_subscription_sellers: input.freeSellers,
    p_reason: input.reason,
  });
  if (error) throw toAppError(error);
}
