import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatInr } from "@/lib/money";
import { getFeeSchedule, type FeeSchedule } from "@/modules/billing";
import { SubscriptionCalculator } from "@/modules/billing/subscription-calculator";

export const metadata: Metadata = { title: "Fees" };
export const dynamic = "force-dynamic";

type FeeRow = { payer: string; item: string; rate: string };

const percent = (bps: number) => `${bps / 100}%`;

const feeRows = (fees: FeeSchedule): FeeRow[] => [
  { payer: "Buyer", item: "Registration", rate: "Free" },
  {
    payer: "Buyer and seller",
    item: "Direct order, each side",
    rate: `${percent(fees.directFeeBps)} + GST`,
  },
  {
    payer: "Buyer",
    item: "Publishing a regular tender",
    rate: `${percent(fees.tenderFeeBps)} + GST`,
  },
  {
    payer: "Buyer",
    item: "Publishing a custom tender",
    rate: `${formatInr(fees.customDepositPaise)}, balance after L1`,
  },
  {
    payer: "Seller",
    item: "Accepting a tender",
    rate: `${percent(fees.tenderFeeBps)} + GST`,
  },
  {
    payer: "Seller",
    item: "Annual subscription",
    rate: `from ${formatInr(fees.subscriptionBasePaise)} + GST`,
  },
];

const COLUMNS: Column<FeeRow>[] = [
  { key: "payer", header: "Who pays", render: (row) => row.payer },
  { key: "item", header: "For", render: (row) => row.item },
  { key: "rate", header: "Rate", align: "right", render: (row) => row.rate },
];

export default async function FeesPage() {
  const fees = await getFeeSchedule();

  return (
    <ContentPage
      title="Fees"
      intro="Every fee is published here. Bid Market does not take a share of the goods payment."
    >
      <DataTable
        caption="Platform fees"
        columns={COLUMNS}
        rows={feeRows(fees)}
        rowKey={(row) => row.item}
      />
      <p className="text-muted">
        Direct orders stay under {formatInr(fees.limitIndividualPaise)} for individuals and{" "}
        {formatInr(fees.limitOrgPaise)} for organisations.
      </p>
      <SubscriptionCalculator fees={fees} />
    </ContentPage>
  );
}
