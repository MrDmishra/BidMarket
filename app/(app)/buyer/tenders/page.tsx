import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireOrganisation } from "@/lib/auth/account";
import { listBuyerTenders } from "@/modules/tenders";
import { closingText, TENDER_STATUS } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tenders" };

type Tender = Awaited<ReturnType<typeof listBuyerTenders>>[number];

const COLUMNS: Column<Tender>[] = [
  {
    key: "number",
    header: "Tender",
    render: (row) => <Link href={`/buyer/tenders/${row.id}`}>{row.tender_no}</Link>,
  },
  { key: "title", header: "Goods", render: (row) => row.title },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill {...(TENDER_STATUS[row.status] ?? TENDER_STATUS.draft!)} />,
  },
  { key: "closes", header: "Closes", render: (row) => closingText(row.bid_ends_at) },
];

export default async function BuyerTendersPage() {
  const { organisation } = await requireOrganisation("buyer");
  const tenders = await listBuyerTenders();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Tenders</h1>
          <ButtonLink href="/buyer/tenders/new">Create a custom tender</ButtonLink>
        </div>
        <DataTable
          caption="Your tenders"
          columns={COLUMNS}
          rows={tenders}
          rowKey={(row) => row.id}
          empty={<EmptyState message="Your tenders appear here." />}
        />
      </main>
    </>
  );
}
