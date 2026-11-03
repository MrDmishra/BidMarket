/** Launch defaults. From Phase 4 the platform_settings table replaces these values. */
export const PROPOSED_FEES = {
  directFeeBps: 10,
  tenderFeeBps: 50,
  gstBps: 1800,
  limitIndividualPaise: 2_000_000,
  limitOrgPaise: 5_000_000,
  customDepositPaise: 100_000,
  subscriptionBasePaise: 2_500_000,
  subscriptionBaseCrore: 25,
  subscriptionStepPaise: 10_000,
} as const;

/** Charges for completed crores above the base, as decided in PRD D-14. */
export function subscriptionFeePaise(turnoverCrore: number): number {
  if (!Number.isFinite(turnoverCrore) || turnoverCrore < 0) {
    throw new RangeError("Turnover must be zero or more");
  }
  const { subscriptionBasePaise, subscriptionBaseCrore, subscriptionStepPaise } = PROPOSED_FEES;
  const completedCrores = Math.max(0, Math.floor(turnoverCrore - subscriptionBaseCrore));
  return subscriptionBasePaise + completedCrores * subscriptionStepPaise;
}
