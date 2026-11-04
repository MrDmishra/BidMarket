import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { createPublicClient } from "@/lib/supabase/public";

export const PAGE_SIZE = 24;

export type ProductFilters = {
  query?: string;
  categorySlug?: string;
  stateCode?: string;
  sort?: string;
  page?: number;
};

export async function listCategories() {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order")
    .order("sort_order");
  if (error) throw new AppError("SERVICE_UNAVAILABLE", { cause: error });
  return data;
}

export async function listSpecDefinitions() {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("spec_definitions")
    .select("id, category_id, label, kind, unit, is_required")
    .order("label");
  if (error) throw new AppError("SERVICE_UNAVAILABLE", { cause: error });
  return data;
}

export async function searchProducts({
  query,
  categorySlug,
  stateCode,
  sort,
  page = 1,
}: ProductFilters) {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("search_products", {
    p_query: query || undefined,
    p_category_slug: categorySlug || undefined,
    p_state_code: stateCode || undefined,
    p_sort: sort || undefined,
    p_limit: PAGE_SIZE + 1,
    p_offset: (Math.max(page, 1) - 1) * PAGE_SIZE,
  });
  if (error) throw new AppError("SERVICE_UNAVAILABLE", { cause: error });
  return data;
}

export async function getProduct(id: string) {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("public_product", { p_id: id });
  if (error) throw new AppError("SERVICE_UNAVAILABLE", { cause: error });
  return data[0] ?? null;
}
