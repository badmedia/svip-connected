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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: string
          requirements: any
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category: string
          requirements: any
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          category?: string
          requirements?: any
          points?: number
          created_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          helper_id: string
          id: string
          requester_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          helper_id: string
          id?: string
          requester_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          helper_id?: string
          id?: string
          requester_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsements: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          task_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          task_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          task_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          message_type?: string
          file_url?: string
          file_name?: string
          file_size?: number
          is_read?: boolean
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          message_type?: string
          file_url?: string
          file_name?: string
          file_size?: number
          is_read?: boolean
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          message_type?: string
          file_url?: string
          file_name?: string
          file_size?: number
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          data?: any
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          data?: any
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          data?: any
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          college: string | null
          college_email: string | null
          college_id_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location: string | null
          skills: string[] | null
          trust_intro: string | null
          trust_score: number | null
          updated_at: string | null
          total_help_given?: number
          total_help_received?: number
          achievement_points?: number
          last_active?: string
          is_verified?: boolean
          verification_documents?: any
          interests?: string[]
          study_subjects?: string[]
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          college_email?: string | null
          college_id_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          skills?: string[] | null
          trust_intro?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          college?: string | null
          college_email?: string | null
          college_id_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          skills?: string[] | null
          trust_intro?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          description: string
          id: string
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          unlocked_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          id: string
          name: string
          description: string
          subject: string
          college: string | null
          created_by: string
          max_members: number
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          subject: string
          college?: string | null
          created_by: string
          max_members?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          subject?: string
          college?: string | null
          created_by?: string
          max_members?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          id: string
          group_id: string
          title: string
          description: string | null
          scheduled_at: string
          duration_minutes: number
          location: string | null
          is_online: boolean
          meeting_link: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          title: string
          description?: string | null
          scheduled_at: string
          duration_minutes?: number
          location?: string | null
          is_online?: boolean
          meeting_link?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          title?: string
          description?: string | null
          scheduled_at?: string
          duration_minutes?: number
          location?: string | null
          is_online?: boolean
          meeting_link?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_session_attendees: {
        Row: {
          id: string
          session_id: string
          user_id: string
          status: string
          joined_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          status?: string
          joined_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          status?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_session_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          id: string
          title: string
          description: string | null
          file_url: string | null
          file_type: string | null
          subject: string | null
          tags: string[] | null
          shared_by: string
          group_id: string | null
          is_public: boolean
          download_count: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          subject?: string | null
          tags?: string[] | null
          shared_by: string
          group_id?: string | null
          is_public?: boolean
          download_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          subject?: string | null
          tags?: string[] | null
          shared_by?: string
          group_id?: string | null
          is_public?: boolean
          download_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_score_history: {
        Row: {
          id: string
          user_id: string
          old_score: number
          new_score: number
          change_reason: string
          related_task_id: string | null
          related_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          old_score: number
          new_score: number
          change_reason: string
          related_task_id?: string | null
          related_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          old_score?: number
          new_score?: number
          change_reason?: string
          related_task_id?: string | null
          related_user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_score_history_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_score_history_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          id: string
          user_id: string
          name: string
          search_filters: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          search_filters: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          search_filters?: any
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string
          reason: string
          description: string | null
          status: string
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id: string
          reason: string
          description?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string
          reason?: string
          description?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          notifications: any
          privacy_settings: any
          search_preferences: any
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications?: any
          privacy_settings?: any
          search_preferences?: any
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notifications?: any
          privacy_settings?: any
          search_preferences?: any
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          id: string
          event: string
          details: any
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          event: string
          details?: any
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          event?: string
          details?: any
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string | null
          action: string
          count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          count?: number
          window_start?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          count?: number
          window_start?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      file_uploads: {
        Row: {
          id: string
          user_id: string
          original_name: string
          secure_name: string
          file_url: string
          file_type: string
          file_size: number
          mime_type: string
          checksum: string | null
          is_verified: boolean
          scan_status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_name: string
          secure_name: string
          file_url: string
          file_type: string
          file_size: number
          mime_type: string
          checksum?: string | null
          is_verified?: boolean
          scan_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_name?: string
          secure_name?: string
          file_url?: string
          file_type?: string
          file_size?: number
          mime_type?: string
          checksum?: string | null
          is_verified?: boolean
          scan_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          ip_address: string | null
          user_agent: string | null
          is_active: boolean
          expires_at: string
          created_at: string
          last_accessed: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at: string
          created_at?: string
          last_accessed?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at?: string
          created_at?: string
          last_accessed?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      account_lockouts: {
        Row: {
          id: string
          user_id: string
          email: string
          failed_attempts: number
          locked_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          failed_attempts?: number
          locked_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          failed_attempts?: number
          locked_until?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_lockouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
      task_category:
        | "notes_typing"
        | "ppt_design"
        | "tutoring"
        | "app_testing"
        | "writing_help"
      task_status: "open" | "in_progress" | "completed" | "cancelled"
      task_type: "offer" | "request"
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
      task_category: [
        "notes_typing",
        "ppt_design",
        "tutoring",
        "app_testing",
        "writing_help",
      ],
      task_status: ["open", "in_progress", "completed", "cancelled"],
      task_type: ["offer", "request"],
    },
  },
} as const
