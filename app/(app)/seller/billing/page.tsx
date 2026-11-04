import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { requireOrganisation } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { getBillingOverview, getSubscriptionQuote } from "@/modules/billing";
import { PayButton } from "@/modules/billing/pay-button";

export const metadata: Metadata = { title: "Billing" };

type Overview = Awaited<ReturnType<typeof getBillingOverview>>;
type Charge = Overview["charges"][number];

const CHARGE_LABELS: Record<Charge["kind"], string> = {
  subscription: "Annual subscription",
  direct_buyer: "Direct order fee",
  direct_seller: "Direct order fee",
  tender_buyer: "Tender fee",
  tender_deposit: "Custom tender deposit",
  tender_balance: "Custom tender balance",
  tender_seller: "Tender fee",
};

const STATUS: Record<Charge["status"], { label: string; tone: PillTone }> = {
  pending: { label: "Due", tone: "warn" },
  held: { label: "On hold", tone: "neutral" },
  paid: { label: "Paid", tone: "ok" },
  released: { label: "Released", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const RENEWAL_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

const dateText = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(
    new Date(value),
  );

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
  const pendingCharge = overview.charges.find((charge) => charge.status === "pending");
  const showPayment = Boolean(pendingCharge) || canRenew(overview.subscription);
  const columns: Column<Charge>[] = [
    { key: "date", header: "Date", render: (row) => dateText(row.created_at) },
    { key: "item", header: "For", render: (row) => CHARGE_LABELS[row.kind] },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill {...STATUS[row.status]} />,
    },
    {
      key: "amount",
      header: "Total",
      align: "right",
      render: (row) => formatInr(row.total_paise),
    },
  ];

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
              {quote.free ? <Banner>Your first year is free.</Banner> : null}
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

        <section aria-labelledby="wallet-heading" className="flex flex-col gap-3">
          <h2 id="wallet-heading" className="text-xl font-bold">
            Wallet
          </h2>
          <FactList
            facts={[
              {
                label: "Available",
                value: formatInr(overview.wallet.available_paise),
                numeric: true,
              },
              { label: "On hold", value: formatInr(overview.wallet.on_hold_paise), numeric: true },
              { label: "Paid", value: formatInr(overview.wallet.paid_paise), numeric: true },
            ]}
          />
          <p className="text-sm text-muted">
            Wallet balance goes towards future fees. It cannot be withdrawn to a bank account.
          </p>
        </section>

        <section aria-labelledby="charges-heading" className="flex flex-col gap-3">
          <h2 id="charges-heading" className="text-xl font-bold">
            Charges
          </h2>
          <DataTable
            caption="Your platform charges"
            columns={columns}
            rows={overview.charges}
            rowKey={(row) => row.id}
            empty={<EmptyState message="Your charges appear here." />}
          />
        </section>

        <section aria-labelledby="invoices-heading" className="flex flex-col gap-3">
          <h2 id="invoices-heading" className="text-xl font-bold">
            Tax invoices
          </h2>
          {overview.invoices.length === 0 ? (
            <EmptyState message="Your tax invoices appear here after a payment." />
          ) : (
            <ul className="flex flex-col gap-1">
              {overview.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link href={`/seller/billing/invoices/${invoice.id}`}>{invoice.invoice_no}</Link>{" "}
                  <span className="text-sm text-muted">{dateText(invoice.issued_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
