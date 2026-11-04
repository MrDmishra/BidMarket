import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { formatInr } from "@/lib/money";
import type { getBillingOverview } from "@/modules/billing/service";

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

export const dateText = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(
    new Date(value),
  );

const COLUMNS: Column<Charge>[] = [
  { key: "date", header: "Date", render: (row) => dateText(row.created_at) },
  { key: "item", header: "For", render: (row) => CHARGE_LABELS[row.kind] },
  { key: "status", header: "Status", render: (row) => <StatusPill {...STATUS[row.status]} /> },
  { key: "amount", header: "Total", align: "right", render: (row) => formatInr(row.total_paise) },
];

type BillingSectionsProps = { overview: Overview; invoiceBase: string };

export function BillingSections({ overview, invoiceBase }: BillingSectionsProps) {
  return (
    <>
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
          columns={COLUMNS}
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
                <Link href={`${invoiceBase}/${invoice.id}`}>{invoice.invoice_no}</Link>{" "}
                <span className="text-sm text-muted">{dateText(invoice.issued_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
