import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrganisation } from "@/lib/auth/account";
import { stateName } from "@/lib/india/states";
import { formatInr } from "@/lib/money";
import { listSellerTenders } from "@/modules/tenders";
import { closingText } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tenders" };

type Tender = Awaited<ReturnType<typeof listSellerTenders>>[number];

const COLUMNS: Column<Tender>[] = [
  {
    key: "tender",
    header: "Tender",
    render: (row) => <Link href={`/seller/tenders/${row.id}`}>{row.title}</Link>,
  },
  { key: "quantity", header: "Quantity", render: (row) => `${row.quantity} ${row.unit}` },
  { key: "state", header: "Delivery", render: (row) => stateName(row.delivery_state_code) },
  { key: "closes", header: "Closes", render: (row) => closingText(row.bid_ends_at) },
  {
    key: "bid",
    header: "Your bid",
    align: "right",
    render: (row) => (row.my_bid_paise ? formatInr(row.my_bid_paise) : "None"),
  },
];

export default async function SellerTendersPage() {
  const { organisation } = await requireOrganisation("seller");
  const tenders = await listSellerTenders();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Tenders</h1>
        <DataTable
          caption="Tenders you can bid on"
          columns={COLUMNS}
          rows={tenders}
          rowKey={(row) => row.id}
          empty={
            <EmptyState message="No tenders match right now. List products in more categories and states to see more." />
          }
        />
      </main>
    </>
  );
}
