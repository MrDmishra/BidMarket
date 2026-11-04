import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { stateName } from "@/lib/india/states";
import { listPublicTenders } from "@/modules/tenders";
import { closingText } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tenders" };
export const dynamic = "force-dynamic";

type Tender = Awaited<ReturnType<typeof listPublicTenders>>[number];

const COLUMNS: Column<Tender>[] = [
  {
    key: "tender",
    header: "Tender",
    render: (row) => <Link href={`/tenders/${row.id}`}>{row.title}</Link>,
  },
  { key: "category", header: "Category", render: (row) => row.category_name },
  { key: "quantity", header: "Quantity", render: (row) => `${row.quantity} ${row.unit}` },
  { key: "state", header: "Delivery", render: (row) => stateName(row.delivery_state_code) },
  { key: "closes", header: "Closes", render: (row) => closingText(row.bid_ends_at) },
];

export default async function TendersPage() {
  const tenders = await listPublicTenders();
  return (
    <ContentPage title="Tenders" intro="Open tenders from verified buyers.">
      <DataTable
        caption="Open tenders"
        columns={COLUMNS}
        rows={tenders}
        rowKey={(row) => row.id}
        empty={<EmptyState message="No tenders are open right now." />}
      />
    </ContentPage>
  );
}
