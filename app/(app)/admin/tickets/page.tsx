import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, listTickets } from "@/modules/admin";
import { shortDateTime, TICKET_TYPE_LABEL } from "@/modules/support";

export const metadata: Metadata = { title: "Tickets" };

export default async function AdminTicketsPage() {
  const account = await requireAdmin();
  const rows = await listTickets("open");
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/tickets" />
        <h1 className="text-3xl font-bold">Open tickets</h1>
        <DataTable
          caption="Open tickets, oldest first"
          rows={rows}
          rowKey={(row) => row.id}
          empty={<EmptyState message="No open tickets." />}
          columns={[
            {
              key: "ref",
              header: "Reference",
              render: (row) => (
                <Link className="font-mono underline" href={`/admin/tickets/${row.id}`}>
                  {row.ref_no}
                </Link>
              ),
            },
            {
              key: "type",
              header: "Topic",
              render: (row) => TICKET_TYPE_LABEL[row.type] ?? row.type,
            },
            { key: "from", header: "From", render: (row) => row.email ?? "" },
            { key: "date", header: "Opened", render: (row) => shortDateTime(row.created_at) },
          ]}
        />
      </main>
    </>
  );
}
