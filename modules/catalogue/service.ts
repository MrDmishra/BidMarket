import "server-only";
import type { z } from "zod";

import { toAppError } from "@/lib/errors/database";
import { createUserClient } from "@/lib/supabase/server";
import type { commercialsSchema, productSchema } from "@/modules/catalogue/schemas";

type ProductInput = z.output<typeof productSchema>;
type CommercialsInput = z.output<typeof commercialsSchema>;

export async function saveProduct(id: string | null, input: ProductInput) {
  const supabase = await createUserClient();
  const specs = Object.entries(input.specs)
    .filter(([, value]) => value !== "")
    .map(([specId, value]) => ({ specId, value }));
  const { data, error } = await supabase.rpc("save_product", {
    p_id: id,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_description: input.description,
    p_mrp_paise: input.mrp,
    p_discount_bps: input.discount,
    p_stock_qty: input.stock,
    p_unit: input.unit,
    p_state_codes: input.states,
    p_specs: specs,
  });
  if (error) throw toAppError(error);
  return { id: data };
}

export async function runProductAction(id: string, action: "submit" | "publish" | "unpublish") {
  const supabase = await createUserClient();
  const { error } =
    action === "submit"
      ? await supabase.rpc("submit_product", { p_id: id })
      : await supabase.rpc("set_product_visibility", {
          p_id: id,
          p_visible: action === "publish",
        });
  if (error) throw toAppError(error);
}

export async function updateCommercials(id: string, input: CommercialsInput) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("update_product_commercials", {
    p_id: id,
    p_mrp_paise: input.mrp,
    p_discount_bps: input.discount,
    p_stock_qty: input.stock,
  });
  if (error) throw toAppError(error);
}

export async function listSellerProducts() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("seller_products");
  if (error) throw toAppError(error);
  return data;
}

export async function listPendingProducts() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_pending_products");
  if (error) throw toAppError(error);
  return data;
}

export async function reviewProduct(id: string, decision: string, note: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_review_product", {
    p_id: id,
    p_decision: decision,
    p_note: note,
  });
  if (error) throw toAppError(error);
}
