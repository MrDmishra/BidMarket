import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { listPaymentPendingSellers, listPendingOrganisations } from "@/modules/accounts";
import { ActionForm } from "@/components/ui/action-form";
import { getServerEnv } from "@/lib/env/server";
import { AdminNav, getOverview, listPendingFiles } from "@/modules/admin";
import { ReviewActions } from "@/modules/accounts/review-queue";
import { TestActivation } from "@/modules/accounts/test-activation";
import { listPendingCategoryRequests, listPendingProducts } from "@/modules/catalogue";
import { CategoryRequestReview } from "@/modules/catalogue/category-request-review";
import { ProductReview } from "@/modules/catalogue/product-review";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const account = await requireAdmin();
  const testActivationEnabled = getServerEnv().APP_ENV !== "production";
  const [overview, pending, products, sellers, requests, files] = await Promise.all([
    getOverview(),
    listPendingOrganisations(),
    listPendingProducts(),
    listPaymentPendingSellers(),
    listPendingCategoryRequests(),
    listPendingFiles(),
  ]);

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin" />
        <h1 className="text-3xl font-bold">Overview</h1>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            {
              label: "Accounts to review",
              value: overview.pendingOrganisations,
              href: "#accounts",
            },
            { label: "Products to review", value: overview.pendingProducts, href: "#products" },
            { label: "Open incidents", value: overview.openIncidents, href: "/admin/incidents" },
            { label: "Open tickets", value: overview.openTickets, href: "/admin/tickets" },
            { label: "Live auctions", value: overview.liveAuctions, href: "/admin/tenders" },
            { label: "Paused auctions", value: overview.pausedAuctions, href: "/admin/tenders" },
            { label: "Active orders", value: overview.activeOrders, href: "/admin/orders" },
            {
              label: "Blocked accounts",
              value: overview.blockedSellers,
              href: "/admin/organisations",
            },
          ].map((tile) => (
            <li key={tile.label}>
              <a
                href={tile.href}
                className="flex flex-col gap-1 rounded-panel border border-line bg-surface p-4 hover:border-brand"
              >
                <span className="font-mono text-2xl font-bold tabular-nums">{tile.value}</span>
                <span className="text-sm text-muted">{tile.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Fees received:{" "}
          <b className="font-mono tabular-nums">{formatInr(overview.feesPaidPaise)}</b>
        </p>
        <h2 id="accounts" className="pt-2 text-2xl font-bold">
          Account verification
        </h2>
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

        <h2 id="products" className="pt-4 text-2xl font-bold">
          Product review
        </h2>
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

        <h2 id="documents" className="pt-4 text-2xl font-bold">
          Documents to check
        </h2>
        <p className="text-sm text-muted">
          Until a malware scanner is connected, open each PDF and mark it. The other party sees a
          document only once it is marked clean.
        </p>
        {files.length === 0 ? <EmptyState message="No documents are waiting." /> : null}
        {files.map((file) => (
          <section
            key={file.id}
            aria-label={`Document ${file.order_no ?? file.path}`}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <p>
              <b>{file.kind?.replaceAll("_", " ") ?? "Document"}</b>
              {file.order_no ? (
                <>
                  {" "}
                  for order <span className="font-mono">{file.order_no}</span>
                </>
              ) : null}
              , from {file.owner}. {Math.ceil(file.size_bytes / 1024)} KB.
            </p>
            <a
              className="underline"
              href={`/api/v1/admin/files/${file.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open the file
            </a>
            <div className="grid gap-4 md:grid-cols-2">
              <ActionForm
                id={`clean-${file.id}`}
                endpoint={`/api/v1/admin/files/${file.id}/review`}
                body={{ clean: true }}
                buttonLabel="Mark clean"
                fields={[{ kind: "text", name: "reason", label: "What you checked" }]}
              />
              <ActionForm
                id={`infected-${file.id}`}
                endpoint={`/api/v1/admin/files/${file.id}/review`}
                body={{ clean: false }}
                buttonLabel="Mark unsafe"
                variant="danger"
                fields={[{ kind: "text", name: "reason", label: "Why it is unsafe" }]}
              />
            </div>
          </section>
        ))}

        {testActivationEnabled ? (
          <>
            <h2 className="pt-4 text-2xl font-bold">Test activation</h2>
            <Banner tone="warn">
              For testing only. This skips subscription payment and switches off when APP_ENV is
              production.
            </Banner>
            {sellers.length === 0 ? (
              <EmptyState message="No sellers are waiting for payment." />
            ) : null}
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
          </>
        ) : null}
      </main>
    </>
  );
}
