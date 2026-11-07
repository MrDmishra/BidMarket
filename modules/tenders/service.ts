import "server-only";

import type { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { createPublicClient } from "@/lib/supabase/public";
import { createUserClient } from "@/lib/supabase/server";
import {
  auctionBidResultSchema,
  buyerAuctionSchema,
  buyerTenderSchema,
  estimateToPaise,
  publicTenderSchema,
  sellerAuctionSchema,
  sellerTenderSchema,
  toIndiaTimestamp,
  type createTenderSchema,
} from "@/modules/tenders/schemas";

const MINUTES_PER_HOUR = 60;

export async function listPublicTenders() {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("public_tenders", { p_limit: 50 });
  if (error) throw toAppError(error);
  return data;
}

export async function getPublicTender(id: string) {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("public_tender", { p_id: id });
  if (error) throw toAppError(error);
  return data ? publicTenderSchema.parse(data) : null;
}

export async function createTender(input: z.output<typeof createTenderSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("create_tender", {
    p_kind: input.kind,
    p_product_id: input.kind === "regular" ? (input.productId ?? null) : null,
    p_category_id: input.kind === "custom" ? (input.categoryId ?? null) : null,
    p_title: input.title ?? "",
    p_unit: input.unit ?? "",
    p_quantity: Number(input.quantity),
    p_estimate_unit_paise:
      input.kind === "custom" ? estimateToPaise(input.estimateUnit ?? "") : null,
    p_specs: input.specs ?? [],
    p_payment_terms: input.paymentTerms,
    p_credit_days: input.paymentTerms === "credit" ? Number(input.creditDays) : null,
    p_consignee_name: input.consigneeName,
    p_consignee_gstin: input.consigneeGstin,
    p_consignee_address_id: input.consigneeAddressId,
    p_contract_months: input.contractMonths,
    p_bid_ends_at: toIndiaTimestamp(input.bidEndsAt ?? input.raEndsAt ?? ""),
    p_type: input.type,
    p_ra_starts_at: input.raStartsAt ? toIndiaTimestamp(input.raStartsAt) : undefined,
    p_ra_ends_at: input.raEndsAt ? toIndiaTimestamp(input.raEndsAt) : undefined,
    p_min_bids: input.minBids,
    p_extensions_allowed: input.extensionsAllowed,
    p_extension_minutes: input.extensionHours * MINUTES_PER_HOUR,
  });
  if (error) throw toAppError(error);
  return { tenderId: data };
}

export async function publishTender(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("publish_tender", { p_id: id });
  if (error) throw toAppError(error);
  return { chargeId: data };
}

export async function cancelTender(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("cancel_tender", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function listBuyerTenders() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("buyer_tenders");
  if (error) throw toAppError(error);
  return data;
}

export async function getBuyerTender(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_buyer_tender", { p_id: id });
  if (error) throw toAppError(error);
  return data ? buyerTenderSchema.parse(data) : null;
}

export async function listTenderBids(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("tender_bids", { p_id: id });
  if (error) throw toAppError(error);
  return data;
}

export async function awardTender(id: string, rank: number) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("award_tender", { p_id: id, p_rank: rank });
  if (error) throw toAppError(error);
  return { chargeId: data };
}

export async function shortlistTender(id: string, mode: "highest" | "highest50") {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("shortlist_tender", { p_id: id, p_mode: mode });
  if (error) throw toAppError(error);
  return { sellersRemaining: data };
}

export async function listSellerTenders() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("seller_tenders");
  if (error) throw toAppError(error);
  return data;
}

export async function getSellerTender(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_seller_tender", { p_id: id });
  if (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") return null;
    throw appError;
  }
  return sellerTenderSchema.parse(data);
}

export async function submitBid(id: string, unitPaise: number) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("submit_bid", { p_id: id, p_unit_paise: unitPaise });
  if (error) throw toAppError(error);
  return { bidId: data };
}

export async function withdrawBid(id: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("withdraw_bid", { p_id: id });
  if (error) throw toAppError(error);
}

export async function acceptAward(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("accept_award", { p_id: id });
  if (error) throw toAppError(error);
  return { chargeId: data };
}

export async function rejectAward(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("reject_award", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function getSellerAuction(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("seller_auction", { p_id: id });
  if (error) throw toAppError(error);
  return sellerAuctionSchema.parse(data);
}

export async function getBuyerAuction(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("buyer_auction", { p_id: id });
  if (error) throw toAppError(error);
  if (!data) throw new AppError("NOT_FOUND");
  return buyerAuctionSchema.parse(data);
}

export async function placeAuctionBid(id: string, unitPaise: number, bidKey: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("place_ra_bid", {
    p_id: id,
    p_unit_paise: unitPaise,
    p_idempotency_key: bidKey,
  });
  if (error) throw toAppError(error);
  return auctionBidResultSchema.parse(data);
}
