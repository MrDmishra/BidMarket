import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { requireOrganisation } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import type { ProductStatus } from "@/lib/supabase/database.types";
import { ApiForm } from "@/modules/accounts/api-form";
import { listSellerProducts } from "@/modules/catalogue";
import { ProductActions } from "@/modules/catalogue/product-actions";

export const metadata: Metadata = { title: "Products" };

const STATUS: Record<ProductStatus, { label: string; tone: PillTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending", tone: "warn" },
  notify: { label: "Needs changes", tone: "warn" },
  published: { label: "Published", tone: "ok" },
  unpublished: { label: "Unpublished", tone: "neutral" },
  rejected: { label: "Rejected", tone: "bad" },
};

export default async function SellerProductsPage() {
  const { organisation } = await requireOrganisation("seller");
  const products = await listSellerProducts();
  const active = organisation.status === "active";

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Products</h1>
          {active ? <ButtonLink href="/seller/products/new">Add a product</ButtonLink> : null}
        </div>
        {!active ? (
          <Banner tone="warn">You can list products once your account is active.</Banner>
        ) : null}
        {active ? (
          <details className="rounded-panel border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer font-semibold">Request a new category</summary>
            <div className="mt-3 max-w-md">
              <ApiForm
                id="category-request"
                endpoint="/api/v1/seller/category-requests"
                submitLabel="Send request"
                fields={[
                  { name: "name", label: "Category name" },
                  { name: "details", label: "What would it hold?" },
                ]}
              />
            </div>
          </details>
        ) : null}
        {products.length === 0 ? (
          <EmptyState message="Your products appear here after you add them." />
        ) : null}
        {products.map((product) => {
          const status = STATUS[product.status];
          const editable = product.status === "draft" || product.status === "notify";
          const live = product.status === "published" || product.status === "unpublished";
          return (
            <section
              key={product.id}
              aria-label={product.title}
              className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{product.title}</h2>
                <StatusPill tone={status.tone} label={status.label} />
              </div>
              {product.review_note ? (
                <Banner tone="warn">Admin note: {product.review_note}</Banner>
              ) : null}
              <FactList
                facts={[
                  { label: "Category", value: product.category_name },
                  { label: "Net price", value: formatInr(product.net_paise), numeric: true },
                  { label: "Stock", value: `${product.stock_qty} ${product.unit}`, numeric: true },
                ]}
              />
              <div className="flex flex-wrap items-start gap-3">
                <ProductActions
                  id={product.id}
                  status={product.status}
                  canDelete={Number(product.stock_qty) === 0 && product.status !== "pending"}
                />
                {editable ? <Link href={`/seller/products/${product.id}/edit`}>Edit</Link> : null}
              </div>
              {live ? (
                <details>
                  <summary className="cursor-pointer font-semibold">Update price or stock</summary>
                  <div className="mt-3 max-w-sm">
                    <ApiForm
                      id={`commercials-${product.id}`}
                      endpoint={`/api/v1/seller/products/${product.id}/commercials`}
                      method="PATCH"
                      submitLabel="Save changes"
                      fields={[
                        {
                          name: "mrp",
                          label: "MRP per unit (₹)",
                          defaultValue: String(product.mrp_paise / 100),
                        },
                        {
                          name: "discount",
                          label: "Discount (%)",
                          defaultValue: String(product.discount_bps / 100),
                        },
                        { name: "stock", label: "Stock", defaultValue: String(product.stock_qty) },
                      ]}
                    />
                  </div>
                </details>
              ) : null}
            </section>
          );
        })}
      </main>
    </>
  );
}
