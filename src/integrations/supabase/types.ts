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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_pages: {
        Row: {
          accent_color: string
          agent_id: string
          allow_browser_call: boolean
          allow_phone_callback: boolean
          background_style: string
          call_count: number
          collect_email: boolean
          cover_image_url: string | null
          created_at: string
          cta_label: string
          custom_domain: string | null
          faqs: Json | null
          features: Json | null
          hero_text: string | null
          id: string
          logo_url: string | null
          primary_color: string
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string
          view_count: number
          visibility: string
        }
        Insert: {
          accent_color?: string
          agent_id: string
          allow_browser_call?: boolean
          allow_phone_callback?: boolean
          background_style?: string
          call_count?: number
          collect_email?: boolean
          cover_image_url?: string | null
          created_at?: string
          cta_label?: string
          custom_domain?: string | null
          faqs?: Json | null
          features?: Json | null
          hero_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          slug: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id: string
          view_count?: number
          visibility?: string
        }
        Update: {
          accent_color?: string
          agent_id?: string
          allow_browser_call?: boolean
          allow_phone_callback?: boolean
          background_style?: string
          call_count?: number
          collect_email?: boolean
          cover_image_url?: string | null
          created_at?: string
          cta_label?: string
          custom_domain?: string | null
          faqs?: Json | null
          features?: Json | null
          hero_text?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_pages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          description: string | null
          first_message: string
          id: string
          is_active: boolean
          knowledge_base: string | null
          language: string
          llm_model: string
          max_call_duration: number
          name: string
          share_enabled: boolean
          slug: string | null
          system_prompt: string
          temperature: number
          updated_at: string
          user_id: string
          voice: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          first_message?: string
          id?: string
          is_active?: boolean
          knowledge_base?: string | null
          language?: string
          llm_model?: string
          max_call_duration?: number
          name: string
          share_enabled?: boolean
          slug?: string | null
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_id: string
          voice?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          first_message?: string
          id?: string
          is_active?: boolean
          knowledge_base?: string | null
          language?: string
          llm_model?: string
          max_call_duration?: number
          name?: string
          share_enabled?: boolean
          slug?: string | null
          system_prompt?: string
          temperature?: number
          updated_at?: string
          user_id?: string
          voice?: string
        }
        Relationships: []
      }
      call_recordings: {
        Row: {
          call_id: string
          created_at: string
          duration_seconds: number | null
          format: string | null
          id: string
          recording_url: string
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          duration_seconds?: number | null
          format?: string | null
          id?: string
          recording_url: string
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          duration_seconds?: number | null
          format?: string | null
          id?: string
          recording_url?: string
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          call_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          call_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          call_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string
          caller_number: string | null
          campaign_id: string | null
          cost_credits: number
          created_at: string
          direction: string
          duration_seconds: number
          ended_at: string | null
          from_number: string | null
          id: string
          plivo_call_uuid: string | null
          recording_url: string | null
          started_at: string
          status: string
          summary: string | null
          to_number: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          caller_number?: string | null
          campaign_id?: string | null
          cost_credits?: number
          created_at?: string
          direction?: string
          duration_seconds?: number
          ended_at?: string | null
          from_number?: string | null
          id?: string
          plivo_call_uuid?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          to_number?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          caller_number?: string | null
          campaign_id?: string | null
          cost_credits?: number
          created_at?: string
          direction?: string
          duration_seconds?: number
          ended_at?: string | null
          from_number?: string | null
          id?: string
          plivo_call_uuid?: string | null
          recording_url?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          to_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          attempts: number
          call_id: string | null
          called_at: string | null
          campaign_id: string
          created_at: string
          id: string
          last_error: string | null
          name: string | null
          phone: string
          status: string
          variables: Json | null
        }
        Insert: {
          attempts?: number
          call_id?: string | null
          called_at?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          name?: string | null
          phone: string
          status?: string
          variables?: Json | null
        }
        Update: {
          attempts?: number
          call_id?: string | null
          called_at?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          name?: string | null
          phone?: string
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agent_id: string
          completed_at: string | null
          completed_contacts: number
          concurrency: number
          created_at: string
          description: string | null
          failed_contacts: number
          from_number: string
          id: string
          name: string
          retry_count: number
          scheduled_at: string | null
          started_at: string | null
          status: string
          total_contacts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          completed_contacts?: number
          concurrency?: number
          created_at?: string
          description?: string | null
          failed_contacts?: number
          from_number: string
          id?: string
          name: string
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          total_contacts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          completed_contacts?: number
          concurrency?: number
          created_at?: string
          description?: string | null
          failed_contacts?: number
          from_number?: string
          id?: string
          name?: string
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          total_contacts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_leads: {
        Row: {
          agent_id: string
          agent_page_id: string
          call_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string
          source_ip: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_page_id: string
          call_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone: string
          source_ip?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_page_id?: string
          call_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string
          source_ip?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_leads_agent_page_id_fkey"
            columns: ["agent_page_id"]
            isOneToOne: false
            referencedRelation: "agent_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          agent_id: string | null
          capabilities: Json | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          monthly_rent: number | null
          number: string
          source: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          capabilities?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_rent?: number | null
          number: string
          source?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          capabilities?: Json | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_rent?: number | null
          number?: string
          source?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      plivo_credentials: {
        Row: {
          auth_id: string
          auth_token_encrypted: string
          created_at: string
          id: string
          is_verified: boolean
          last_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_id: string
          auth_token_encrypted: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_id?: string
          auth_token_encrypted?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          credits_balance: number
          credits_total_purchased: number
          credits_total_used: number
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          plivo_connected: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          credits_balance?: number
          credits_total_purchased?: number
          credits_total_used?: number
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plivo_connected?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          credits_balance?: number
          credits_total_purchased?: number
          credits_total_used?: number
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          plivo_connected?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_calls: {
        Row: {
          agent_id: string
          call_id: string | null
          contact_name: string | null
          created_at: string
          from_number: string
          id: string
          notes: string | null
          scheduled_for: string
          status: string
          to_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          call_id?: string | null
          contact_name?: string | null
          created_at?: string
          from_number: string
          id?: string
          notes?: string | null
          scheduled_for: string
          status?: string
          to_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          call_id?: string | null
          contact_name?: string | null
          created_at?: string
          from_number?: string
          id?: string
          notes?: string | null
          scheduled_for?: string
          status?: string
          to_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      generate_agent_slug: { Args: { p_base: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
