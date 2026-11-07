import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import type { Enums } from "@/lib/supabase/database.types";
import { createUserClient } from "@/lib/supabase/server";
import { organisationDetailSchema, overviewSchema } from "@/modules/admin/schemas";

// Every write below needs an admin with the second factor. The database checks both and logs the reason.

export async function getOverview() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw toAppError(error);
  return overviewSchema.parse(data);
}

export async function listOrganisations(search?: string, status?: Enums<"org_status">) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_organisations", {
    p_search: search ?? "",
    ...(status ? { p_status: status } : {}),
  });
  if (error) throw toAppError(error);
  return data;
}

export async function getOrganisation(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_organisation", { p_id: id });
  if (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") return null;
    throw appError;
  }
  return organisationDetailSchema.parse(data);
}

export async function setOrganisationStatus(
  id: string,
  action: "suspend" | "reinstate",
  reason: string,
) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_set_org_status", {
    p_id: id,
    p_action: action,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}

export async function blockOrganisation(id: string, days: number | null, reason: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_block_org", {
    p_id: id,
    p_days: days,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
  return { penaltyId: data };
}

export async function liftBlock(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_lift_block", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function waivePenalty(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_waive_penalty", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function listIncidents(status?: Enums<"incident_status">) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_incidents", status ? { p_status: status } : {});
  if (error) throw toAppError(error);
  return data;
}

export async function decideIncident(id: string, decision: string, close: boolean, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_decide_incident", {
    p_id: id,
    p_decision: decision,
    p_close: close,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}

export async function listTickets(status?: Enums<"ticket_status">) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_tickets", status ? { p_status: status } : {});
  if (error) throw toAppError(error);
  return data;
}

export async function resolveTicket(id: string, resolution: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_resolve_ticket", {
    p_id: id,
    p_resolution: resolution,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}

export async function listTenders(status?: Enums<"tender_status">) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_tenders", status ? { p_status: status } : {});
  if (error) throw toAppError(error);
  return data;
}

export async function cancelTenderAsAdmin(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_cancel_tender", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function pauseAuction(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_pause_auction", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function resumeAuction(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_resume_auction", { p_id: id, p_reason: reason });
  if (error) throw toAppError(error);
}

export async function listOrders(status?: Enums<"order_status">) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_orders", status ? { p_status: status } : {});
  if (error) throw toAppError(error);
  return data;
}

export async function searchAuditLog(filters: {
  entityType?: string;
  entityId?: string;
  action?: string;
  before?: number;
}) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_audit_log", {
    p_entity_type: filters.entityType ?? "",
    p_entity_id: filters.entityId ?? "",
    p_action: filters.action ?? "",
    ...(filters.before ? { p_before: filters.before } : {}),
  });
  if (error) throw toAppError(error);
  return data;
}

const DOCUMENT_BUCKET = "order-documents";
const SIGNED_LINK_SECONDS = 300;

export async function listPendingFiles() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_pending_files");
  if (error) throw toAppError(error);
  return data;
}

export async function reviewFile(id: string, clean: boolean, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_review_file", {
    p_id: id,
    p_clean: clean,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}

/** Row-level security lets only the owner and admins read the file row, and storage checks the same. */
export async function getFileLinkForReview(id: string) {
  const supabase = await createUserClient();
  const { data: file, error } = await supabase
    .from("files")
    .select("bucket, path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!file || file.bucket !== DOCUMENT_BUCKET) throw new AppError("NOT_FOUND");
  const { data, error: linkError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(file.path, SIGNED_LINK_SECONDS);
  if (linkError) throw new AppError("NOT_FOUND", { cause: linkError });
  return data.signedUrl;
}
