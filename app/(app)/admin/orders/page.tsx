import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { AdminNav, listOrders } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const account = await requireAdmin();
  const rows = await listOrders();
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/orders" />
        <h1 className="text-3xl font-bold">Orders</h1>
        <DataTable
          caption="Latest 100 orders"
          rows={rows}
          rowKey={(row) => row.id}
          empty={<EmptyState message="No orders yet." />}
          columns={[
            {
              key: "no",
              header: "Order",
              render: (row) => <span className="font-mono">{row.order_no}</span>,
            },
            { key: "title", header: "Item", render: (row) => row.title },
            { key: "buyer", header: "Buyer", render: (row) => row.buyer },
            { key: "seller", header: "Seller", render: (row) => row.seller },
            { key: "status", header: "Status", render: (row) => row.status.replace("_", " ") },
            {
              key: "total",
              header: "Value",
              align: "right",
              render: (row) => (
                <span className="font-mono tabular-nums">{formatInr(row.total_paise)}</span>
              ),
            },
            { key: "date", header: "Placed", render: (row) => shortDateTime(row.created_at) },
          ]}
        />
      </main>
    </>
  );
}
