export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          approved_at: string | null
          approved_payload: Json | null
          case_id: string
          created_at: string
          destination: string
          executed_at: string | null
          id: string
          idempotency_key: string
          otp_verified_at: string | null
          paid_at: string | null
          proposed: Json
          request_number: string | null
          slot: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_payload?: Json | null
          case_id: string
          created_at?: string
          destination: string
          executed_at?: string | null
          id?: string
          idempotency_key: string
          otp_verified_at?: string | null
          paid_at?: string | null
          proposed: Json
          request_number?: string | null
          slot?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_payload?: Json | null
          case_id?: string
          created_at?: string
          destination?: string
          executed_at?: string | null
          id?: string
          idempotency_key?: string
          otp_verified_at?: string | null
          paid_at?: string | null
          proposed?: Json
          request_number?: string | null
          slot?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          applicant_name: string
          case_code: string
          created_at: string
          doc_type: string
          id: string
          plan: Json | null
          proofs: string[]
          state: string
          status: string
        }
        Insert: {
          applicant_name?: string
          case_code: string
          created_at?: string
          doc_type: string
          id?: string
          plan?: Json | null
          proofs?: string[]
          state: string
          status?: string
        }
        Update: {
          applicant_name?: string
          case_code?: string
          created_at?: string
          doc_type?: string
          id?: string
          plan?: Json | null
          proofs?: string[]
          state?: string
          status?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          case_id: string
          created_at: string
          id: string
          inputs: Json
          outcome: string
          reason: string
          rule: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          inputs: Json
          outcome: string
          reason: string
          rule: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          inputs?: Json
          outcome?: string
          reason?: string
          rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_sms_inbox: {
        Row: {
          body: string
          case_id: string
          id: string
          sent_at: string
        }
        Insert: {
          body: string
          case_id: string
          id?: string
          sent_at?: string
        }
        Update: {
          body?: string
          case_id?: string
          id?: string
          sent_at?: string
        }
        Relationships: []
      }
      otp_challenges: {
        Row: {
          action_id: string
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          verified_at: string | null
        }
        Insert: {
          action_id: string
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          verified_at?: string | null
        }
        Update: {
          action_id?: string
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          action_id: string
          amount: number
          card_last4: string
          created_at: string
          id: string
          method: string
          paid_at: string
          status: string
          transaction_ref: string
        }
        Insert: {
          action_id: string
          amount: number
          card_last4: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          status?: string
          transaction_ref: string
        }
        Update: {
          action_id?: string
          amount?: number
          card_last4?: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          status?: string
          transaction_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_requests: {
        Row: {
          created_at: string
          fee_paid: number
          payload: Json
          request_number: string
          service_id: string
          slot: string
          status: string
        }
        Insert: {
          created_at?: string
          fee_paid: number
          payload: Json
          request_number: string
          service_id: string
          slot: string
          status?: string
        }
        Update: {
          created_at?: string
          fee_paid?: number
          payload?: Json
          request_number?: string
          service_id?: string
          slot?: string
          status?: string
        }
        Relationships: []
      }
      source_evidence: {
        Row: {
          case_id: string
          extracted: Json
          id: string
          is_official: boolean
          reason: string
          retrieved_at: string
          source_id: string
          title: string
          url: string
          used: boolean
        }
        Insert: {
          case_id: string
          extracted?: Json
          id?: string
          is_official: boolean
          reason: string
          retrieved_at?: string
          source_id: string
          title: string
          url: string
          used: boolean
        }
        Update: {
          case_id?: string
          extracted?: Json
          id?: string
          is_official?: boolean
          reason?: string
          retrieved_at?: string
          source_id?: string
          title?: string
          url?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "source_evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          actual: string
          evidence: Json
          expected: string
          explanation: string
          id: string
          input: Json
          passed: boolean
          ran_at: string
          scenario: string
          tc: string
        }
        Insert: {
          actual: string
          evidence: Json
          expected: string
          explanation: string
          id?: string
          input: Json
          passed: boolean
          ran_at?: string
          scenario: string
          tc: string
        }
        Update: {
          actual?: string
          evidence?: Json
          expected?: string
          explanation?: string
          id?: string
          input?: Json
          passed?: boolean
          ran_at?: string
          scenario?: string
          tc?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          action_id: string | null
          case_id: string
          checked_at: string
          id: string
          intended: Json
          note: string
          observed: Json
          result: string
        }
        Insert: {
          action_id?: string | null
          case_id: string
          checked_at?: string
          id?: string
          intended: Json
          note: string
          observed: Json
          result: string
        }
        Update: {
          action_id?: string | null
          case_id?: string
          checked_at?: string
          id?: string
          intended?: Json
          note?: string
          observed?: Json
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
