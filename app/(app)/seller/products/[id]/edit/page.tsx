import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { requireOrganisation } from "@/lib/auth/account";
import { listCategories, listSellerProducts, listSpecDefinitions } from "@/modules/catalogue";
import { ProductForm } from "@/modules/catalogue/product-form";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organisation } = await requireOrganisation("seller");
  const [categories, specs, products] = await Promise.all([
    listCategories(),
    listSpecDefinitions(),
    listSellerProducts(),
  ]);
  const product = products.find((item) => item.id === id);
  if (!product || (product.status !== "draft" && product.status !== "notify")) notFound();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Edit product</h1>
        <ProductForm
          categories={categories}
          specs={specs}
          product={{
            id: product.id,
            categoryId: product.category_id,
            title: product.title,
            description: product.description ?? "",
            mrp: String(product.mrp_paise / 100),
            discount: String(product.discount_bps / 100),
            stock: String(product.stock_qty),
            unit: product.unit,
            states: product.state_codes,
            specs: product.specs,
          }}
        />
      </main>
    </>
  );
}
