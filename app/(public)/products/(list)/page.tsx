import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/field";
import { ProductCard } from "@/components/ui/product-card";
import { INDIAN_STATES, stateName } from "@/lib/india/states";
import { listCategories, PAGE_SIZE, searchProducts } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    state?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const {
    q = "",
    category = "",
    state = "",
    sort = "popular",
    page: pageParam,
  } = await searchParams;
  const page = Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1);
  const [categories, results] = await Promise.all([
    listCategories(),
    searchProducts({ query: q, categorySlug: category, stateCode: state, sort, page }),
  ]);
  const products = results.slice(0, PAGE_SIZE);
  const hasFilters = Boolean(q || category || state);

  const pageLink = (target: number) => {
    const params = new URLSearchParams({ q, category, state, sort, page: String(target) });
    return `/products?${params}`;
  };

  return (
    <ContentPage title="Products" intro="Browse products from verified sellers.">
      <form action="/products" className="grid items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <TextField id="filter-q" name="q" type="search" label="Search" defaultValue={q} />
        <SelectField id="filter-category" name="category" label="Category" defaultValue={category}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="filter-state" name="state" label="Delivery state" defaultValue={state}>
          <option value="">Any state</option>
          {INDIAN_STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </SelectField>
        <SelectField id="filter-sort" name="sort" label="Sort by" defaultValue={sort}>
          <option value="popular">Most ordered</option>
          <option value="price_low">Price, low to high</option>
          <option value="price_high">Price, high to low</option>
        </SelectField>
        <Button type="submit">Apply filters</Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No products match these filters. Remove a filter or try a broader search."
              : "Products appear here when sellers start listing."
          }
          action={
            hasFilters ? (
              <ButtonLink href="/products" variant="secondary">
                Clear filters
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              href={`/products/${product.id}`}
              title={product.title}
              location={[product.city, stateName(product.state_code)].filter(Boolean).join(", ")}
              netPaise={product.net_paise}
              mrpPaise={product.mrp_paise}
              discountPercent={Math.round(product.discount_bps / 100)}
              unit={product.unit}
            />
          ))}
        </div>
      )}

      {page > 1 || results.length > PAGE_SIZE ? (
        <nav aria-label="Pages" className="flex gap-2">
          {page > 1 ? (
            <ButtonLink href={pageLink(page - 1)} variant="secondary">
              Previous
            </ButtonLink>
          ) : null}
          {results.length > PAGE_SIZE ? (
            <ButtonLink href={pageLink(page + 1)} variant="secondary">
              Next
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </ContentPage>
  );
}
