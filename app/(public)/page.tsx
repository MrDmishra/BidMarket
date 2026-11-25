import Link from "next/link";
import type { ReactNode } from "react";
import { AuctionStair } from "@/components/ui/auction-stair";
import { ButtonLink } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/ui/product-card";
import { stateName } from "@/lib/india/states";
import { productImageUrl } from "@/lib/files/public-url";
import { formatInr } from "@/lib/money";
import { getFeeSchedule, type FeeSchedule } from "@/modules/billing";
import {
  groupCategories,
  listCategories,
  listTopProducts,
  rankPopularCategories,
} from "@/modules/catalogue";

export const dynamic = "force-dynamic";

const EXAMPLE_BIDS_PAISE = [64_000, 63_200, 62_100, 61_400, 60_800];
const MAIN_CATEGORY_LIMIT = 6;
const POPULAR_CATEGORY_LIMIT = 12;
const TOP_PRODUCT_LIMIT = 8;
const SUB_CATEGORY_PREVIEW = 2;

const PROMISES = [
  ["Verified sellers", "PAN, GSTIN and bank checked"],
  ["Prices that compete", "Sealed bids and live auctions"],
  ["Fees in full", "Published before you buy"],
  ["Paperwork done", "Contract and acceptance report"],
];

const buyingMethods = (fees: FeeSchedule) => [
  {
    title: "Direct order",
    body: "For small, repeat purchases. Pick a listed product and order at the published price.",
    fee: `Under ${formatInr(fees.limitOrgPaise)}. Fee ${fees.directFeeBps / 100}%.`,
  },
  {
    title: "Bid",
    body: "Sellers send sealed prices against your requirement. You review them after closing and choose one.",
    fee: `Any value. Fee ${fees.tenderFeeBps / 100}%.`,
  },
  {
    title: "Reverse auction",
    body: "Sellers undercut each other live. The lowest valid price at closing becomes L1 and gets the first offer.",
    fee: `Any value. Fee ${fees.tenderFeeBps / 100}%.`,
  },
  {
    title: "Bid to RA",
    body: "Collect sealed bids first, remove the costliest sellers, then run an auction among those left.",
    fee: `Any value. Fee ${fees.tenderFeeBps / 100}%.`,
  },
];

const ORDER_STEPS = [
  ["Verify", "Buyers and sellers pass PAN, GSTIN and bank checks."],
  ["Source", "Order directly, or publish a tender and collect prices."],
  ["Accept", "The seller accepts and pays the platform fee. Contact details open up."],
  ["Deliver", "The seller dispatches with bill, e-way bill and transport details."],
  ["Close", "The buyer confirms receipt. An acceptance report closes the order."],
];

export default async function HomePage() {
  const [categories, fees, topProducts] = await Promise.all([
    listCategories(),
    getFeeSchedule(),
    listTopProducts(),
  ]);
  const mainCategories = groupCategories(categories);
  const popularCategories = rankPopularCategories(
    categories.filter((category) => category.parent_id),
    topProducts,
    POPULAR_CATEGORY_LIMIT,
  );

  return (
    <main>
      <section className="bg-band text-band-ink">
        <div className="page-wrap grid items-center gap-9 py-11 md:grid-cols-[3fr_2fr]">
          <div className="flex min-w-0 flex-col items-start gap-5">
            <span className="rounded-pill bg-band-2 px-2 py-0.5 text-xs font-semibold text-highlight">
              In development
            </span>
            <h1 className="text-[clamp(2rem,1.4rem+2.6vw,3.2rem)] font-extrabold">
              Buy for your business at the price sellers compete to give you.
            </h1>
            <p className="max-w-xl text-lg text-band-muted">
              Order directly from verified sellers, invite bids, or run a reverse auction. Every
              order ends with a contract and an acceptance report you can audit.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/products" variant="highlight">
                Browse products
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>
          <figure className="flex min-w-0 flex-col gap-2 rounded-panel bg-band-2 p-5">
            <figcaption className="text-xs font-semibold tracking-wide text-band-muted uppercase">
              Illustration with example prices
            </figcaption>
            <p className="font-mono text-4xl font-semibold text-highlight tabular-nums">
              {formatInr(60_800)}
              <span className="ml-2 font-sans text-sm font-normal text-band-muted">
                example L1, per metre
              </span>
            </p>
            <div className="text-highlight">
              <AuctionStair bidsPaise={EXAMPLE_BIDS_PAISE} />
            </div>
          </figure>
        </div>
        <ul className="page-wrap grid gap-x-6 gap-y-3 border-t border-line py-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(([title, body]) => (
            <li key={title} className="flex flex-col">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-band-muted">{body}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="page-wrap flex flex-col gap-12 py-10">
        {mainCategories.length > 0 ? (
          <HomeSection
            id="home-categories"
            title="Shop by category"
            intro="Pick a main category to see its sub-categories and products."
            footer={
              <ButtonLink href="/categories" variant="secondary">
                Explore all categories
              </ButtonLink>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mainCategories.slice(0, MAIN_CATEGORY_LIMIT).map((category) => {
                const preview = category.subCategories.slice(0, SUB_CATEGORY_PREVIEW);
                const more = category.subCategories.length - preview.length;
                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="group flex flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink no-underline hover:border-accent"
                  >
                    <span className="flex justify-center bg-sunk py-7">
                      <CategoryIcon slug={category.slug} size="lg" />
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-4">
                      <span className="text-lg font-bold">{category.name}</span>
                      <span className="text-sm text-muted">
                        {preview.length > 0
                          ? `${preview.map((item) => item.name).join(", ")}${more > 0 ? ` and ${more} more` : ""}`
                          : (category.description ?? "Products from verified sellers")}
                      </span>
                      <ExploreRow label="Explore products" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </HomeSection>
        ) : null}

        {popularCategories.length > 0 ? (
          <HomeSection
            id="popular-categories"
            title="Popular categories"
            intro="Sub-categories where buyers order most."
          >
            <ol className="grid list-none gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {popularCategories.map((category, index) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="group relative flex h-full flex-col gap-2 overflow-hidden rounded-panel border border-line bg-surface p-4 pl-12 text-ink no-underline hover:border-accent"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-2 left-2 font-mono text-4xl font-bold text-line tabular-nums"
                    >
                      {index + 1}
                    </span>
                    <span className="leading-snug font-semibold">{category.name}</span>
                    <span className="text-sm text-muted">
                      {category.productCount === 1
                        ? "1 product"
                        : `${category.productCount} products`}
                    </span>
                    <ExploreRow label="Explore" />
                  </Link>
                </li>
              ))}
            </ol>
          </HomeSection>
        ) : null}

        <HomeSection
          id="top-products"
          title="Top products"
          intro="The most-ordered products across all categories."
          footer={
            topProducts.length > 0 ? (
              <ButtonLink href="/products" variant="secondary">
                Explore all products
              </ButtonLink>
            ) : null
          }
        >
          {topProducts.length === 0 ? (
            <EmptyState message="Products appear here when sellers publish them." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topProducts.slice(0, TOP_PRODUCT_LIMIT).map((product) => (
                <ProductCard
                  key={product.id}
                  href={`/products/${product.id}`}
                  title={product.title}
                  location={[product.city, stateName(product.state_code)]
                    .filter(Boolean)
                    .join(", ")}
                  netPaise={product.net_paise}
                  mrpPaise={product.mrp_paise}
                  discountPercent={Math.round(product.discount_bps / 100)}
                  unit={product.unit}
                  imageUrl={productImageUrl(product.image_path)}
                />
              ))}
            </div>
          )}
        </HomeSection>

        <HomeSection id="methods" title="Four ways to buy">
          <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {buyingMethods(fees).map((method) => (
              <div key={method.title} className="flex flex-col gap-2 bg-surface p-5">
                <h3 className="text-lg font-bold">{method.title}</h3>
                <p className="text-muted">{method.body}</p>
                <p className="mt-auto text-sm font-medium">{method.fee}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted">
            Proposed fees, plus GST. They may change before launch.
          </p>
        </HomeSection>

        <HomeSection id="order-steps" title="How an order runs">
          <ol className="grid list-none gap-4 [counter-reset:step] sm:grid-cols-2 lg:grid-cols-5">
            {ORDER_STEPS.map(([title, body]) => (
              <li
                key={title}
                className="flex flex-col gap-1 [counter-increment:step] before:font-mono before:text-sm before:font-semibold before:text-accent before:content-[counter(step)]"
              >
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </HomeSection>
      </div>
    </main>
  );
}

function HomeSection({
  id,
  title,
  intro,
  footer,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-3xl font-bold">
          {title}
        </h2>
        {intro ? <p className="text-muted">{intro}</p> : null}
      </div>
      {children}
      {footer ? <div className="flex justify-center pt-2">{footer}</div> : null}
    </section>
  );
}

/** The bottom row of a home card. The whole card is the link, so this is only a visual cue. */
function ExploreRow({ label }: { label: string }) {
  return (
    <span className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm font-semibold text-accent">
      {label}
      <span
        aria-hidden="true"
        className="inline-flex size-7 items-center justify-center rounded-pill bg-accent text-accent-ink transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      >
        →
      </span>
    </span>
  );
}
