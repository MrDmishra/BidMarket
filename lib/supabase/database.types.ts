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
      bids: {
        Row: {
          id: string;
          idempotency_key: string | null;
          phase: string;
          placed_at: string;
          seller_org_id: string;
          tender_id: string;
          unit_paise: number;
          withdrawn_at: string | null;
        };
        Insert: {
          id?: string;
          idempotency_key?: string | null;
          phase?: string;
          placed_at?: string;
          seller_org_id: string;
          tender_id: string;
          unit_paise: number;
          withdrawn_at?: string | null;
        };
        Update: {
          id?: string;
          idempotency_key?: string | null;
          phase?: string;
          placed_at?: string;
          seller_org_id?: string;
          tender_id?: string;
          unit_paise?: number;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bids_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
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
      fee_charges: {
        Row: {
          base_paise: number;
          cgst_paise: number;
          created_at: string;
          fee_paise: number;
          id: string;
          igst_paise: number;
          kind: Database["public"]["Enums"]["charge_kind"];
          order_id: string | null;
          org_id: string;
          rate_bps: number;
          settings_id: string;
          sgst_paise: number;
          status: Database["public"]["Enums"]["charge_status"];
          subscription_id: string | null;
          tds_paise: number;
          tender_id: string | null;
          total_paise: number;
        };
        Insert: {
          base_paise: number;
          cgst_paise?: number;
          created_at?: string;
          fee_paise: number;
          id?: string;
          igst_paise?: number;
          kind: Database["public"]["Enums"]["charge_kind"];
          order_id?: string | null;
          org_id: string;
          rate_bps: number;
          settings_id: string;
          sgst_paise?: number;
          status?: Database["public"]["Enums"]["charge_status"];
          subscription_id?: string | null;
          tds_paise?: number;
          tender_id?: string | null;
          total_paise: number;
        };
        Update: {
          base_paise?: number;
          cgst_paise?: number;
          created_at?: string;
          fee_paise?: number;
          id?: string;
          igst_paise?: number;
          kind?: Database["public"]["Enums"]["charge_kind"];
          order_id?: string | null;
          org_id?: string;
          rate_bps?: number;
          settings_id?: string;
          sgst_paise?: number;
          status?: Database["public"]["Enums"]["charge_status"];
          subscription_id?: string | null;
          tds_paise?: number;
          tender_id?: string | null;
          total_paise?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fee_charges_order_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_charges_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_charges_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "platform_settings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_charges_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_charges_tender_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      files: {
        Row: {
          bucket: string;
          created_at: string;
          id: string;
          mime_type: string;
          owner_org_id: string;
          path: string;
          scan_status: Database["public"]["Enums"]["file_scan_status"];
          sha256: string;
          size_bytes: number;
          uploaded_by: string;
        };
        Insert: {
          bucket: string;
          created_at?: string;
          id?: string;
          mime_type: string;
          owner_org_id: string;
          path: string;
          scan_status?: Database["public"]["Enums"]["file_scan_status"];
          sha256: string;
          size_bytes: number;
          uploaded_by: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: string;
          mime_type?: string;
          owner_org_id?: string;
          path?: string;
          scan_status?: Database["public"]["Enums"]["file_scan_status"];
          sha256?: string;
          size_bytes?: number;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_owner_org_id_fkey";
            columns: ["owner_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_uploaded_by_fkey";
            columns: ["uploaded_by"];
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
      incidents: {
        Row: {
          against_org_id: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision: string | null;
          description: string;
          id: string;
          order_id: string | null;
          product_id: string | null;
          raised_by: string;
          raised_by_org_id: string;
          ref_no: string;
          status: Database["public"]["Enums"]["incident_status"];
          tender_id: string | null;
        };
        Insert: {
          against_org_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: string | null;
          description: string;
          id?: string;
          order_id?: string | null;
          product_id?: string | null;
          raised_by: string;
          raised_by_org_id: string;
          ref_no: string;
          status?: Database["public"]["Enums"]["incident_status"];
          tender_id?: string | null;
        };
        Update: {
          against_org_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: string | null;
          description?: string;
          id?: string;
          order_id?: string | null;
          product_id?: string | null;
          raised_by?: string;
          raised_by_org_id?: string;
          ref_no?: string;
          status?: Database["public"]["Enums"]["incident_status"];
          tender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_against_org_id_fkey";
            columns: ["against_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_raised_by_org_id_fkey";
            columns: ["raised_by_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          from_support: boolean;
          id: string;
          incident_id: string | null;
          ticket_id: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          from_support?: boolean;
          id?: string;
          incident_id?: string | null;
          ticket_id?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          from_support?: boolean;
          id?: string;
          incident_id?: string | null;
          ticket_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      number_sequences: {
        Row: {
          financial_year: string;
          name: string;
          next_value: number;
        };
        Insert: {
          financial_year: string;
          name: string;
          next_value?: number;
        };
        Update: {
          financial_year?: string;
          name?: string;
          next_value?: number;
        };
        Relationships: [];
      };
      order_documents: {
        Row: {
          file_id: string | null;
          id: string;
          kind: string;
          not_applicable_reason: string | null;
          order_id: string;
          reference_no: string | null;
        };
        Insert: {
          file_id?: string | null;
          id?: string;
          kind: string;
          not_applicable_reason?: string | null;
          order_id: string;
          reference_no?: string | null;
        };
        Update: {
          file_id?: string | null;
          id?: string;
          kind?: string;
          not_applicable_reason?: string | null;
          order_id?: string;
          reference_no?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_documents_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_documents_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          note: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          note?: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          note?: string | null;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          buyer_org_id: string;
          consignee_gstin: string | null;
          consignee_name: string;
          contacts_unlocked_at: string | null;
          created_at: string;
          credit_days: number | null;
          delivery_address: Json;
          expected_delivery_on: string | null;
          id: string;
          order_no: string;
          payment_terms: Database["public"]["Enums"]["payment_terms"];
          product_id: string | null;
          quantity: number;
          seller_org_id: string;
          settings_id: string;
          source: Database["public"]["Enums"]["order_source"];
          spec_snapshot: Json;
          status: Database["public"]["Enums"]["order_status"];
          tender_id: string | null;
          title: string;
          total_paise: number;
          unit: string;
          unit_paise: number;
        };
        Insert: {
          buyer_org_id: string;
          consignee_gstin?: string | null;
          consignee_name: string;
          contacts_unlocked_at?: string | null;
          created_at?: string;
          credit_days?: number | null;
          delivery_address: Json;
          expected_delivery_on?: string | null;
          id?: string;
          order_no: string;
          payment_terms: Database["public"]["Enums"]["payment_terms"];
          product_id?: string | null;
          quantity: number;
          seller_org_id: string;
          settings_id: string;
          source?: Database["public"]["Enums"]["order_source"];
          spec_snapshot?: Json;
          status?: Database["public"]["Enums"]["order_status"];
          tender_id?: string | null;
          title: string;
          total_paise: number;
          unit: string;
          unit_paise: number;
        };
        Update: {
          buyer_org_id?: string;
          consignee_gstin?: string | null;
          consignee_name?: string;
          contacts_unlocked_at?: string | null;
          created_at?: string;
          credit_days?: number | null;
          delivery_address?: Json;
          expected_delivery_on?: string | null;
          id?: string;
          order_no?: string;
          payment_terms?: Database["public"]["Enums"]["payment_terms"];
          product_id?: string | null;
          quantity?: number;
          seller_org_id?: string;
          settings_id?: string;
          source?: Database["public"]["Enums"]["order_source"];
          spec_snapshot?: Json;
          status?: Database["public"]["Enums"]["order_status"];
          tender_id?: string | null;
          title?: string;
          total_paise?: number;
          unit?: string;
          unit_paise?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "platform_settings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_tender_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
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
      outbox: {
        Row: {
          attempts: number;
          channel: string;
          dedupe_key: string;
          id: string;
          last_error: string | null;
          next_attempt_at: string;
          payload: Json;
          recipient_user_id: string;
          status: string;
          template: string;
        };
        Insert: {
          attempts?: number;
          channel?: string;
          dedupe_key: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload?: Json;
          recipient_user_id: string;
          status?: string;
          template: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          dedupe_key?: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload?: Json;
          recipient_user_id?: string;
          status?: string;
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_paise: number;
          charge_id: string;
          created_at: string;
          failure_reason: string | null;
          id: string;
          org_id: string;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_paise: number;
          charge_id: string;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          org_id: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_paise?: number;
          charge_id?: string;
          created_at?: string;
          failure_reason?: string | null;
          id?: string;
          org_id?: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "fee_charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      penalties: {
        Row: {
          applied_by: string | null;
          created_at: string;
          days: number | null;
          ends_at: string;
          id: string;
          org_id: string;
          reason: string;
          strike_no: number | null;
          tender_id: string | null;
          waived_at: string | null;
          waived_by: string | null;
          waived_reason: string | null;
        };
        Insert: {
          applied_by?: string | null;
          created_at?: string;
          days?: number | null;
          ends_at: string;
          id?: string;
          org_id: string;
          reason: string;
          strike_no?: number | null;
          tender_id?: string | null;
          waived_at?: string | null;
          waived_by?: string | null;
          waived_reason?: string | null;
        };
        Update: {
          applied_by?: string | null;
          created_at?: string;
          days?: number | null;
          ends_at?: string;
          id?: string;
          org_id?: string;
          reason?: string;
          strike_no?: number | null;
          tender_id?: string | null;
          waived_at?: string | null;
          waived_by?: string | null;
          waived_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "penalties_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "penalties_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          award_window_hours: number;
          created_by: string | null;
          custom_deposit_paise: number;
          decrement_bps: number;
          direct_fee_bps: number;
          effective_from: string;
          free_subscription_sellers: number;
          gst_bps: number;
          id: string;
          launch_offer_bps: number;
          launch_offer_sellers: number;
          limit_individual_paise: number;
          limit_org_paise: number;
          min_discount_bps: number;
          snipe_max: number;
          snipe_window_minutes: number;
          subscription_base_crore: number;
          subscription_base_paise: number;
          subscription_step_paise: number;
          supplier_gstin: string | null;
          supplier_legal_name: string;
          supplier_state_code: string;
          tds_bps: number;
          tender_fee_bps: number;
        };
        Insert: {
          award_window_hours: number;
          created_by?: string | null;
          custom_deposit_paise: number;
          decrement_bps: number;
          direct_fee_bps: number;
          effective_from?: string;
          free_subscription_sellers?: number;
          gst_bps: number;
          id?: string;
          launch_offer_bps?: number;
          launch_offer_sellers?: number;
          limit_individual_paise: number;
          limit_org_paise: number;
          min_discount_bps: number;
          snipe_max: number;
          snipe_window_minutes: number;
          subscription_base_crore: number;
          subscription_base_paise: number;
          subscription_step_paise: number;
          supplier_gstin?: string | null;
          supplier_legal_name: string;
          supplier_state_code: string;
          tds_bps: number;
          tender_fee_bps: number;
        };
        Update: {
          award_window_hours?: number;
          created_by?: string | null;
          custom_deposit_paise?: number;
          decrement_bps?: number;
          direct_fee_bps?: number;
          effective_from?: string;
          free_subscription_sellers?: number;
          gst_bps?: number;
          id?: string;
          launch_offer_bps?: number;
          launch_offer_sellers?: number;
          limit_individual_paise?: number;
          limit_org_paise?: number;
          min_discount_bps?: number;
          snipe_max?: number;
          snipe_window_minutes?: number;
          subscription_base_crore?: number;
          subscription_base_paise?: number;
          subscription_step_paise?: number;
          supplier_gstin?: string | null;
          supplier_legal_name?: string;
          supplier_state_code?: string;
          tds_bps?: number;
          tender_fee_bps?: number;
        };
        Relationships: [
          {
            foreignKeyName: "platform_settings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
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
      subscriptions: {
        Row: {
          created_at: string;
          ends_on: string | null;
          fee_paise: number;
          id: string;
          org_id: string;
          settings_id: string;
          starts_on: string | null;
          status: string;
          turnover_paise: number;
        };
        Insert: {
          created_at?: string;
          ends_on?: string | null;
          fee_paise: number;
          id?: string;
          org_id: string;
          settings_id: string;
          starts_on?: string | null;
          status?: string;
          turnover_paise: number;
        };
        Update: {
          created_at?: string;
          ends_on?: string | null;
          fee_paise?: number;
          id?: string;
          org_id?: string;
          settings_id?: string;
          starts_on?: string | null;
          status?: string;
          turnover_paise?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "platform_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_invoices: {
        Row: {
          charge_id: string;
          financial_year: string;
          id: string;
          invoice_no: string;
          issued_at: string;
          org_id: string;
          snapshot: Json;
        };
        Insert: {
          charge_id: string;
          financial_year: string;
          id?: string;
          invoice_no: string;
          issued_at?: string;
          org_id: string;
          snapshot: Json;
        };
        Update: {
          charge_id?: string;
          financial_year?: string;
          id?: string;
          invoice_no?: string;
          issued_at?: string;
          org_id?: string;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "tax_invoices_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: true;
            referencedRelation: "fee_charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_invoices_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      tender_awards: {
        Row: {
          expires_at: string | null;
          id: string;
          offered_at: string | null;
          rank: number;
          reject_reason: string | null;
          responded_at: string | null;
          seller_org_id: string;
          status: Database["public"]["Enums"]["award_status"];
          tender_id: string;
          unit_paise: number;
        };
        Insert: {
          expires_at?: string | null;
          id?: string;
          offered_at?: string | null;
          rank: number;
          reject_reason?: string | null;
          responded_at?: string | null;
          seller_org_id: string;
          status: Database["public"]["Enums"]["award_status"];
          tender_id: string;
          unit_paise: number;
        };
        Update: {
          expires_at?: string | null;
          id?: string;
          offered_at?: string | null;
          rank?: number;
          reject_reason?: string | null;
          responded_at?: string | null;
          seller_org_id?: string;
          status?: Database["public"]["Enums"]["award_status"];
          tender_id?: string;
          unit_paise?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tender_awards_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tender_awards_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      tender_participants: {
        Row: {
          attempts_used: number;
          declined_at: string | null;
          eliminated_at: string | null;
          last_bid_at: string | null;
          last_bid_paise: number | null;
          seller_org_id: string;
          tender_id: string;
          withdrawn: boolean;
        };
        Insert: {
          attempts_used?: number;
          declined_at?: string | null;
          eliminated_at?: string | null;
          last_bid_at?: string | null;
          last_bid_paise?: number | null;
          seller_org_id: string;
          tender_id: string;
          withdrawn?: boolean;
        };
        Update: {
          attempts_used?: number;
          declined_at?: string | null;
          eliminated_at?: string | null;
          last_bid_at?: string | null;
          last_bid_paise?: number | null;
          seller_org_id?: string;
          tender_id?: string;
          withdrawn?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tender_participants_seller_org_id_fkey";
            columns: ["seller_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tender_participants_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      tender_specs: {
        Row: {
          id: string;
          is_key: boolean;
          label: string;
          spec_definition_id: string | null;
          tender_id: string;
          unit: string | null;
          value: string;
        };
        Insert: {
          id?: string;
          is_key?: boolean;
          label: string;
          spec_definition_id?: string | null;
          tender_id: string;
          unit?: string | null;
          value: string;
        };
        Update: {
          id?: string;
          is_key?: boolean;
          label?: string;
          spec_definition_id?: string | null;
          tender_id?: string;
          unit?: string | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tender_specs_spec_definition_id_fkey";
            columns: ["spec_definition_id"];
            isOneToOne: false;
            referencedRelation: "spec_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tender_specs_tender_id_fkey";
            columns: ["tender_id"];
            isOneToOne: false;
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          },
        ];
      };
      tenders: {
        Row: {
          bid_count: number;
          bid_ends_at: string;
          bid_starts_at: string | null;
          buyer_org_id: string;
          cancel_reason: string | null;
          category_id: string;
          consignee_address_id: string;
          consignee_gstin: string;
          consignee_name: string;
          contract_months: number;
          created_at: string;
          credit_days: number | null;
          delivery_state_code: string;
          estimate_unit_paise: number;
          extension_minutes: number;
          extensions_allowed: number;
          extensions_used: number;
          id: string;
          kind: Database["public"]["Enums"]["tender_kind"];
          l1_paise: number | null;
          min_bids: number;
          paused_at: string | null;
          payment_terms: Database["public"]["Enums"]["payment_terms"];
          product_id: string | null;
          quantity: number;
          ra_ends_at: string | null;
          ra_starts_at: string | null;
          seq: number;
          settings_id: string;
          snipe_extensions_used: number;
          status: Database["public"]["Enums"]["tender_status"];
          tender_no: string;
          title: string;
          type: Database["public"]["Enums"]["tender_type"];
          unit: string;
        };
        Insert: {
          bid_count?: number;
          bid_ends_at: string;
          bid_starts_at?: string | null;
          buyer_org_id: string;
          cancel_reason?: string | null;
          category_id: string;
          consignee_address_id: string;
          consignee_gstin: string;
          consignee_name: string;
          contract_months: number;
          created_at?: string;
          credit_days?: number | null;
          delivery_state_code: string;
          estimate_unit_paise: number;
          extension_minutes?: number;
          extensions_allowed?: number;
          extensions_used?: number;
          id?: string;
          kind: Database["public"]["Enums"]["tender_kind"];
          l1_paise?: number | null;
          min_bids?: number;
          paused_at?: string | null;
          payment_terms: Database["public"]["Enums"]["payment_terms"];
          product_id?: string | null;
          quantity: number;
          ra_ends_at?: string | null;
          ra_starts_at?: string | null;
          seq?: number;
          settings_id: string;
          snipe_extensions_used?: number;
          status?: Database["public"]["Enums"]["tender_status"];
          tender_no: string;
          title: string;
          type?: Database["public"]["Enums"]["tender_type"];
          unit: string;
        };
        Update: {
          bid_count?: number;
          bid_ends_at?: string;
          bid_starts_at?: string | null;
          buyer_org_id?: string;
          cancel_reason?: string | null;
          category_id?: string;
          consignee_address_id?: string;
          consignee_gstin?: string;
          consignee_name?: string;
          contract_months?: number;
          created_at?: string;
          credit_days?: number | null;
          delivery_state_code?: string;
          estimate_unit_paise?: number;
          extension_minutes?: number;
          extensions_allowed?: number;
          extensions_used?: number;
          id?: string;
          kind?: Database["public"]["Enums"]["tender_kind"];
          l1_paise?: number | null;
          min_bids?: number;
          paused_at?: string | null;
          payment_terms?: Database["public"]["Enums"]["payment_terms"];
          product_id?: string | null;
          quantity?: number;
          ra_ends_at?: string | null;
          ra_starts_at?: string | null;
          seq?: number;
          settings_id?: string;
          snipe_extensions_used?: number;
          status?: Database["public"]["Enums"]["tender_status"];
          tender_no?: string;
          title?: string;
          type?: Database["public"]["Enums"]["tender_type"];
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenders_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenders_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenders_consignee_address_id_fkey";
            columns: ["consignee_address_id"];
            isOneToOne: false;
            referencedRelation: "org_addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenders_settings_id_fkey";
            columns: ["settings_id"];
            isOneToOne: false;
            referencedRelation: "platform_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          org_id: string | null;
          ref_no: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          subcategory: string | null;
          type: Database["public"]["Enums"]["ticket_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          org_id?: string | null;
          ref_no: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subcategory?: string | null;
          type: Database["public"]["Enums"]["ticket_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          org_id?: string | null;
          ref_no?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          subcategory?: string | null;
          type?: Database["public"]["Enums"]["ticket_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
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
      wallet_entries: {
        Row: {
          amount_paise: number;
          charge_id: string | null;
          created_at: string;
          from_bucket: Database["public"]["Enums"]["wallet_bucket"] | null;
          id: number;
          org_id: string;
          reason: string;
          to_bucket: Database["public"]["Enums"]["wallet_bucket"];
        };
        Insert: {
          amount_paise: number;
          charge_id?: string | null;
          created_at?: string;
          from_bucket?: Database["public"]["Enums"]["wallet_bucket"] | null;
          id?: never;
          org_id: string;
          reason: string;
          to_bucket: Database["public"]["Enums"]["wallet_bucket"];
        };
        Update: {
          amount_paise?: number;
          charge_id?: string | null;
          created_at?: string;
          from_bucket?: Database["public"]["Enums"]["wallet_bucket"] | null;
          id?: never;
          org_id?: string;
          reason?: string;
          to_bucket?: Database["public"]["Enums"]["wallet_bucket"];
        };
        Relationships: [
          {
            foreignKeyName: "wallet_entries_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "fee_charges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_entries_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          error: string | null;
          event_id: string;
          event_type: string;
          id: string;
          processed_at: string | null;
          provider: string;
          received_at: string;
        };
        Insert: {
          error?: string | null;
          event_id: string;
          event_type: string;
          id?: string;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          error?: string | null;
          event_id?: string;
          event_type?: string;
          id?: string;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_award: { Args: { p_id: string }; Returns: string };
      accept_order: { Args: { p_id: string }; Returns: string };
      add_bank_account: {
        Args: { p_account_no: string; p_holder_name: string; p_ifsc: string };
        Returns: string;
      };
      add_incident_message: {
        Args: { p_body: string; p_id: string };
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
      add_ticket_message: {
        Args: { p_body: string; p_id: string };
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
      admin_audit_log: {
        Args: {
          p_action?: string;
          p_before?: number;
          p_entity_id?: string;
          p_entity_type?: string;
        };
        Returns: {
          action: string;
          actor: string;
          actor_role: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
          reason: string;
        }[];
      };
      admin_block_org: {
        Args: { p_days: number; p_id: string; p_reason: string };
        Returns: string;
      };
      admin_cancel_tender: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
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
      admin_decide_incident: {
        Args: {
          p_close: boolean;
          p_decision: string;
          p_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_incidents: {
        Args: { p_status?: Database["public"]["Enums"]["incident_status"] };
        Returns: {
          against: string;
          created_at: string;
          id: string;
          raised_by: string;
          ref_no: string;
          reference: string;
          status: Database["public"]["Enums"]["incident_status"];
        }[];
      };
      admin_lift_block: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_orders: {
        Args: { p_status?: Database["public"]["Enums"]["order_status"] };
        Returns: {
          buyer: string;
          created_at: string;
          id: string;
          order_no: string;
          seller: string;
          status: Database["public"]["Enums"]["order_status"];
          title: string;
          total_paise: number;
        }[];
      };
      admin_organisation: { Args: { p_id: string }; Returns: Json };
      admin_organisations: {
        Args: {
          p_search?: string;
          p_status?: Database["public"]["Enums"]["org_status"];
        };
        Returns: {
          blocked_until: string;
          created_at: string;
          gstin: string;
          id: string;
          kind: Database["public"]["Enums"]["org_kind"];
          legal_name: string;
          status: Database["public"]["Enums"]["org_status"];
          strike_count: number;
        }[];
      };
      admin_overview: { Args: never; Returns: Json };
      admin_pause_auction: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
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
      admin_resolve_ticket: {
        Args: { p_id: string; p_reason: string; p_resolution: string };
        Returns: undefined;
      };
      admin_resume_auction: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
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
      admin_save_settings: {
        Args: {
          p_direct_fee_bps: number;
          p_gst_bps: number;
          p_launch_offer_bps: number;
          p_launch_offer_sellers: number;
          p_reason: string;
          p_subscription_base_paise: number;
          p_subscription_step_paise: number;
          p_tds_bps: number;
          p_tender_fee_bps: number;
        };
        Returns: string;
      };
      admin_set_org_status: {
        Args: { p_action: string; p_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_tenders: {
        Args: { p_status?: Database["public"]["Enums"]["tender_status"] };
        Returns: {
          bid_count: number;
          bid_ends_at: string;
          buyer: string;
          id: string;
          paused_at: string;
          status: Database["public"]["Enums"]["tender_status"];
          tender_no: string;
          title: string;
          type: Database["public"]["Enums"]["tender_type"];
        }[];
      };
      admin_test_activate_seller: {
        Args: { p_org_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_tickets: {
        Args: { p_status?: Database["public"]["Enums"]["ticket_status"] };
        Returns: {
          created_at: string;
          email: string;
          id: string;
          ref_no: string;
          status: Database["public"]["Enums"]["ticket_status"];
          type: Database["public"]["Enums"]["ticket_type"];
        }[];
      };
      admin_waive_penalty: {
        Args: { p_id: string; p_reason: string };
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
      apply_payment_event: {
        Args: {
          p_amount_paise: number;
          p_event_id: string;
          p_event_type: string;
          p_failure_reason: string;
          p_provider_order_id: string;
          p_provider_payment_id: string;
        };
        Returns: string;
      };
      award_tender: { Args: { p_id: string; p_rank: number }; Returns: string };
      begin_checkout: { Args: { p_charge_id: string }; Returns: Json };
      buyer_auction: { Args: { p_id: string }; Returns: Json };
      buyer_tenders: {
        Args: never;
        Returns: {
          bid_ends_at: string;
          id: string;
          status: Database["public"]["Enums"]["tender_status"];
          tender_no: string;
          title: string;
        }[];
      };
      can_read_order_file: { Args: { p_path: string }; Returns: boolean };
      cancel_order: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      cancel_tender: {
        Args: { p_id: string; p_reason: string };
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
      claim_outbox: {
        Args: { p_limit: number };
        Returns: {
          email: string;
          id: string;
          payload: Json;
          template: string;
        }[];
      };
      create_order: {
        Args: {
          p_consignee_gstin: string;
          p_consignee_name: string;
          p_credit_days: number;
          p_delivery_address_id: string;
          p_expected_delivery_on: string;
          p_payment_terms: Database["public"]["Enums"]["payment_terms"];
          p_product_id: string;
          p_quantity: number;
        };
        Returns: Json;
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
      create_tender: {
        Args: {
          p_bid_ends_at: string;
          p_category_id: string;
          p_consignee_address_id: string;
          p_consignee_gstin: string;
          p_consignee_name: string;
          p_contract_months: number;
          p_credit_days: number;
          p_estimate_unit_paise: number;
          p_extension_minutes: number;
          p_extensions_allowed: number;
          p_kind: Database["public"]["Enums"]["tender_kind"];
          p_min_bids: number;
          p_payment_terms: Database["public"]["Enums"]["payment_terms"];
          p_product_id: string;
          p_quantity: number;
          p_ra_ends_at?: string;
          p_ra_starts_at?: string;
          p_specs: Json;
          p_title: string;
          p_type?: Database["public"]["Enums"]["tender_type"];
          p_unit: string;
        };
        Returns: string;
      };
      current_org_id: { Args: never; Returns: string };
      delete_product: { Args: { p_id: string }; Returns: string[] };
      dispatch_order: {
        Args: { p_documents: Json; p_id: string };
        Returns: undefined;
      };
      expire_subscriptions: { Args: never; Returns: number };
      expire_unpaid_orders: { Args: never; Returns: number };
      finish_outbox: {
        Args: { p_error: string; p_id: string };
        Returns: undefined;
      };
      get_buyer_tender: { Args: { p_id: string }; Returns: Json };
      get_incident: { Args: { p_id: string }; Returns: Json };
      get_order: { Args: { p_id: string }; Returns: Json };
      get_order_contacts: { Args: { p_id: string }; Returns: Json };
      get_seller_tender: { Args: { p_id: string }; Returns: Json };
      get_ticket: { Args: { p_id: string }; Returns: Json };
      health_check: { Args: never; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      list_orders: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          created_at: string;
          id: string;
          order_no: string;
          quantity: number;
          status: Database["public"]["Enums"]["order_status"];
          title: string;
          total_paise: number;
          unit: string;
        }[];
      };
      my_attention: {
        Args: never;
        Returns: {
          due_at: string;
          id: string;
          kind: string;
          label: string;
        }[];
      };
      my_incidents: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          raised_by_me: boolean;
          ref_no: string;
          reference: string;
          status: Database["public"]["Enums"]["incident_status"];
        }[];
      };
      my_tickets: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          ref_no: string;
          status: Database["public"]["Enums"]["ticket_status"];
          type: Database["public"]["Enums"]["ticket_type"];
        }[];
      };
      place_ra_bid: {
        Args: { p_id: string; p_idempotency_key: string; p_unit_paise: number };
        Returns: Json;
      };
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
      public_tender: { Args: { p_id: string }; Returns: Json };
      public_tenders: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          bid_ends_at: string;
          category_name: string;
          delivery_state_code: string;
          id: string;
          quantity: number;
          tender_no: string;
          title: string;
          type: Database["public"]["Enums"]["tender_type"];
          unit: string;
        }[];
      };
      publish_tender: { Args: { p_id: string }; Returns: string };
      quote_order: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: Json;
      };
      quote_subscription: { Args: never; Returns: Json };
      raise_incident: {
        Args: {
          p_description: string;
          p_order_id: string;
          p_product_id: string;
          p_tender_id: string;
        };
        Returns: string;
      };
      raise_ticket: {
        Args: {
          p_description: string;
          p_subcategory: string;
          p_type: Database["public"]["Enums"]["ticket_type"];
        };
        Returns: string;
      };
      receive_order: {
        Args: { p_file_id: string; p_id: string };
        Returns: undefined;
      };
      record_provider_order: {
        Args: { p_payment_id: string; p_provider_order_id: string };
        Returns: string;
      };
      register_order_file: {
        Args: {
          p_mime_type: string;
          p_path: string;
          p_sha256: string;
          p_size_bytes: number;
        };
        Returns: string;
      };
      reject_award: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      reject_order: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
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
      seller_auction: { Args: { p_id: string }; Returns: Json };
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
      seller_tenders: {
        Args: never;
        Returns: {
          award_status: Database["public"]["Enums"]["award_status"];
          bid_ends_at: string;
          category_name: string;
          delivery_state_code: string;
          id: string;
          my_bid_paise: number;
          quantity: number;
          tender_no: string;
          title: string;
          type: Database["public"]["Enums"]["tender_type"];
          unit: string;
        }[];
      };
      set_product_visibility: {
        Args: { p_id: string; p_visible: boolean };
        Returns: undefined;
      };
      shortlist_tender: {
        Args: { p_id: string; p_mode: string };
        Returns: number;
      };
      start_subscription: { Args: never; Returns: string };
      submit_bid: {
        Args: { p_id: string; p_unit_paise: number };
        Returns: string;
      };
      submit_organisation: {
        Args: never;
        Returns: Database["public"]["Enums"]["org_status"];
      };
      submit_product: { Args: { p_id: string }; Returns: undefined };
      tender_bids: {
        Args: { p_id: string };
        Returns: {
          placed_at: string;
          rank: number;
          total_paise: number;
          unit_paise: number;
        }[];
      };
      tick_tenders: { Args: never; Returns: number };
      unresolved_payments: {
        Args: never;
        Returns: {
          id: string;
          provider_order_id: string;
        }[];
      };
      update_product_commercials: {
        Args: {
          p_discount_bps: number;
          p_id: string;
          p_mrp_paise: number;
          p_stock_qty: number;
        };
        Returns: undefined;
      };
      wallet_summary: {
        Args: never;
        Returns: {
          available_paise: number;
          on_hold_paise: number;
          paid_paise: number;
        }[];
      };
      withdraw_bid: { Args: { p_id: string }; Returns: undefined };
    };
    Enums: {
      award_status: "pending" | "offered" | "accepted" | "rejected" | "expired";
      charge_kind:
        | "direct_buyer"
        | "direct_seller"
        | "tender_buyer"
        | "tender_deposit"
        | "tender_balance"
        | "tender_seller"
        | "subscription";
      charge_status: "pending" | "held" | "paid" | "released" | "cancelled";
      entity_type:
        "individual" | "proprietorship" | "partnership" | "trust_society" | "llp" | "company";
      file_scan_status: "pending" | "clean" | "infected";
      incident_status: "open" | "decided" | "closed";
      order_source: "direct" | "tender";
      order_status:
        "unpaid" | "awaiting_seller" | "accepted" | "dispatched" | "completed" | "cancelled";
      org_kind: "buyer" | "seller";
      org_status:
        "draft" | "pending_payment" | "pending_review" | "active" | "suspended" | "rejected";
      payment_status: "created" | "paid" | "failed";
      payment_terms: "advance" | "on_delivery" | "credit";
      product_status: "draft" | "pending" | "notify" | "published" | "unpublished" | "rejected";
      spec_kind: "text" | "number" | "enum";
      tender_kind: "regular" | "custom";
      tender_status:
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
      tender_type: "bid" | "ra" | "bid_to_ra";
      ticket_status: "open" | "resolved";
      ticket_type: "account" | "payment" | "tender" | "order" | "technical" | "other";
      user_role: "org_user" | "admin";
      verification_kind: "pan" | "gstin" | "bank" | "cin" | "identity";
      verification_status: "pending" | "verified" | "failed" | "manual_review";
      wallet_bucket: "available" | "on_hold" | "paid";
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
      award_status: ["pending", "offered", "accepted", "rejected", "expired"],
      charge_kind: [
        "direct_buyer",
        "direct_seller",
        "tender_buyer",
        "tender_deposit",
        "tender_balance",
        "tender_seller",
        "subscription",
      ],
      charge_status: ["pending", "held", "paid", "released", "cancelled"],
      entity_type: [
        "individual",
        "proprietorship",
        "partnership",
        "trust_society",
        "llp",
        "company",
      ],
      file_scan_status: ["pending", "clean", "infected"],
      incident_status: ["open", "decided", "closed"],
      order_source: ["direct", "tender"],
      order_status: [
        "unpaid",
        "awaiting_seller",
        "accepted",
        "dispatched",
        "completed",
        "cancelled",
      ],
      org_kind: ["buyer", "seller"],
      org_status: ["draft", "pending_payment", "pending_review", "active", "suspended", "rejected"],
      payment_status: ["created", "paid", "failed"],
      payment_terms: ["advance", "on_delivery", "credit"],
      product_status: ["draft", "pending", "notify", "published", "unpublished", "rejected"],
      spec_kind: ["text", "number", "enum"],
      tender_kind: ["regular", "custom"],
      tender_status: [
        "draft",
        "unpaid",
        "bidding",
        "evaluating",
        "shortlisting",
        "auction_scheduled",
        "auction",
        "awarding",
        "ordered",
        "cancelled",
      ],
      tender_type: ["bid", "ra", "bid_to_ra"],
      ticket_status: ["open", "resolved"],
      ticket_type: ["account", "payment", "tender", "order", "technical", "other"],
      user_role: ["org_user", "admin"],
      verification_kind: ["pan", "gstin", "bank", "cin", "identity"],
      verification_status: ["pending", "verified", "failed", "manual_review"],
      wallet_bucket: ["available", "on_hold", "paid"],
    },
  },
} as const;
