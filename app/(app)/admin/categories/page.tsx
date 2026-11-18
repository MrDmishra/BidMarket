import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { ApiForm, type ApiFormField } from "@/modules/accounts/api-form";
import { listAdminCategories } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Categories" };

const PAGE_SIZE = 15;

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const SPEC_FIELDS: ApiFormField[] = [
  { name: "label", label: "Specification name" },
  {
    name: "kind",
    label: "Type",
    options: [
      { value: "text", label: "Text" },
      { value: "number", label: "Number" },
    ],
  },
  { name: "unit", label: "Unit", optional: true },
  { name: "isKey", label: "Used for tender matching?", options: YES_NO },
  { name: "isRequired", label: "Required?", options: YES_NO },
];

type PageProps = {
  searchParams: Promise<{ q?: string; main?: string; show?: string; page?: string }>;
};

type Category = Awaited<ReturnType<typeof listAdminCategories>>[number];

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const account = await requireAdmin();
  const query = await searchParams;
  const categories = await listAdminCategories();

  const mains = categories
    .filter((category) => !category.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const subsOf = (parentId: string) =>
    categories
      .filter((category) => category.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const nameOf = new Map(categories.map((category) => [category.id, category.name]));

  // Each main category is followed by its own sub-categories, so the list reads as a tree.
  const ordered = mains.flatMap((main) => [main, ...subsOf(main.id)]);
  const search = query.q?.trim().toLowerCase() ?? "";
  const show = query.show === "active" || query.show === "hidden" ? query.show : "all";
  const mainFilter = mains.some((main) => main.id === query.main) ? query.main : "";
  const filtered = ordered.filter(
    (category) =>
      (!mainFilter || category.id === mainFilter || category.parent_id === mainFilter) &&
      (!search || category.name.toLowerCase().includes(search) || category.slug.includes(search)) &&
      (show === "all" || category.is_active === (show === "active")),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(query.page)) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hrefFor = (number: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", query.q ?? "");
    if (mainFilter) params.set("main", mainFilter);
    if (show !== "all") params.set("show", show);
    params.set("page", String(number));
    return `/admin/categories?${params.toString()}`;
  };
  const parentOptions = (except?: string) => [
    { value: "", label: "None, this is a main category" },
    ...mains
      .filter((main) => main.id !== except)
      .map((main) => ({ value: main.id, label: main.name })),
  ];

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-sm text-muted">
            {mains.length} main categories, {categories.length - mains.length} sub-categories
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-3" method="get" role="search">
          <TextField
            id="category-search"
            name="q"
            label="Search by name"
            defaultValue={query.q ?? ""}
          />
          <SelectField
            id="category-main"
            name="main"
            label="Main category"
            defaultValue={mainFilter}
          >
            <option value="">All</option>
            {mains.map((main) => (
              <option key={main.id} value={main.id}>
                {main.name}
              </option>
            ))}
          </SelectField>
          <SelectField id="category-show" name="show" label="Show" defaultValue={show}>
            <option value="all">Active and hidden</option>
            <option value="active">Active only</option>
            <option value="hidden">Hidden only</option>
          </SelectField>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <details className="rounded-panel border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer font-semibold">Add a category</summary>
          <div className="mt-3 max-w-md">
            <ApiForm
              id="new-category"
              endpoint="/api/v1/admin/categories"
              submitLabel="Add category"
              fields={[
                { name: "name", label: "Name" },
                { name: "slug", label: "Web address name", hint: "Such as solar-equipment." },
                { name: "description", label: "Description", optional: true },
                {
                  name: "parentId",
                  label: "Sub-category of",
                  optional: true,
                  options: parentOptions(),
                  defaultValue: mainFilter,
                },
                { name: "isActive", label: "Show on the site?", options: YES_NO },
                { name: "sortOrder", label: "Display order", defaultValue: "500" },
              ]}
            />
          </div>
        </details>

        <p className="text-sm text-muted" aria-live="polite">
          {filtered.length === categories.length
            ? `Showing all ${filtered.length}`
            : `${filtered.length} of ${categories.length} match`}
        </p>
        {rows.length === 0 ? <EmptyState message="No categories match. Clear the search." /> : null}
        <ul className="flex flex-col gap-2">
          {rows.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              parentName={category.parent_id ? (nameOf.get(category.parent_id) ?? "") : null}
              subCount={category.parent_id ? 0 : subsOf(category.id).length}
              parentOptions={parentOptions(category.id)}
            />
          ))}
        </ul>
        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} label="Category pages" />
      </main>
    </>
  );
}

function CategoryRow({
  category,
  parentName,
  subCount,
  parentOptions,
}: {
  category: Category;
  parentName: string | null;
  subCount: number;
  parentOptions: { value: string; label: string }[];
}) {
  return (
    <li className={parentName === null ? "" : "ml-4 sm:ml-8"}>
      <details className="rounded-panel border border-line bg-surface px-4 py-3">
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
          {category.name}
          <StatusPill
            tone="neutral"
            label={parentName === null ? `Main category · ${subCount} sub` : `In ${parentName}`}
          />
          <StatusPill
            tone={category.is_active ? "ok" : "warn"}
            label={category.is_active ? "Active" : "Hidden"}
          />
        </summary>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Edit</h2>
            <ApiForm
              id={`category-${category.id}`}
              endpoint={`/api/v1/admin/categories/${category.id}`}
              method="PATCH"
              submitLabel="Save category"
              fields={[
                { name: "name", label: "Name", defaultValue: category.name },
                { name: "slug", label: "Web address name", defaultValue: category.slug },
                {
                  name: "description",
                  label: "Description",
                  optional: true,
                  defaultValue: category.description ?? "",
                },
                {
                  name: "parentId",
                  label: "Sub-category of",
                  optional: true,
                  options: parentOptions,
                  defaultValue: category.parent_id ?? "",
                },
                {
                  name: "isActive",
                  label: "Show on the site?",
                  options: YES_NO,
                  defaultValue: category.is_active ? "yes" : "no",
                },
                {
                  name: "sortOrder",
                  label: "Display order",
                  defaultValue: String(category.sort_order),
                },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Add a specification</h2>
            <ApiForm
              id={`spec-${category.id}`}
              endpoint={`/api/v1/admin/categories/${category.id}/specs`}
              submitLabel="Add specification"
              fields={SPEC_FIELDS}
            />
          </div>
        </div>
      </details>
    </li>
  );
}
