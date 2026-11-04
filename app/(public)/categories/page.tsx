import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { EmptyState } from "@/components/ui/empty-state";
import { groupCategories, listCategories } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = groupCategories(await listCategories());

  return (
    <ContentPage
      title="Categories"
      intro="Open a category to see its sub-categories, then pick one to see its products."
    >
      {categories.length === 0 ? (
        <EmptyState message="Categories appear here when the catalogue opens." />
      ) : (
        <div className="grid items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <details
              key={category.id}
              className="group rounded-panel border border-line bg-surface open:border-accent"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-lg font-bold">{category.name}</span>
                  <span className="text-sm text-muted">
                    {category.subCategories.length} sub-categories
                  </span>
                </span>
                <span aria-hidden="true" className="text-accent group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <ul className="flex flex-col gap-1 border-t border-line p-4 text-sm">
                <li>
                  <Link href={`/products?category=${category.slug}`} className="font-semibold">
                    All {category.name.toLowerCase()} products
                  </Link>
                </li>
                {category.subCategories.map((subCategory) => (
                  <li key={subCategory.id}>
                    <Link href={`/products?category=${subCategory.slug}`}>{subCategory.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </ContentPage>
  );
}
