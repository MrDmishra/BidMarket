export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
          ip: unknown;
          org_id: string | null;
          reason: string | null;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: never;
          ip?: unknown;
          org_id?: string | null;
          reason?: string | null;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          ip?: unknown;
          org_id?: string | null;
          reason?: string | null;
          request_id?: string | null;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          account_last4: string;
          account_no_enc: string;
          created_at: string;
          holder_name: string;
          id: string;
          ifsc: string;
          is_primary: boolean;
          org_id: string;
          verified_at: string | null;
        };
        Insert: {
          account_last4: string;
          account_no_enc: string;
          created_at?: string;
          holder_name: string;
          id?: string;
          ifsc: string;
          is_primary?: boolean;
          org_id: string;
          verified_at?: string | null;
        };
        Update: {
          account_last4?: string;
          account_no_enc?: string;
          created_at?: string;
          holder_name?: string;
          id?: string;
          ifsc?: string;
          is_primary?: boolean;
          org_id?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bank_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      category_requests: {
        Row: {
          created_at: string;
          details: string;
          id: string;
          name: string;
          review_note: string | null;
          reviewed_by: string | null;
          seller_org_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details: string;
          id?: string;
          name: string;
          review_note?: string | null;
          reviewed_by?: string | null;
          seller_org_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string;
          id?: string;
          name?: string;
          review_note?: string | null;
          reviewed_by?: string | null;
          seller_org_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "category_requests_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      consents: {
        Row: {
          accepted_at: string;
          id: string;
          policy_version: string;
          purpose: string;
          user_id: string;
          withdrawn_at: string | null;
        };
        Insert: {
          accepted_at?: string;
          id?: string;
          policy_version: string;
          purpose: string;
          user_id: string;
          withdrawn_at?: string | null;
        };
        Update: {
          accepted_at?: string;
          id?: string;
          policy_version?: string;
          purpose?: string;
          user_id?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          created_at: string;
          key: string;
          request_hash: string;
          response_body: Json | null;
          response_status: number | null;
          route: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          key: string;
          request_hash: string;
          response_body?: Json | null;
          response_status?: number | null;
          route: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          key?: string;
          request_hash?: string;
          response_body?: Json | null;
          response_status?: number | null;
          route?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      org_addresses: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          is_registered: boolean;
          label: string;
          line1: string;
          line2: string | null;
          org_id: string;
          pincode: string;
          state_code: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          id?: string;
          is_registered?: boolean;
          label: string;
          line1: string;
          line2?: string | null;
          org_id: string;
          pincode: string;
          state_code: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          is_registered?: boolean;
          label?: string;
          line1?: string;
          line2?: string | null;
          org_id?: string;
          pincode?: string;
          state_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_addresses_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      organisations: {
        Row: {
          blocked_until: string | null;
          cin_llpin: string | null;
          created_at: string;
          entity_type: Database["public"]["Enums"]["entity_type"];
          gstin: string | null;
          id: string;
          incorporated_on: string | null;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name: string;
          maintenance: boolean;
          pan_enc: string | null;
          pan_hmac: string | null;
          pan_last4: string | null;
          status: Database["public"]["Enums"]["org_status"];
          strike_count: number;
          strikes_reset_at: string | null;
          updated_at: string;
        };
        Insert: {
          blocked_until?: string | null;
          cin_llpin?: string | null;
          created_at?: string;
          entity_type: Database["public"]["Enums"]["entity_type"];
          gstin?: string | null;
          id?: string;
          incorporated_on?: string | null;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name: string;
          maintenance?: boolean;
          pan_enc?: string | null;
          pan_hmac?: string | null;
          pan_last4?: string | null;
          status?: Database["public"]["Enums"]["org_status"];
          strike_count?: number;
          strikes_reset_at?: string | null;
          updated_at?: string;
        };
        Update: {
          blocked_until?: string | null;
          cin_llpin?: string | null;
          created_at?: string;
          entity_type?: Database["public"]["Enums"]["entity_type"];
          gstin?: string | null;
          id?: string;
          incorporated_on?: string | null;
          kind?: Database["public"]["Enums"]["org_kind"];
          legal_name?: string;
          maintenance?: boolean;
          pan_enc?: string | null;
          pan_hmac?: string | null;
          pan_last4?: string | null;
          status?: Database["public"]["Enums"]["org_status"];
          strike_count?: number;
          strikes_reset_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      otp_attempts: {
        Row: {
          id: string;
          locked_until: string | null;
          phone_or_email_hmac: string;
          purpose: string;
          resend_count: number;
          sent_at: string;
        };
        Insert: {
          id?: string;
          locked_until?: string | null;
          phone_or_email_hmac: string;
          purpose: string;
          resend_count?: number;
          sent_at?: string;
        };
        Update: {
          id?: string;
          locked_until?: string | null;
          phone_or_email_hmac?: string;
          purpose?: string;
          resend_count?: number;
          sent_at?: string;
        };
        Relationships: [];
      };
      product_media: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_spec_values: {
        Row: {
          product_id: string;
          spec_definition_id: string;
          value_number: number | null;
          value_text: string | null;
        };
        Insert: {
          product_id: string;
          spec_definition_id: string;
          value_number?: number | null;
          value_text?: string | null;
        };
        Update: {
          product_id?: string;
          spec_definition_id?: string;
          value_number?: number | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_spec_values_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_spec_values_spec_definition_id_fkey";
            columns: ["spec_definition_id"];
            isOneToOne: false;
            referencedRelation: "spec_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      product_states: {
        Row: {
          product_id: string;
          state_code: string;
        };
        Insert: {
          product_id: string;
          state_code: string;
        };
        Update: {
          product_id?: string;
          state_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_states_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          discount_bps: number;
          display_no: string;
          id: string;
          mrp_paise: number;
          net_paise: number | null;
          order_count: number;
          review_note: string | null;
          search: unknown;
          seller_org_id: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_qty: number;
          title: string;
          unit: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          discount_bps?: number;
          display_no?: string;
          id?: string;
          mrp_paise: number;
          net_paise?: number | null;
          order_count?: number;
          review_note?: string | null;
          search?: unknown;
          seller_org_id: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_qty?: number;
          title: string;
          unit: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          discount_bps?: number;
          display_no?: string;
          id?: string;
          mrp_paise?: number;
          net_paise?: number | null;
          order_count?: number;
          review_note?: string | null;
          search?: unknown;
          seller_org_id?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_qty?: number;
          title?: string;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          designation: string | null;
          email: string | null;
          full_name: string | null;
          org_id: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          designation?: string | null;
          email?: string | null;
          full_name?: string | null;
          org_id?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          designation?: string | null;
          email?: string | null;
          full_name?: string | null;
          org_id?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_counters: {
        Row: {
          hits: number;
          user_id: string;
          window_start: string;
        };
        Insert: {
          hits?: number;
          user_id: string;
          window_start: string;
        };
        Update: {
          hits?: number;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      spec_definitions: {
        Row: {
          allowed_values: Json | null;
          category_id: string;
          created_at: string;
          id: string;
          is_key: boolean;
          is_required: boolean;
          key: string;
          kind: Database["public"]["Enums"]["spec_kind"];
          label: string;
          max_value: number | null;
          min_value: number | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          allowed_values?: Json | null;
          category_id: string;
          created_at?: string;
          id?: string;
          is_key?: boolean;
          is_required?: boolean;
          key: string;
          kind?: Database["public"]["Enums"]["spec_kind"];
          label: string;
          max_value?: number | null;
          min_value?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          allowed_values?: Json | null;
          category_id?: string;
          created_at?: string;
          id?: string;
          is_key?: boolean;
          is_required?: boolean;
          key?: string;
          kind?: Database["public"]["Enums"]["spec_kind"];
          label?: string;
          max_value?: number | null;
          min_value?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spec_definitions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      turnover_declarations: {
        Row: {
          amount_paise: number;
          created_at: string;
          financial_year: string;
          id: string;
          org_id: string;
        };
        Insert: {
          amount_paise: number;
          created_at?: string;
          financial_year: string;
          id?: string;
          org_id: string;
        };
        Update: {
          amount_paise?: number;
          created_at?: string;
          financial_year?: string;
          id?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "turnover_declarations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          checked_at: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["verification_kind"];
          org_id: string;
          provider: string | null;
          provider_ref: string | null;
          result: Json;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_status"];
        };
        Insert: {
          checked_at?: string | null;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["verification_kind"];
          org_id: string;
          provider?: string | null;
          provider_ref?: string | null;
          result?: Json;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          checked_at?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["verification_kind"];
          org_id?: string;
          provider?: string | null;
          provider_ref?: string | null;
          result?: Json;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "verifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_bank_account: {
        Args: { p_account_no: string; p_holder_name: string; p_ifsc: string };
        Returns: string;
      };
      add_product_image: {
        Args: { p_id: string; p_path: string };
        Returns: string;
      };
      add_registered_address: {
        Args: {
          p_city: string;
          p_line1: string;
          p_line2: string;
          p_pincode: string;
          p_state_code: string;
        };
        Returns: string;
      };
      admin_add_spec: {
        Args: {
          p_category_id: string;
          p_is_key: boolean;
          p_is_required: boolean;
          p_kind: Database["public"]["Enums"]["spec_kind"];
          p_label: string;
          p_unit: string;
        };
        Returns: string;
      };
      admin_categories: {
        Args: never;
        Returns: {
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          parent_id: string;
          slug: string;
          sort_order: number;
        }[];
      };
      admin_payment_pending_sellers: {
        Args: never;
        Returns: {
          gstin: string;
          id: string;
          legal_name: string;
        }[];
      };
      admin_pending_category_requests: {
        Args: never;
        Returns: {
          created_at: string;
          details: string;
          id: string;
          name: string;
          seller_name: string;
        }[];
      };
      admin_pending_organisations: {
        Args: never;
        Returns: {
          created_at: string;
          entity_type: Database["public"]["Enums"]["entity_type"];
          gstin: string;
          id: string;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name: string;
          pan_last4: string;
        }[];
      };
      admin_pending_products: {
        Args: never;
        Returns: {
          category_name: string;
          description: string;
          discount_bps: number;
          display_no: string;
          id: string;
          mrp_paise: number;
          net_paise: number;
          seller_name: string;
          stock_qty: number;
          title: string;
          unit: string;
        }[];
      };
      admin_review_category_request: {
        Args: { p_approve: boolean; p_id: string; p_note: string };
        Returns: undefined;
      };
      admin_review_organisation: {
        Args: { p_approve: boolean; p_org_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_review_product: {
        Args: { p_decision: string; p_id: string; p_note: string };
        Returns: undefined;
      };
      admin_save_category: {
        Args: {
          p_description: string;
          p_id: string;
          p_is_active: boolean;
          p_name: string;
          p_parent_id: string;
          p_slug: string;
          p_sort_order: number;
        };
        Returns: string;
      };
      admin_test_activate_seller: {
        Args: { p_org_id: string; p_reason: string };
        Returns: undefined;
      };
      api_begin: {
        Args: { p_hash: string; p_key: string; p_route: string };
        Returns: Json;
      };
      api_finish: {
        Args: { p_body: Json; p_key: string; p_status: number };
        Returns: undefined;
      };
      category_spec_values: {
        Args: { p_category_slug: string };
        Returns: {
          label: string;
          spec_id: string;
          value: string;
        }[];
      };
      create_organisation: {
        Args: {
          p_entity_type: Database["public"]["Enums"]["entity_type"];
          p_kind: Database["public"]["Enums"]["org_kind"];
          p_legal_name: string;
          p_policy_version: string;
        };
        Returns: string;
      };
      current_org_id: { Args: never; Returns: string };
      delete_product: { Args: { p_id: string }; Returns: string[] };
      health_check: { Args: never; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      public_product: {
        Args: { p_id: string };
        Returns: {
          category_name: string;
          category_slug: string;
          city: string;
          delivery_states: string[];
          description: string;
          discount_bps: number;
          display_no: string;
          id: string;
          image_paths: string[];
          mrp_paise: number;
          net_paise: number;
          specs: Json;
          state_code: string;
          stock_qty: number;
          title: string;
          unit: string;
        }[];
      };
      remove_product_image: { Args: { p_media_id: string }; Returns: string };
      request_category: {
        Args: { p_details: string; p_name: string };
        Returns: string;
      };
      save_business_identity: {
        Args: { p_gstin: string; p_incorporated_on?: string; p_pan: string };
        Returns: undefined;
      };
      save_product: {
        Args: {
          p_category_id: string;
          p_description: string;
          p_discount_bps: number;
          p_id: string;
          p_mrp_paise: number;
          p_specs: Json;
          p_state_codes: string[];
          p_stock_qty: number;
          p_title: string;
          p_unit: string;
        };
        Returns: string;
      };
      save_turnover: { Args: { p_years: Json }; Returns: undefined };
      search_products: {
        Args: {
          p_category_slug?: string;
          p_limit?: number;
          p_offset?: number;
          p_query?: string;
          p_sort?: string;
          p_spec_id?: string;
          p_spec_value?: string;
          p_state_code?: string;
        };
        Returns: {
          category_name: string;
          category_slug: string;
          city: string;
          discount_bps: number;
          display_no: string;
          id: string;
          image_path: string;
          mrp_paise: number;
          net_paise: number;
          state_code: string;
          title: string;
          unit: string;
        }[];
      };
      seller_products: {
        Args: never;
        Returns: {
          category_id: string;
          category_name: string;
          description: string;
          discount_bps: number;
          display_no: string;
          id: string;
          images: Json;
          mrp_paise: number;
          net_paise: number;
          review_note: string;
          specs: Json;
          state_codes: string[];
          status: Database["public"]["Enums"]["product_status"];
          stock_qty: number;
          title: string;
          unit: string;
        }[];
      };
      set_product_visibility: {
        Args: { p_id: string; p_visible: boolean };
        Returns: undefined;
      };
      submit_organisation: {
        Args: never;
        Returns: Database["public"]["Enums"]["org_status"];
      };
      submit_product: { Args: { p_id: string }; Returns: undefined };
      update_product_commercials: {
        Args: {
          p_discount_bps: number;
          p_id: string;
          p_mrp_paise: number;
          p_stock_qty: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      entity_type:
        "individual" | "proprietorship" | "partnership" | "trust_society" | "llp" | "company";
      org_kind: "buyer" | "seller";
      org_status:
        "draft" | "pending_payment" | "pending_review" | "active" | "suspended" | "rejected";
      product_status: "draft" | "pending" | "notify" | "published" | "unpublished" | "rejected";
      spec_kind: "text" | "number" | "enum";
      user_role: "org_user" | "admin";
      verification_kind: "pan" | "gstin" | "bank" | "cin" | "identity";
      verification_status: "pending" | "verified" | "failed" | "manual_review";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      entity_type: [
        "individual",
        "proprietorship",
        "partnership",
        "trust_society",
        "llp",
        "company",
      ],
      org_kind: ["buyer", "seller"],
      org_status: ["draft", "pending_payment", "pending_review", "active", "suspended", "rejected"],
      product_status: ["draft", "pending", "notify", "published", "unpublished", "rejected"],
      spec_kind: ["text", "number", "enum"],
      user_role: ["org_user", "admin"],
      verification_kind: ["pan", "gstin", "bank", "cin", "identity"],
      verification_status: ["pending", "verified", "failed", "manual_review"],
    },
  },
} as const;
