import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { requireOrganisation } from "@/lib/auth/account";
import { getProduct, listCategories } from "@/modules/catalogue";
import { listDeliveryAddresses } from "@/modules/orders";
import { TenderForm } from "@/modules/tenders/tender-form";

export const metadata: Metadata = { title: "Create a tender" };

const MINIMUM_BIDDING_DAYS = 2;
const DAY_MS = 86_400_000;

function earliestClose() {
  const date = new Date(Date.now() + MINIMUM_BIDDING_DAYS * DAY_MS);
  const text = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
  return text.replace(" ", "T");
}

type NewTenderPageProps = { searchParams: Promise<{ product?: string }> };

export default async function NewTenderPage({ searchParams }: NewTenderPageProps) {
  const { organisation } = await requireOrganisation("buyer");
  const { product: productId } = await searchParams;
  const [product, categories, addresses] = await Promise.all([
    productId ? getProduct(productId) : null,
    listCategories(),
    listDeliveryAddresses(),
  ]);

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Create a tender</h1>
        {organisation.status === "active" ? (
          <TenderForm
            product={product ? { id: product.id, title: product.title } : null}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
            addresses={addresses.map((address) => ({
              id: address.id,
              label: `${address.label}, ${address.line1}, ${address.city}`,
            }))}
            earliestClose={earliestClose()}
          />
        ) : (
          <Banner tone="warn">Complete verification before you create a tender.</Banner>
        )}
      </main>
    </>
  );
}
