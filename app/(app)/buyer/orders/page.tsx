import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { requireOrganisation } from "@/lib/auth/account";
import { listOrders } from "@/modules/orders";
import { OrderList } from "@/modules/orders/order-list";

export const metadata: Metadata = { title: "Orders" };

export default async function BuyerOrdersPage() {
  const { organisation } = await requireOrganisation("buyer");
  const orders = await listOrders();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <OrderList
          orders={orders}
          basePath="/buyer/orders"
          emptyMessage="Your orders appear here."
        />
      </main>
    </>
  );
}
