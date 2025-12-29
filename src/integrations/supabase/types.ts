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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      intro_requests: {
        Row: {
          created_at: string | null
          expected_outcome: string | null
          format: Database["public"]["Enums"]["intro_format"] | null
          helper_id: string
          id: string
          matching_tags: string[] | null
          message: string
          requester_id: string
          status: Database["public"]["Enums"]["intro_request_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expected_outcome?: string | null
          format?: Database["public"]["Enums"]["intro_format"] | null
          helper_id: string
          id?: string
          matching_tags?: string[] | null
          message: string
          requester_id: string
          status?: Database["public"]["Enums"]["intro_request_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expected_outcome?: string | null
          format?: Database["public"]["Enums"]["intro_format"] | null
          helper_id?: string
          id?: string
          matching_tags?: string[] | null
          message?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["intro_request_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      match_notifications: {
        Row: {
          created_at: string | null
          helper_user_id: string
          id: string
          notified_user_id: string
        }
        Insert: {
          created_at?: string | null
          helper_user_id: string
          id?: string
          notified_user_id: string
        }
        Update: {
          created_at?: string | null
          helper_user_id?: string
          id?: string
          notified_user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_needs: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_needs_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_offers: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_offers_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bio_long: string | null
          city: string | null
          company_name: string | null
          completed: boolean | null
          country: string | null
          created_at: string | null
          credibility_confirmed: boolean | null
          full_name: string | null
          id: string
          instagram_url: string | null
          job_title: string | null
          languages: string[] | null
          linkedin_url: string | null
          portfolio_url: string | null
          proof_links: string[] | null
          short_bio: string | null
          status: Database["public"]["Enums"]["profile_status"] | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio_long?: string | null
          city?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string | null
          credibility_confirmed?: boolean | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          proof_links?: string[] | null
          short_bio?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio_long?: string | null
          city?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string | null
          credibility_confirmed?: boolean | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          proof_links?: string[] | null
          short_bio?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          label: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          label: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      compute_matches: {
        Args: { p_user_id: string }
        Returns: {
          matched_user_id: string
          overlapping_tags: string[]
          score: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      intro_format: "async" | "short_call" | "long_call"
      intro_request_status: "pending" | "accepted" | "declined"
      profile_status: "pending_review" | "approved" | "rejected" | "suspended"
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
      intro_format: ["async", "short_call", "long_call"],
      intro_request_status: ["pending", "accepted", "declined"],
      profile_status: ["pending_review", "approved", "rejected", "suspended"],
    },
  },
} as const
