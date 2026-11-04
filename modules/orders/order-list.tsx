import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { formatInr } from "@/lib/money";
import { ORDER_STATUS } from "@/modules/orders/order-labels";
import type { listOrders } from "@/modules/orders/service";

type Order = Awaited<ReturnType<typeof listOrders>>[number];

type OrderListProps = { orders: Order[]; basePath: string; emptyMessage: string };

export function OrderList({ orders, basePath, emptyMessage }: OrderListProps) {
  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Order",
      render: (row) => <Link href={`${basePath}/${row.id}`}>{row.order_no}</Link>,
    },
    { key: "goods", header: "Goods", render: (row) => row.title },
    { key: "quantity", header: "Quantity", render: (row) => `${row.quantity} ${row.unit}` },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill {...ORDER_STATUS[row.status]} />,
    },
    { key: "value", header: "Value", align: "right", render: (row) => formatInr(row.total_paise) },
  ];
  return (
    <DataTable
      caption="Your orders"
      columns={columns}
      rows={orders}
      rowKey={(row) => row.id}
      empty={<EmptyState message={emptyMessage} />}
    />
  );
}
