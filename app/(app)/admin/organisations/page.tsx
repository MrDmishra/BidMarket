import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, listOrganisations, orgStatusFilter } from "@/modules/admin";

export const metadata: Metadata = { title: "Organisations" };

type PageProps = { searchParams: Promise<{ q?: string; status?: string }> };

const STATUSES = ["draft", "pending_payment", "pending_review", "active", "suspended", "rejected"];

export default async function AdminOrganisationsPage({ searchParams }: PageProps) {
  const account = await requireAdmin();
  const query = await searchParams;
  const status = orgStatusFilter.parse(query.status);
  const rows = await listOrganisations(query.q, status);

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/organisations" />
        <h1 className="text-3xl font-bold">Organisations</h1>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <TextField id="org-search" name="q" label="Name or GSTIN" defaultValue={query.q ?? ""} />
          <SelectField id="org-status" name="status" label="Status" defaultValue={status ?? ""}>
            <option value="">Any</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <DataTable
          caption="Organisations"
          rows={rows}
          rowKey={(row) => row.id}
          empty={<EmptyState message="No organisations match." />}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <Link className="underline" href={`/admin/organisations/${row.id}`}>
                  {row.legal_name}
                </Link>
              ),
            },
            { key: "kind", header: "Type", render: (row) => row.kind },
            {
              key: "gstin",
              header: "GSTIN",
              render: (row) => <span className="font-mono">{row.gstin ?? ""}</span>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusPill
                  tone={
                    row.status === "active"
                      ? "ok"
                      : row.status === "suspended" || row.status === "rejected"
                        ? "bad"
                        : "warn"
                  }
                  label={row.status.replace("_", " ")}
                />
              ),
            },
            {
              key: "block",
              header: "Blocked",
              render: (row) =>
                row.blocked_until && new Date(row.blocked_until) > new Date() ? "Yes" : "",
            },
          ]}
        />
      </main>
    </>
  );
}
