import type { Database as GeneratedDatabase, Enums, Json } from "@/lib/supabase/database.types";

export type OrgKind = Enums<"org_kind">;
export type EntityType = Enums<"entity_type">;
export type OrgStatus = Enums<"org_status">;
export type UserRole = Enums<"user_role">;
export type ProductStatus = Enums<"product_status">;
export type OrderStatus =
  "unpaid" | "awaiting_seller" | "accepted" | "dispatched" | "completed" | "cancelled";

/** Temporary until the orders migration is live and the database types are regenerated. */
type OrderFunctions = {
  quote_order: { Args: { p_product_id: string; p_quantity: number }; Returns: Json };
  create_order: {
    Args: {
      p_product_id: string;
      p_quantity: number;
      p_expected_delivery_on: string;
      p_consignee_name: string;
      p_consignee_gstin: string;
      p_delivery_address_id: string;
      p_payment_terms: "advance" | "on_delivery" | "credit";
      p_credit_days: number | null;
    };
    Returns: Json;
  };
  list_orders: {
    Args: { p_limit?: number; p_offset?: number };
    Returns: {
      id: string;
      order_no: string;
      title: string;
      quantity: number;
      unit: string;
      total_paise: number;
      status: OrderStatus;
      created_at: string;
    }[];
  };
  get_order: { Args: { p_id: string }; Returns: Json };
  get_order_contacts: { Args: { p_id: string }; Returns: Json };
  accept_order: { Args: { p_id: string }; Returns: string };
  reject_order: { Args: { p_id: string; p_reason: string }; Returns: undefined };
  cancel_order: { Args: { p_id: string; p_reason: string }; Returns: undefined };
  register_order_file: {
    Args: { p_path: string; p_mime_type: string; p_size_bytes: number; p_sha256: string };
    Returns: string;
  };
  dispatch_order: { Args: { p_id: string; p_documents: Json }; Returns: undefined };
  receive_order: { Args: { p_id: string; p_file_id: string }; Returns: undefined };
  expire_unpaid_orders: { Args: never; Returns: number };
};

type Functions = GeneratedDatabase["public"]["Functions"] & OrderFunctions;
type WithNullableArgs<Name extends keyof Functions, Arg extends keyof Functions[Name]["Args"]> = {
  Args: Omit<Functions[Name]["Args"], Arg> & { [Key in Arg]: Functions[Name]["Args"][Key] | null };
  Returns: Functions[Name]["Returns"];
};

/** The generator marks every function argument as required text, but these accept null. */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: Omit<
      Functions,
      "save_product" | "admin_save_category" | "apply_payment_event" | "finish_outbox"
    > & {
      save_product: WithNullableArgs<"save_product", "p_id">;
      admin_save_category: WithNullableArgs<"admin_save_category", "p_id" | "p_parent_id">;
      apply_payment_event: WithNullableArgs<"apply_payment_event", "p_event_id">;
      finish_outbox: WithNullableArgs<"finish_outbox", "p_error">;
    };
  };
};
