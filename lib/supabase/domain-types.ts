import type { Database as GeneratedDatabase, Enums, Json } from "@/lib/supabase/database.types";

export type OrgKind = Enums<"org_kind">;
export type EntityType = Enums<"entity_type">;
export type OrgStatus = Enums<"org_status">;
export type UserRole = Enums<"user_role">;
export type ProductStatus = Enums<"product_status">;
export type OrderStatus = Enums<"order_status">;

/** Temporary until the auction migration is live and the database types are regenerated. */
type AuctionFunctions = {
  place_ra_bid: {
    Args: { p_id: string; p_unit_paise: number; p_idempotency_key: string };
    Returns: Json;
  };
  seller_auction: { Args: { p_id: string }; Returns: Json };
  buyer_auction: { Args: { p_id: string }; Returns: Json };
};

type Functions = GeneratedDatabase["public"]["Functions"] & AuctionFunctions;
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
      | "create_tender"
    > & {
      save_product: WithNullableArgs<"save_product", "p_id">;
      admin_save_category: WithNullableArgs<"admin_save_category", "p_id" | "p_parent_id">;
      apply_payment_event: WithNullableArgs<"apply_payment_event", "p_event_id">;
      finish_outbox: WithNullableArgs<"finish_outbox", "p_error">;
      create_order: WithNullableArgs<"create_order", "p_credit_days">;
      create_tender: {
        Args: WithNullableArgs<
          "create_tender",
          "p_product_id" | "p_category_id" | "p_estimate_unit_paise" | "p_credit_days"
        >["Args"] & {
          p_type?: "bid" | "ra";
          p_ra_starts_at?: string;
          p_ra_ends_at?: string;
        };
        Returns: string;
      };
    };
  };
};
