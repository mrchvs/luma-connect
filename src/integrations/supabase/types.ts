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
      activity_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_identifier: string | null
        }
        Insert: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_identifier?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_identifier?: string | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_upvotes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_upvotes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "request_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          intro_request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          intro_request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          intro_request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_notes_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          intro_request_id: string | null
          last_message_at: string
          participant_one: string
          participant_two: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          intro_request_id?: string | null
          last_message_at?: string
          participant_one: string
          participant_two: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          intro_request_id?: string | null
          last_message_at?: string
          participant_one?: string
          participant_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "mentor_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      course_access: {
        Row: {
          course_id: string
          granted_at: string
          granted_by: string
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          granted_at?: string
          granted_by: string
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content: {
        Row: {
          content: string | null
          content_type: Database["public"]["Enums"]["course_content_type"]
          course_id: string
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_type: Database["public"]["Enums"]["course_content_type"]
          course_id: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_type?: Database["public"]["Enums"]["course_content_type"]
          course_id?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: Database["public"]["Enums"]["course_access_type"]
          cover_image_url: string | null
          created_at: string
          format: Database["public"]["Enums"]["course_format"]
          id: string
          mentor_name: string | null
          price_cents: number
          short_description: string | null
          status: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["course_access_type"]
          cover_image_url?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["course_format"]
          id?: string
          mentor_name?: string | null
          price_cents?: number
          short_description?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["course_access_type"]
          cover_image_url?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["course_format"]
          id?: string
          mentor_name?: string | null
          price_cents?: number
          short_description?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_placeholders: string[]
          body_html: string
          created_at: string
          id: string
          name: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          available_placeholders?: string[]
          body_html: string
          created_at?: string
          id?: string
          name: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          available_placeholders?: string[]
          body_html?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      expectations: {
        Row: {
          created_at: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          created_at: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
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
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_by_email: string
          invited_by_user_id: string | null
          note: string | null
          source: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_by_email: string
          invited_by_user_id?: string | null
          note?: string | null
          source?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_by_email?: string
          invited_by_user_id?: string | null
          note?: string | null
          source?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          first_attempt_at: string
          id: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          first_attempt_at?: string
          id?: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          first_attempt_at?: string
          id?: string
          locked_until?: string | null
          updated_at?: string
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
      match_reviews: {
        Row: {
          created_at: string
          id: string
          is_accurate: boolean | null
          matched_user_id: string
          overlapping_tags: string[] | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_accurate?: boolean | null
          matched_user_id: string
          overlapping_tags?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_accurate?: boolean | null
          matched_user_id?: string
          overlapping_tags?: string[] | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      matching_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      member_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string
          page_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_applications: {
        Row: {
          availability_preferences: string | null
          created_at: string
          credentials_url: string | null
          expertise_areas: string[]
          id: string
          industries: string[]
          mentor_bio: string | null
          pricing_info: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services_description: string | null
          status: Database["public"]["Enums"]["mentor_application_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_preferences?: string | null
          created_at?: string
          credentials_url?: string | null
          expertise_areas?: string[]
          id?: string
          industries?: string[]
          mentor_bio?: string | null
          pricing_info?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_description?: string | null
          status?: Database["public"]["Enums"]["mentor_application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_preferences?: string | null
          created_at?: string
          credentials_url?: string | null
          expertise_areas?: string[]
          id?: string
          industries?: string[]
          mentor_bio?: string | null
          pricing_info?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_description?: string | null
          status?: Database["public"]["Enums"]["mentor_application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_bookings: {
        Row: {
          client_user_id: string
          created_at: string
          currency: string
          duration_minutes: number
          id: string
          intro_request_id: string | null
          mentor_id: string
          notes: string | null
          price_cents: number
          scheduled_at: string | null
          service_id: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          currency?: string
          duration_minutes: number
          id?: string
          intro_request_id?: string | null
          mentor_id: string
          notes?: string | null
          price_cents: number
          scheduled_at?: string | null
          service_id?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          currency?: string
          duration_minutes?: number
          id?: string
          intro_request_id?: string | null
          mentor_id?: string
          notes?: string | null
          price_cents?: number
          scheduled_at?: string | null
          service_id?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_bookings_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_bookings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "mentor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          availability: string
          created_at: string
          expertise_areas: string[]
          headline: string
          id: string
          is_active: boolean
          is_complete: boolean
          updated_at: string
          user_id: string
          who_this_is_for: string | null
        }
        Insert: {
          availability?: string
          created_at?: string
          expertise_areas?: string[]
          headline?: string
          id?: string
          is_active?: boolean
          is_complete?: boolean
          updated_at?: string
          user_id: string
          who_this_is_for?: string | null
        }
        Update: {
          availability?: string
          created_at?: string
          expertise_areas?: string[]
          headline?: string
          id?: string
          is_active?: boolean
          is_complete?: boolean
          updated_at?: string
          user_id?: string
          who_this_is_for?: string | null
        }
        Relationships: []
      }
      mentor_services: {
        Row: {
          created_at: string
          currency: string
          description: string
          display_order: number
          duration_minutes: number
          id: string
          is_active: boolean
          mentor_id: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description: string
          display_order?: number
          duration_minutes: number
          id?: string
          is_active?: boolean
          mentor_id: string
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          display_order?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          mentor_id?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_services_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_intent: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_intent?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_intent?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_intro: boolean
          email_scheduling: boolean
          id: string
          push_enabled: boolean
          push_intro: boolean
          push_scheduling: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_intro?: boolean
          email_scheduling?: boolean
          id?: string
          push_enabled?: boolean
          push_intro?: boolean
          push_scheduling?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_intro?: boolean
          email_scheduling?: boolean
          id?: string
          push_enabled?: boolean
          push_intro?: boolean
          push_scheduling?: boolean
          updated_at?: string
          user_id?: string
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
      onboarding_progress: {
        Row: {
          checklist_dismissed: boolean | null
          created_at: string
          first_ask_posted: boolean | null
          first_message_sent: boolean | null
          id: string
          industries_added: boolean | null
          photo_uploaded: boolean | null
          profile_completed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_dismissed?: boolean | null
          created_at?: string
          first_ask_posted?: boolean | null
          first_message_sent?: boolean | null
          id?: string
          industries_added?: boolean | null
          photo_uploaded?: boolean | null
          profile_completed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_dismissed?: boolean | null
          created_at?: string
          first_ask_posted?: boolean | null
          first_message_sent?: boolean | null
          id?: string
          industries_added?: boolean | null
          photo_uploaded?: boolean | null
          profile_completed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_access_logs: {
        Row: {
          access_count: number
          accessed_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_count?: number
          accessed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_count?: number
          accessed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_expectations: {
        Row: {
          created_at: string
          custom_expectation: string | null
          expectation_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_expectation?: string | null
          expectation_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_expectation?: string | null
          expectation_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_expectations_expectation_id_fkey"
            columns: ["expectation_id"]
            isOneToOne: false
            referencedRelation: "expectations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_industries: {
        Row: {
          created_at: string
          custom_industry: string | null
          id: string
          industry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_industry?: string | null
          id?: string
          industry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_industry?: string | null
          id?: string
          industry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
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
          avatar_url: string | null
          bio_long: string | null
          city: string | null
          company_name: string | null
          completed: boolean | null
          country: string | null
          created_at: string | null
          credibility_confirmed: boolean | null
          current_stage: string | null
          first_name: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          interaction_intent: string[] | null
          job_title: string | null
          languages: string[] | null
          last_name: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          proof_links: string[] | null
          short_bio: string | null
          solutions_count: number
          stage: string | null
          status: Database["public"]["Enums"]["profile_status"] | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio_long?: string | null
          city?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string | null
          credibility_confirmed?: boolean | null
          current_stage?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          interaction_intent?: string[] | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          proof_links?: string[] | null
          short_bio?: string | null
          solutions_count?: number
          stage?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio_long?: string | null
          city?: string | null
          company_name?: string | null
          completed?: boolean | null
          country?: string | null
          created_at?: string | null
          credibility_confirmed?: boolean | null
          current_stage?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          interaction_intent?: string[] | null
          job_title?: string | null
          languages?: string[] | null
          last_name?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          proof_links?: string[] | null
          short_bio?: string | null
          solutions_count?: number
          stage?: string | null
          status?: Database["public"]["Enums"]["profile_status"] | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      proposed_time_slots: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          intro_request_id: string
          proposed_by: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          intro_request_id: string
          proposed_by: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          intro_request_id?: string
          proposed_by?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposed_time_slots_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          platform?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      request_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "request_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_tags: {
        Row: {
          created_at: string
          id: string
          request_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_tags_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      request_upvotes: {
        Row: {
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_upvotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          accepted_comment_id: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          accepted_comment_id?: string | null
          body: string
          created_at?: string
          created_by: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          accepted_comment_id?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_requests_accepted_comment"
            columns: ["accepted_comment_id"]
            isOneToOne: false
            referencedRelation: "request_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
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
      are_users_connected: {
        Args: { _profile_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      check_lockout: {
        Args: { p_email: string }
        Returns: {
          attempts_remaining: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      check_profile_rate_limit: { Args: { _user_id: string }; Returns: boolean }
      cleanup_old_access_logs: { Args: never; Returns: undefined }
      clear_login_attempts: { Args: { p_email: string }; Returns: undefined }
      compute_matches: {
        Args: { p_user_id: string }
        Returns: {
          matched_user_id: string
          overlapping_tags: string[]
          score: number
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_booking_id?: string
          p_intro_request_id?: string
          p_user_one: string
          p_user_two: string
        }
        Returns: string
      }
      get_security_setting: { Args: { p_key: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      is_mentor: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      record_failed_attempt: {
        Args: { p_email: string }
        Returns: {
          attempts_remaining: number
          is_locked: boolean
          locked_until: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "owner" | "mentor"
      course_access_type: "free" | "paid" | "subscription"
      course_content_type: "video" | "text" | "file"
      course_format: "live" | "hybrid" | "on_demand"
      course_status: "draft" | "published"
      intro_format: "async" | "short_call" | "long_call"
      intro_request_status: "pending" | "accepted" | "declined"
      mentor_application_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revoked"
      profile_status: "pending_review" | "approved" | "rejected" | "suspended"
      request_status: "open" | "resolved" | "archived"
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
      app_role: ["admin", "user", "owner", "mentor"],
      course_access_type: ["free", "paid", "subscription"],
      course_content_type: ["video", "text", "file"],
      course_format: ["live", "hybrid", "on_demand"],
      course_status: ["draft", "published"],
      intro_format: ["async", "short_call", "long_call"],
      intro_request_status: ["pending", "accepted", "declined"],
      mentor_application_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "revoked",
      ],
      profile_status: ["pending_review", "approved", "rejected", "suspended"],
      request_status: ["open", "resolved", "archived"],
    },
  },
} as const
