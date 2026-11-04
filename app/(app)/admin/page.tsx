import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { listPaymentPendingSellers, listPendingOrganisations } from "@/modules/accounts";
import { ReviewActions } from "@/modules/accounts/review-queue";
import { TestActivation } from "@/modules/accounts/test-activation";
import { listPendingCategoryRequests, listPendingProducts } from "@/modules/catalogue";
import { CategoryRequestReview } from "@/modules/catalogue/category-request-review";
import { ProductReview } from "@/modules/catalogue/product-review";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const account = await requireAdmin();
  const [pending, products, sellers, requests] = await Promise.all([
    listPendingOrganisations(),
    listPendingProducts(),
    listPaymentPendingSellers(),
    listPendingCategoryRequests(),
  ]);

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Account verification</h1>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/categories" variant="secondary">
              Manage categories
            </ButtonLink>
            <ButtonLink href="/admin/settings" variant="secondary">
              Fees and settings
            </ButtonLink>
          </div>
        </div>
        {pending.length === 0 ? <EmptyState message="No accounts are waiting for review." /> : null}
        {pending.map((organisation) => (
          <section
            key={organisation.id}
            aria-label={organisation.legal_name}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{organisation.legal_name}</h2>
              <StatusPill tone="warn" label="Pending" />
            </div>
            <FactList
              facts={[
                { label: "Type", value: `${organisation.kind}, ${organisation.entity_type}` },
                {
                  label: "PAN ending",
                  value: organisation.pan_last4 ?? "Not saved",
                  numeric: true,
                },
                { label: "GSTIN", value: organisation.gstin ?? "Not given", numeric: true },
              ]}
            />
            <ReviewActions organisationId={organisation.id} />
          </section>
        ))}

        <h2 className="pt-4 text-2xl font-bold">Product review</h2>
        {products.length === 0 ? (
          <EmptyState message="No products are waiting for review." />
        ) : null}
        {products.map((product) => (
          <section
            key={product.id}
            aria-label={product.title}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold">{product.title}</h3>
              <StatusPill tone="warn" label="Pending" />
            </div>
            {product.description ? <p>{product.description}</p> : null}
            <FactList
              facts={[
                { label: "Seller", value: product.seller_name },
                { label: "Category", value: product.category_name },
                { label: "MRP", value: formatInr(product.mrp_paise), numeric: true },
                { label: "Net price", value: formatInr(product.net_paise), numeric: true },
                { label: "Stock", value: `${product.stock_qty} ${product.unit}`, numeric: true },
              ]}
            />
            <ProductReview productId={product.id} />
          </section>
        ))}

        <h2 className="pt-4 text-2xl font-bold">Category requests</h2>
        {requests.length === 0 ? <EmptyState message="No category requests are waiting." /> : null}
        {requests.map((request) => (
          <section
            key={request.id}
            aria-label={request.name}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <h3 className="text-xl font-bold">{request.name}</h3>
            <p>{request.details}</p>
            <p className="text-sm text-muted">Requested by {request.seller_name}</p>
            <CategoryRequestReview requestId={request.id} />
          </section>
        ))}

        <h2 className="pt-4 text-2xl font-bold">Test activation</h2>
        <Banner tone="warn">
          For testing only. This skips subscription payment and is removed before launch.
        </Banner>
        {sellers.length === 0 ? <EmptyState message="No sellers are waiting for payment." /> : null}
        {sellers.map((seller) => (
          <section
            key={seller.id}
            aria-label={seller.legal_name}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <h3 className="text-xl font-bold">{seller.legal_name}</h3>
            <TestActivation organisationId={seller.id} />
          </section>
        ))}
      </main>
    </>
  );
}
