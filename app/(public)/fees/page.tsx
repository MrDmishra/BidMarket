import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatInr } from "@/lib/money";
import { PROPOSED_FEES } from "@/modules/billing";
import { SubscriptionCalculator } from "@/modules/billing/subscription-calculator";

export const metadata: Metadata = { title: "Fees" };

type FeeRow = { payer: string; item: string; rate: string };

const percent = (bps: number) => `${bps / 100}%`;

const ROWS: FeeRow[] = [
  { payer: "Buyer", item: "Registration", rate: "Free" },
  {
    payer: "Buyer and seller",
    item: "Direct order, each side",
    rate: `${percent(PROPOSED_FEES.directFeeBps)} + GST`,
  },
  {
    payer: "Buyer",
    item: "Publishing a regular tender",
    rate: `${percent(PROPOSED_FEES.tenderFeeBps)} + GST`,
  },
  {
    payer: "Buyer",
    item: "Publishing a custom tender",
    rate: `${formatInr(PROPOSED_FEES.customDepositPaise)}, balance after L1`,
  },
  {
    payer: "Seller",
    item: "Accepting a tender",
    rate: `${percent(PROPOSED_FEES.tenderFeeBps)} + GST`,
  },
  {
    payer: "Seller",
    item: "Annual subscription",
    rate: `from ${formatInr(PROPOSED_FEES.subscriptionBasePaise)} + GST`,
  },
];

const COLUMNS: Column<FeeRow>[] = [
  { key: "payer", header: "Who pays", render: (row) => row.payer },
  { key: "item", header: "For", render: (row) => row.item },
  { key: "rate", header: "Rate", align: "right", render: (row) => row.rate },
];

export default function FeesPage() {
  return (
    <ContentPage
      title="Fees"
      intro="Every fee is published here. Bid Market does not take a share of the goods payment. These proposed fees may change before launch."
    >
      <DataTable caption="Platform fees" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.item} />
      <p className="text-muted">
        Direct orders stay under {formatInr(PROPOSED_FEES.limitIndividualPaise)} for individuals and{" "}
        {formatInr(PROPOSED_FEES.limitOrgPaise)} for organisations.
      </p>
      <SubscriptionCalculator />
    </ContentPage>
  );
}
