import type { Database as GeneratedDatabase, Enums, Json } from "@/lib/supabase/database.types";

export type OrgKind = Enums<"org_kind">;
export type EntityType = Enums<"entity_type">;
export type OrgStatus = Enums<"org_status">;
export type UserRole = Enums<"user_role">;
export type ProductStatus = Enums<"product_status">;
export type OrderStatus = Enums<"order_status">;

type TenderStatus =
  | "draft"
  | "unpaid"
  | "bidding"
  | "evaluating"
  | "shortlisting"
  | "auction_scheduled"
  | "auction"
  | "awarding"
  | "ordered"
  | "cancelled";
/** Temporary until the tender migration is live and the database types are regenerated. */
type TenderFunctions = {
  create_tender: {
    Args: {
      p_kind: "regular" | "custom";
      p_product_id: string | null;
      p_category_id: string | null;
      p_title: string;
      p_unit: string;
      p_quantity: number;
      p_estimate_unit_paise: number | null;
      p_specs: Json;
      p_payment_terms: "advance" | "on_delivery" | "credit";
      p_credit_days: number | null;
      p_consignee_name: string;
      p_consignee_gstin: string;
      p_consignee_address_id: string;
      p_contract_months: number;
      p_bid_ends_at: string;
      p_min_bids: number;
      p_extensions_allowed: number;
      p_extension_minutes: number;
    };
    Returns: string;
  };
  publish_tender: { Args: { p_id: string }; Returns: string };
  cancel_tender: { Args: { p_id: string; p_reason: string }; Returns: undefined };
  submit_bid: { Args: { p_id: string; p_unit_paise: number }; Returns: string };
  withdraw_bid: { Args: { p_id: string }; Returns: undefined };
  tender_bids: {
    Args: { p_id: string };
    Returns: { rank: number; unit_paise: number; total_paise: number; placed_at: string }[];
  };
  award_tender: { Args: { p_id: string; p_rank: number }; Returns: string };
  accept_award: { Args: { p_id: string }; Returns: string };
  reject_award: { Args: { p_id: string; p_reason: string }; Returns: undefined };
  tick_tenders: { Args: never; Returns: number };
  public_tenders: {
    Args: { p_limit?: number; p_offset?: number };
    Returns: {
      id: string;
      tender_no: string;
      title: string;
      category_name: string;
      quantity: number;
      unit: string;
      delivery_state_code: string;
      bid_ends_at: string;
    }[];
  };
  public_tender: { Args: { p_id: string }; Returns: Json };
  buyer_tenders: {
    Args: never;
    Returns: {
      id: string;
      tender_no: string;
      title: string;
      status: TenderStatus;
      bid_ends_at: string;
    }[];
  };
  get_buyer_tender: { Args: { p_id: string }; Returns: Json };
  seller_tenders: {
    Args: never;
    Returns: {
      id: string;
      tender_no: string;
      title: string;
      category_name: string;
      quantity: number;
      unit: string;
      delivery_state_code: string;
      bid_ends_at: string;
      my_bid_paise: number | null;
      award_status: string | null;
    }[];
  };
  get_seller_tender: { Args: { p_id: string }; Returns: Json };
};

type Functions = GeneratedDatabase["public"]["Functions"] & TenderFunctions;
type WithNullableArgs<Name extends keyof Functions, Arg extends keyof Functions[Name]["Args"]> = {
  Args: Omit<Functions[Name]["Args"], Arg> & { [Key in Arg]: Functions[Name]["Args"][Key] | null };
  Returns: Functions[Name]["Returns"];
};

/** The generator marks every function argument as required text, but these accept null. */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: Omit<
      Functions,
      | "save_product"
      | "admin_save_category"
      | "apply_payment_event"
      | "finish_outbox"
      | "create_order"
    > & {
      save_product: WithNullableArgs<"save_product", "p_id">;
      admin_save_category: WithNullableArgs<"admin_save_category", "p_id" | "p_parent_id">;
      apply_payment_event: WithNullableArgs<"apply_payment_event", "p_event_id">;
      finish_outbox: WithNullableArgs<"finish_outbox", "p_error">;
      create_order: WithNullableArgs<"create_order", "p_credit_days">;
    };
  };
};
