import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { createPublicClient } from "@/lib/supabase/public";
import { PROPOSED_FEES, type FeeSchedule } from "@/modules/billing/fee-schedule";

/** Falls back to the launch defaults only when no database is connected, as in local previews. */
export async function getFeeSchedule(): Promise<FeeSchedule> {
  const supabase = createPublicClient();
  if (!supabase) return PROPOSED_FEES;
  const { data, error } = await supabase
    .from("platform_settings")
    .select(
      "direct_fee_bps, tender_fee_bps, gst_bps, limit_individual_paise, limit_org_paise, custom_deposit_paise, subscription_base_paise, subscription_base_crore, subscription_step_paise, free_subscription_sellers",
    )
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new AppError("SERVICE_UNAVAILABLE", { cause: error });
  return {
    directFeeBps: data.direct_fee_bps,
    tenderFeeBps: data.tender_fee_bps,
    gstBps: data.gst_bps,
    limitIndividualPaise: data.limit_individual_paise,
    limitOrgPaise: data.limit_org_paise,
    customDepositPaise: data.custom_deposit_paise,
    subscriptionBasePaise: data.subscription_base_paise,
    subscriptionBaseCrore: data.subscription_base_crore,
    subscriptionStepPaise: data.subscription_step_paise,
    freeSubscriptionSellers: data.free_subscription_sellers,
  };
}
