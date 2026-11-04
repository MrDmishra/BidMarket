import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { requireOrganisation } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { getProduct } from "@/modules/catalogue";
import { listDeliveryAddresses } from "@/modules/orders";
import { OrderForm } from "@/modules/orders/order-form";

export const metadata: Metadata = { title: "Place an order" };

const MINIMUM_DELIVERY_DAYS = 5;
const DAY_MS = 86_400_000;

type NewOrderPageProps = { searchParams: Promise<{ product?: string }> };

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const { organisation } = await requireOrganisation("buyer");
  const { product: productId } = await searchParams;
  if (!productId) notFound();
  const product = await getProduct(productId);
  if (!product) notFound();
  const addresses = await listDeliveryAddresses();
  const earliestDelivery = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    Date.now() + MINIMUM_DELIVERY_DAYS * DAY_MS,
  );

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Place an order</h1>
        <p>
          {product.title}, {formatInr(product.net_paise)} per {product.unit}
        </p>
        {organisation.status === "active" ? (
          <OrderForm
            productId={product.id}
            unit={product.unit}
            addresses={addresses}
            earliestDelivery={earliestDelivery}
            basePath="/buyer/orders"
          />
        ) : (
          <Banner tone="warn">Complete verification before you place an order.</Banner>
        )}
      </main>
    </>
  );
}
