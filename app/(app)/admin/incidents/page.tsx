import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, listIncidents } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Incidents" };

export default async function AdminIncidentsPage() {
  const account = await requireAdmin();
  const rows = await listIncidents("open");
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/incidents" />
        <h1 className="text-3xl font-bold">Open incidents</h1>
        <DataTable
          caption="Open incidents, oldest first"
          rows={rows}
          rowKey={(row) => row.id}
          empty={<EmptyState message="No open incidents." />}
          columns={[
            {
              key: "ref",
              header: "Reference",
              render: (row) => (
                <Link className="font-mono underline" href={`/admin/incidents/${row.id}`}>
                  {row.ref_no}
                </Link>
              ),
            },
            { key: "about", header: "About", render: (row) => row.reference ?? "" },
            { key: "by", header: "Raised by", render: (row) => row.raised_by },
            { key: "against", header: "Against", render: (row) => row.against ?? "" },
            { key: "date", header: "Raised", render: (row) => shortDateTime(row.created_at) },
          ]}
        />
      </main>
    </>
  );
}
