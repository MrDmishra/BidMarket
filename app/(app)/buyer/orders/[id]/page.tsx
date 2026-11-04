import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganisation } from "@/lib/auth/account";
import { isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { getOrder, getOrderContacts } from "@/modules/orders";
import { OrderDetailView } from "@/modules/orders/order-detail";

export const metadata: Metadata = { title: "Order" };

type OrderPageProps = { params: Promise<{ id: string }> };

export default async function BuyerOrderPage({ params }: OrderPageProps) {
  const { organisation } = await requireOrganisation("buyer");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const contacts = order.contactsUnlocked ? await getOrderContacts(id) : null;

  return (
    <OrderDetailView
      order={order}
      contacts={contacts}
      organisationName={organisation.legalName}
      paymentsEnabled={isRazorpayConfigured()}
    />
  );
}
