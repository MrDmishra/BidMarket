"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { INDIAN_STATES } from "@/lib/india/states";

const RAJASTHAN = "08";

type Category = { id: string; name: string };
type Spec = {
  id: string;
  category_id: string;
  label: string;
  kind: string;
  unit: string | null;
  is_required: boolean;
};
type ApiError = { error?: { message?: string; fields?: Record<string, string> } };

export type ProductDefaults = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  mrp: string;
  discount: string;
  stock: string;
  unit: string;
  states: string[];
  specs: Record<string, string>;
};

type ProductFormProps = { categories: Category[]; specs: Spec[]; product?: ProductDefaults };

export function ProductForm({ categories, specs, product }: ProductFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const categorySpecs = specs.filter((spec) => spec.category_id === categoryId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const specValues = Object.fromEntries(
      categorySpecs.map((spec) => [spec.id, form.get(`spec-${spec.id}`) ?? ""]),
    );
    setPending(true);
    setError("");
    setFields({});
    const response = await fetch(
      product ? `/api/v1/seller/products/${product.id}` : "/api/v1/seller/products",
      {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: form.get("title"),
          description: form.get("description"),
          mrp: form.get("mrp"),
          discount: form.get("discount"),
          stock: form.get("stock"),
          unit: form.get("unit"),
          states: form.getAll("states"),
          specs: specValues,
        }),
      },
    ).catch(() => null);

    if (response?.ok) {
      router.push("/seller/products");
      router.refresh();
      return;
    }
    const body = ((await response?.json().catch(() => ({}))) ?? {}) as ApiError;
    setFields(body.error?.fields ?? {});
    setError(
      body.error?.message ?? "We could not reach Bid Market. Check your connection and try again.",
    );
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-4" noValidate>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="title"
          name="title"
          label="Title"
          hint="Do not include brand or model names."
          defaultValue={product?.title}
          error={fields.title}
        />
        <SelectField
          id="categoryId"
          label="Category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          error={fields.categoryId}
        >
          <option value="" disabled>
            Choose
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField
          id="mrp"
          name="mrp"
          label="MRP per unit (₹)"
          inputMode="decimal"
          defaultValue={product?.mrp}
          error={fields.mrp}
        />
        <TextField
          id="discount"
          name="discount"
          label="Discount (%)"
          inputMode="decimal"
          hint="At least 10% off MRP."
          defaultValue={product?.discount ?? "10"}
          error={fields.discount}
        />
        <TextField
          id="stock"
          name="stock"
          label="Stock"
          inputMode="decimal"
          defaultValue={product?.stock}
          error={fields.stock}
        />
        <TextField
          id="unit"
          name="unit"
          label="Unit"
          hint="Such as pc, kg or metre."
          defaultValue={product?.unit ?? "pc"}
          error={fields.unit}
        />
      </div>
      <TextareaField
        id="description"
        name="description"
        label="Description (optional)"
        defaultValue={product?.description}
        error={fields.description}
      />
      {categorySpecs.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-lg font-bold">Specifications</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {categorySpecs.map((spec) => (
              <TextField
                key={spec.id}
                id={`spec-${spec.id}`}
                name={`spec-${spec.id}`}
                label={`${spec.label}${spec.unit ? ` (${spec.unit})` : ""}${spec.is_required ? "" : " (optional)"}`}
                inputMode={spec.kind === "number" ? "decimal" : undefined}
                defaultValue={product?.specs[spec.id]}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-lg font-bold">Delivers to</legend>
        {fields.states ? <p className="text-sm font-medium text-bad">{fields.states}</p> : null}
        <div
          className="grid max-h-64 grid-cols-1 gap-x-4 overflow-y-auto rounded-panel border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3"
          tabIndex={0}
          aria-label="States"
        >
          {INDIAN_STATES.map(([code, name]) => (
            <label key={code} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                name="states"
                value={code}
                defaultChecked={product ? product.states.includes(code) : code === RAJASTHAN}
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" loading={pending}>
          Save draft
        </Button>
      </div>
    </form>
  );
}
