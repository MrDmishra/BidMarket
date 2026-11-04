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
      intro="Each main category is split into smaller sub-categories. Pick either one to see its products."
    >
      {categories.length === 0 ? (
        <EmptyState message="Categories appear here when the catalogue opens." />
      ) : (
        <div className="grid items-start gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <section
              key={category.id}
              aria-labelledby={`category-${category.slug}`}
              className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <h2 id={`category-${category.slug}`} className="text-lg font-bold">
                  <Link href={`/products?category=${category.slug}`}>{category.name}</Link>
                </h2>
                {category.description ? (
                  <p className="text-sm text-muted">{category.description}</p>
                ) : null}
              </div>
              {category.subCategories.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
                  {category.subCategories.map((subCategory) => (
                    <li key={subCategory.id}>
                      <Link href={`/products?category=${subCategory.slug}`}>
                        {subCategory.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </ContentPage>
  );
}
