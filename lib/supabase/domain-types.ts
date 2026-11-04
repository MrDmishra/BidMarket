import type { Database as GeneratedDatabase, Enums } from "@/lib/supabase/database.types";

export type OrgKind = Enums<"org_kind">;
export type EntityType = Enums<"entity_type">;
export type OrgStatus = Enums<"org_status">;
export type UserRole = Enums<"user_role">;
export type ProductStatus = Enums<"product_status">;

type Functions = GeneratedDatabase["public"]["Functions"];
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
