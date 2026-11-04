import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/layout/content-page";
import { ActionPanel } from "@/components/ui/action-panel";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill } from "@/components/ui/status-pill";
import { productImageUrl } from "@/lib/files/public-url";
import { stateName } from "@/lib/india/states";
import { formatInr } from "@/lib/money";
import { getProduct } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Product" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = UUID.test(id) ? await getProduct(id) : null;
  if (!product) notFound();

  return (
    <ContentPage title={product.title}>
      <p className="text-sm text-muted">
        <Link href={`/products?category=${product.category_slug}`}>{product.category_name}</Link> ·{" "}
        <span className="font-mono">{product.display_no}</span>
      </p>
      <div className="grid items-start gap-5 md:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {product.image_paths.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {product.image_paths.map((path, index) => (
                <div
                  key={path}
                  role="img"
                  aria-label={`${product.title}, image ${index + 1}`}
                  className="aspect-square rounded-control bg-sunk bg-cover bg-center"
                  style={{ backgroundImage: `url(${productImageUrl(path)})` }}
                />
              ))}
            </div>
          ) : null}
          {product.description ? <p className="max-w-[65ch]">{product.description}</p> : null}
          <FactList
            facts={product.specs.map((spec) => ({
              label: spec.label,
              value: [spec.value, spec.unit].filter(Boolean).join(" "),
            }))}
          />
        </div>
        <ActionPanel title="Price">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {formatInr(product.net_paise)}
            </span>
            <span className="font-mono text-sm text-muted tabular-nums line-through">
              {formatInr(product.mrp_paise)}
            </span>
            <StatusPill tone="ok" label={`${Math.round(product.discount_bps / 100)}% off MRP`} />
          </p>
          <p className="text-sm text-muted">Per {product.unit}, all-inclusive.</p>
          <FactList
            facts={[
              { label: "Stock", value: `${product.stock_qty} ${product.unit}`, numeric: true },
              {
                label: "Seller location",
                value: [product.city, stateName(product.state_code)].filter(Boolean).join(", "),
              },
            ]}
          />
          <p className="text-sm">
            Delivers to{" "}
            {product.delivery_states.map(stateName).filter(Boolean).join(", ") || "selected states"}
            .
          </p>
          <p className="text-sm text-muted">Direct orders and tenders open in a later release.</p>
        </ActionPanel>
      </div>
    </ContentPage>
  );
}
