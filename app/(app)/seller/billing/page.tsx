import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { FactList } from "@/components/ui/fact-list";
import { requireOrganisation } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { getBillingOverview, getSubscriptionQuote } from "@/modules/billing";
import { BillingSections, dateText } from "@/modules/billing/billing-sections";
import { PayButton } from "@/modules/billing/pay-button";

export const metadata: Metadata = { title: "Billing" };

type Overview = Awaited<ReturnType<typeof getBillingOverview>>;

const RENEWAL_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

function canRenew(subscription: Overview["subscription"]) {
  if (subscription?.status !== "active" || !subscription.ends_on) return true;
  const daysLeft = (new Date(subscription.ends_on).getTime() - Date.now()) / DAY_MS;
  return daysLeft <= RENEWAL_WINDOW_DAYS;
}

export default async function SellerBillingPage() {
  const { organisation } = await requireOrganisation("seller");
  if (organisation.status === "draft") {
    return (
      <>
        <AppHeader name={organisation.legalName} />
        <main className="page-wrap flex flex-col gap-4 py-8">
          <h1 className="text-3xl font-bold">Billing</h1>
          <Banner>Finish verification first. Billing opens after that.</Banner>
        </main>
      </>
    );
  }

  const [overview, quote] = await Promise.all([getBillingOverview(), getSubscriptionQuote()]);
  const pendingCharge = overview.charges.find(
    (charge) => charge.status === "pending" && charge.kind === "subscription",
  );
  const showPayment = Boolean(pendingCharge) || canRenew(overview.subscription);

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-6 py-8">
        <h1 className="text-3xl font-bold">Billing</h1>

        <section
          aria-labelledby="subscription-heading"
          className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
        >
          <h2 id="subscription-heading" className="text-xl font-bold">
            Annual subscription
          </h2>
          {overview.subscription?.status === "active" && overview.subscription.ends_on ? (
            <p>Active until {dateText(overview.subscription.ends_on)}.</p>
          ) : null}
          {organisation.status === "active" && overview.subscription?.status !== "active" ? (
            <Banner>
              This account was activated for testing, so no subscription is due. Paying below is
              optional and tests the payment flow.
            </Banner>
          ) : null}
          {showPayment ? (
            <>
              <FactList
                facts={[
                  {
                    label: "Declared turnover",
                    value: formatInr(quote.turnoverPaise),
                    numeric: true,
                  },
                  { label: "Fee", value: formatInr(quote.feePaise), numeric: true },
                  { label: "GST", value: formatInr(quote.gstPaise), numeric: true },
                  {
                    label: "Total",
                    value: formatInr(quote.feePaise + quote.gstPaise),
                    numeric: true,
                  },
                ]}
              />
              {quote.offerBps > 0 ? (
                <Banner>
                  Launch offer: {quote.offerBps / 100}% off your first year. This total includes it.
                </Banner>
              ) : null}
              {quote.free || isRazorpayConfigured() ? (
                <PayButton
                  chargeId={pendingCharge?.id}
                  label={quote.free ? "Activate subscription" : "Pay now"}
                />
              ) : (
                <Banner>Online payment is not switched on yet. Try again later.</Banner>
              )}
            </>
          ) : null}
        </section>

        <BillingSections overview={overview} invoiceBase="/seller/billing/invoices" />
      </main>
    </>
  );
}
