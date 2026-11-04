import "server-only";

import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { normaliseImage } from "@/lib/files/image";
import { createUserClient } from "@/lib/supabase/server";
import type {
  categorySchema,
  commercialsSchema,
  productSchema,
  specSchema,
} from "@/modules/catalogue/schemas";
import { parseSellerProduct } from "@/modules/catalogue/schemas";

const IMAGE_BUCKET = "product-images";

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
  return data.map(parseSellerProduct);
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

export async function deleteProduct(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("delete_product", { p_id: id });
  if (error) throw toAppError(error);
  if (data.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(data);
}

export async function addProductImage(productId: string, file: File) {
  const image = await normaliseImage(Buffer.from(await file.arrayBuffer()));
  const supabase = await createUserClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new AppError("FORBIDDEN");

  const path = `${orgId}/${productId}/${randomUUID()}.webp`;
  const upload = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, image, { contentType: "image/webp" });
  if (upload.error) throw new AppError("SERVICE_UNAVAILABLE", { cause: upload.error });

  const { data, error } = await supabase.rpc("add_product_image", {
    p_id: productId,
    p_path: path,
  });
  if (error) {
    await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    throw toAppError(error);
  }
  return { id: data };
}

export async function removeProductImage(mediaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("remove_product_image", { p_media_id: mediaId });
  if (error) throw toAppError(error);
  await supabase.storage.from(IMAGE_BUCKET).remove([data]);
}

export async function requestCategory({ name, details }: { name: string; details: string }) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("request_category", {
    p_name: name,
    p_details: details,
  });
  if (error) throw toAppError(error);
  return { id: data };
}

export async function listPendingCategoryRequests() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_pending_category_requests");
  if (error) throw toAppError(error);
  return data;
}

export async function reviewCategoryRequest(id: string, approve: boolean, note: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_review_category_request", {
    p_id: id,
    p_approve: approve,
    p_note: note,
  });
  if (error) throw toAppError(error);
}

export async function listAdminCategories() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_categories");
  if (error) throw toAppError(error);
  return data;
}

export async function saveCategory(id: string | null, input: z.output<typeof categorySchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_save_category", {
    p_id: id,
    p_parent_id: input.parentId,
    p_name: input.name,
    p_slug: input.slug,
    p_description: input.description,
    p_is_active: input.isActive,
    p_sort_order: input.sortOrder,
  });
  if (error) throw toAppError(error);
  return { id: data };
}

export async function addSpec(categoryId: string, input: z.output<typeof specSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_add_spec", {
    p_category_id: categoryId,
    p_label: input.label,
    p_kind: input.kind,
    p_unit: input.unit,
    p_is_key: input.isKey,
    p_is_required: input.isRequired,
  });
  if (error) throw toAppError(error);
  return { id: data };
}
