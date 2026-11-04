import "server-only";

import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { prepareDocument } from "@/lib/files/document";
import { createUserClient } from "@/lib/supabase/server";
import {
  createdOrderSchema,
  orderContactsSchema,
  orderDetailSchema,
  orderQuoteResultSchema,
  type createOrderSchema,
  type dispatchSchema,
  type orderQuoteSchema,
} from "@/modules/orders/schemas";

const DOCUMENT_BUCKET = "order-documents";
const SIGNED_LINK_SECONDS = 300;

export async function quoteOrder(input: z.output<typeof orderQuoteSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("quote_order", {
    p_product_id: input.productId,
    p_quantity: Number(input.quantity),
  });
  if (error) throw toAppError(error);
  return orderQuoteResultSchema.parse(data);
}

export async function createOrder(input: z.output<typeof createOrderSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_product_id: input.productId,
    p_quantity: Number(input.quantity),
    p_expected_delivery_on: input.expectedDeliveryOn,
    p_consignee_name: input.consigneeName,
    p_consignee_gstin: input.consigneeGstin,
    p_delivery_address_id: input.deliveryAddressId,
    p_payment_terms: input.paymentTerms,
    p_credit_days: input.paymentTerms === "credit" ? Number(input.creditDays) : null,
  });
  if (error) throw toAppError(error);
  return createdOrderSchema.parse(data);
}

export async function listOrders() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("list_orders", { p_limit: 50 });
  if (error) throw toAppError(error);
  return data;
}

export async function getOrder(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_order", { p_id: id });
  if (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") return null;
    throw appError;
  }
  return orderDetailSchema.parse(data);
}

export async function getOrderContacts(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_order_contacts", { p_id: id });
  if (error) throw toAppError(error);
  return orderContactsSchema.parse(data);
}

export async function listDeliveryAddresses() {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("org_addresses")
    .select("id, label, line1, city, state_code")
    .order("created_at");
  if (error) throw toAppError(error);
  return data;
}

export async function getOwnParty() {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("legal_name, gstin, org_addresses (line1, line2, city, pincode, is_registered)")
    .single();
  if (error) throw toAppError(error);
  const address = data.org_addresses.find((item) => item.is_registered);
  return {
    legalName: data.legal_name,
    gstin: data.gstin,
    address: [address?.line1, address?.line2, address?.city, address?.pincode]
      .filter(Boolean)
      .join(", "),
  };
}

export async function acceptOrder(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("accept_order", { p_id: id });
  if (error) throw toAppError(error);
  return { chargeId: data };
}

export async function rejectOrder(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("reject_order", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function cancelOrder(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("cancel_order", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function uploadOrderFile(file: File, allowPdf: boolean, organisationId: string) {
  const document = await prepareDocument(Buffer.from(await file.arrayBuffer()), allowPdf);
  const path = `${organisationId}/${randomUUID()}.${document.extension}`;
  const supabase = await createUserClient();
  const upload = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, document.body, { contentType: document.mimeType });
  if (upload.error) throw new AppError("SERVICE_UNAVAILABLE", { cause: upload.error });
  const { data, error } = await supabase.rpc("register_order_file", {
    p_path: path,
    p_mime_type: document.mimeType,
    p_size_bytes: document.body.length,
    p_sha256: document.sha256,
  });
  if (error) throw toAppError(error);
  return { fileId: data };
}

export async function dispatchOrder(id: string, input: z.output<typeof dispatchSchema>) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("dispatch_order", {
    p_id: id,
    p_documents: [
      { kind: "product_bill", fileId: input.productBillFileId },
      { kind: "eway_bill", ...input.ewayBill },
      { kind: "transport_bill", ...input.transportBill },
    ],
  });
  if (error) throw toAppError(error);
}

export async function receiveOrder(id: string, fileId: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("receive_order", { p_id: id, p_file_id: fileId });
  if (error) throw toAppError(error);
}

export async function getOrderFileLink(id: string, kind: string) {
  const order = await getOrder(id);
  const document = order?.documents.find((item) => item.kind === kind);
  if (!document?.path || !document.readable) throw new AppError("NOT_FOUND");
  const supabase = await createUserClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.path, SIGNED_LINK_SECONDS);
  if (error) throw new AppError("NOT_FOUND", { cause: error });
  return data.signedUrl;
}
