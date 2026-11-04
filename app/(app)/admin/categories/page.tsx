import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { ApiForm, type ApiFormField } from "@/modules/accounts/api-form";
import { listAdminCategories } from "@/modules/catalogue";

export const metadata: Metadata = { title: "Categories" };

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

export default async function AdminCategoriesPage() {
  const account = await requireAdmin();
  const categories = await listAdminCategories();
  const parents = categories.filter((category) => !category.parent_id);

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <p className="text-sm">
          <Link href="/admin">Back to admin</Link>
        </p>
        <h1 className="text-3xl font-bold">Categories</h1>
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
                  options: [
                    { value: "", label: "None, this is a main category" },
                    ...parents.map((parent) => ({ value: parent.id, label: parent.name })),
                  ],
                },
                { name: "isActive", label: "Show on the site?", options: YES_NO },
                { name: "sortOrder", label: "Display order", defaultValue: "500" },
              ]}
            />
          </div>
        </details>
        {categories.map((category) => (
          <details
            key={category.id}
            className="rounded-panel border border-line bg-surface px-4 py-3"
          >
            <summary className="cursor-pointer font-semibold">
              {category.parent_id ? "— " : ""}
              {category.name}{" "}
              <StatusPill
                tone={category.is_active ? "ok" : "neutral"}
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
                      label: "Parent category ID",
                      optional: true,
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
        ))}
      </main>
    </>
  );
}
