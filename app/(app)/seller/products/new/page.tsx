import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { requireOrganisation } from "@/lib/auth/account";
import { listCategories, listSpecDefinitions } from "@/modules/catalogue";
import { ProductForm } from "@/modules/catalogue/product-form";

export const metadata: Metadata = { title: "Add a product" };

export default async function NewProductPage() {
  const { organisation } = await requireOrganisation("seller");
  if (organisation.status !== "active") redirect("/seller/products");
  const [categories, specs] = await Promise.all([listCategories(), listSpecDefinitions()]);

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Add a product</h1>
        <ProductForm categories={categories} specs={specs} />
      </main>
    </>
  );
}
