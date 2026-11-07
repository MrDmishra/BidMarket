import "server-only";

import type { z } from "zod";
import { toAppError } from "@/lib/errors/database";
import { createUserClient } from "@/lib/supabase/server";
import {
  incidentSchema,
  ticketSchema,
  type raiseIncidentSchema,
  type raiseTicketSchema,
} from "@/modules/support/schemas";

export async function raiseIncident(input: z.output<typeof raiseIncidentSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("raise_incident", {
    p_order_id: input.orderId ?? null,
    p_tender_id: input.tenderId ?? null,
    p_product_id: input.productId ?? null,
    p_description: input.description,
  });
  if (error) throw toAppError(error);
  return { incidentId: data };
}

export async function listMyIncidents() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("my_incidents");
  if (error) throw toAppError(error);
  return data;
}

export async function getIncident(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_incident", { p_id: id });
  if (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") return null;
    throw appError;
  }
  return incidentSchema.parse(data);
}

export async function addIncidentMessage(id: string, body: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("add_incident_message", { p_id: id, p_body: body });
  if (error) throw toAppError(error);
  return { messageId: data };
}

export async function raiseTicket(input: z.output<typeof raiseTicketSchema>) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("raise_ticket", {
    p_type: input.type,
    p_subcategory: input.subcategory ?? "",
    p_description: input.description,
  });
  if (error) throw toAppError(error);
  return { ticketId: data };
}

export async function listMyTickets() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("my_tickets");
  if (error) throw toAppError(error);
  return data;
}

export async function getTicket(id: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("get_ticket", { p_id: id });
  if (error) {
    const appError = toAppError(error);
    if (appError.code === "NOT_FOUND") return null;
    throw appError;
  }
  return ticketSchema.parse(data);
}

export async function addTicketMessage(id: string, body: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("add_ticket_message", { p_id: id, p_body: body });
  if (error) throw toAppError(error);
  return { messageId: data };
}

export async function listMyAttention() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("my_attention");
  if (error) throw toAppError(error);
  return data;
}
