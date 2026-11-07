import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, searchAuditLog } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Audit log" };

type PageProps = {
  searchParams: Promise<{
    entityType?: string;
    entityId?: string;
    action?: string;
    before?: string;
  }>;
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const account = await requireAdmin();
  const query = await searchParams;
  const rows = await searchAuditLog({
    entityType: query.entityType,
    entityId: query.entityId,
    action: query.action,
    before: Number(query.before) || undefined,
  });
  const last = rows.at(-1);
  const next = new URLSearchParams({
    entityType: query.entityType ?? "",
    entityId: query.entityId ?? "",
    action: query.action ?? "",
    before: String(last?.id ?? ""),
  });

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/audit" />
        <h1 className="text-3xl font-bold">Audit log</h1>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <TextField
            id="audit-type"
            name="entityType"
            label="Record type"
            hint="For example organisation or tender."
            defaultValue={query.entityType ?? ""}
          />
          <TextField
            id="audit-id"
            name="entityId"
            label="Record ID"
            defaultValue={query.entityId ?? ""}
          />
          <TextField
            id="audit-action"
            name="action"
            label="Action starts with"
            defaultValue={query.action ?? ""}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <DataTable
          caption="Newest first, 50 at a time"
          rows={rows}
          rowKey={(row) => String(row.id)}
          empty={<EmptyState message="Nothing matches." />}
          columns={[
            { key: "when", header: "When", render: (row) => shortDateTime(row.created_at) },
            { key: "who", header: "Who", render: (row) => row.actor ?? row.actor_role ?? "system" },
            {
              key: "action",
              header: "Action",
              render: (row) => <span className="font-mono">{row.action}</span>,
            },
            {
              key: "record",
              header: "Record",
              render: (row) => (
                <span className="font-mono text-sm wrap-anywhere">
                  {row.entity_type} {row.entity_id}
                </span>
              ),
            },
            { key: "reason", header: "Reason", render: (row) => row.reason ?? "" },
          ]}
        />
        {rows.length === 50 ? (
          <Link className="underline" href={`/admin/audit?${next.toString()}`}>
            Older entries
          </Link>
        ) : null}
      </main>
    </>
  );
}
