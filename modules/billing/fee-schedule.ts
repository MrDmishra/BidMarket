/** Used only when no database is connected. Live values come from platform_settings. */
export type FeeSchedule = {
  directFeeBps: number;
  tenderFeeBps: number;
  gstBps: number;
  limitIndividualPaise: number;
  limitOrgPaise: number;
  customDepositPaise: number;
  subscriptionBasePaise: number;
  subscriptionBaseCrore: number;
  subscriptionStepPaise: number;
  launchOfferSellers: number;
  launchOfferBps: number;
};

export const PROPOSED_FEES: FeeSchedule = {
  directFeeBps: 10,
  tenderFeeBps: 50,
  gstBps: 1800,
  limitIndividualPaise: 2_000_000,
  limitOrgPaise: 5_000_000,
  customDepositPaise: 100_000,
  subscriptionBasePaise: 2_500_000,
  subscriptionBaseCrore: 25,
  subscriptionStepPaise: 10_000,
  launchOfferSellers: 100,
  launchOfferBps: 5000,
};

/** Charges for completed crores above the base, as decided in PRD D-14. */
export function subscriptionFeePaise(
  turnoverCrore: number,
  fees: FeeSchedule = PROPOSED_FEES,
): number {
  if (!Number.isFinite(turnoverCrore) || turnoverCrore < 0) {
    throw new RangeError("Turnover must be zero or more");
  }
  const { subscriptionBasePaise, subscriptionBaseCrore, subscriptionStepPaise } = fees;
  const completedCrores = Math.max(0, Math.floor(turnoverCrore - subscriptionBaseCrore));
  return subscriptionBasePaise + completedCrores * subscriptionStepPaise;
}
