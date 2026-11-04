import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { EmptyState } from "@/components/ui/empty-state";
import { listCategories } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <ContentPage
      title="Categories"
      intro="Each category sets the specifications that buyers filter on and sellers must fill in."
    >
      {categories.length === 0 ? (
        <EmptyState message="Categories appear here when the catalogue opens." />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="flex flex-col gap-1 rounded-panel border border-line bg-surface p-4 text-ink no-underline hover:border-accent"
            >
              <span className="font-semibold">{category.name}</span>
              <span className="text-sm text-muted">{category.description}</span>
            </Link>
          ))}
        </div>
      )}
    </ContentPage>
  );
}
