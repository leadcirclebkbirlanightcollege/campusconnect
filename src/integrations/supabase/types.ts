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
      account_deletion_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["account_deletion_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["account_deletion_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["account_deletion_status"]
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string
          description: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          priority: string
          target: string
          target_class: string | null
          target_programme_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          target?: string
          target_class?: string | null
          target_programme_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          target?: string
          target_class?: string | null
          target_programme_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_programme_id_fkey"
            columns: ["target_programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          id: string
          lecture_id: string
          marked_at: string
          points_earned: number
          status: string
          student_user_id: string
        }
        Insert: {
          id?: string
          lecture_id: string
          marked_at?: string
          points_earned?: number
          status?: string
          student_user_id: string
        }
        Update: {
          id?: string
          lecture_id?: string
          marked_at?: string
          points_earned?: number
          status?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean
          lecture_id: string
          otp_hash: string
          token: string
          used_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_active?: boolean
          lecture_id: string
          otp_hash: string
          token: string
          used_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          lecture_id?: string
          otp_hash?: string
          token?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_tokens_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: true
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_content: {
        Row: {
          body: string | null
          content_type: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_active: boolean
          publish_date: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          content_type: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          publish_date?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          content_type?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          publish_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string
          id: string
          poster_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time: string
          id?: string
          poster_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string
          id?: string
          poster_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      lecture_programme_tags: {
        Row: {
          id: string
          lecture_id: string
          programme_id: string
          tagged_at: string
          tagged_by: string
        }
        Insert: {
          id?: string
          lecture_id: string
          programme_id: string
          tagged_at?: string
          tagged_by: string
        }
        Update: {
          id?: string
          lecture_id?: string
          programme_id?: string
          tagged_at?: string
          tagged_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_programme_tags_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_programme_tags_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          created_by: string
          end_at: string
          end_time: string
          ended_at: string | null
          flyer_object_path: string | null
          id: string
          lecture_date: string
          live_started_at: string | null
          start_at: string
          start_time: string
          status: Database["public"]["Enums"]["lecture_status"]
          topic: string
          updated_at: string
          venue: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_at: string
          end_time: string
          ended_at?: string | null
          flyer_object_path?: string | null
          id?: string
          lecture_date: string
          live_started_at?: string | null
          start_at: string
          start_time: string
          status?: Database["public"]["Enums"]["lecture_status"]
          topic: string
          updated_at?: string
          venue: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_at?: string
          end_time?: string
          ended_at?: string | null
          flyer_object_path?: string | null
          id?: string
          lecture_date?: string
          live_started_at?: string | null
          start_at?: string
          start_time?: string
          status?: Database["public"]["Enums"]["lecture_status"]
          topic?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
          lecture_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          body: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind?: string
          lecture_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          lecture_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          note: string | null
          points: number
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          points: number
          source: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          points?: number
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_rules: {
        Row: {
          created_at: string
          id: string
          points_per_attendance: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          points_per_attendance?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          points_per_attendance?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_anonymous: boolean
          options: Json
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          options?: Json
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          options?: Json
          question?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_name: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string
          id: string
          is_deleted: boolean
          is_verified: boolean
          name: string
          phone: string | null
          student_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email: string
          id?: string
          is_deleted?: boolean
          is_verified?: boolean
          name: string
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          class_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string
          id?: string
          is_deleted?: boolean
          is_verified?: boolean
          name?: string
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      programmes: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          reason: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_intelligence: {
        Row: {
          attendance_consistency: number
          behaviour_reliability: number
          engagement_index: number
          id: string
          risk_flags: string[]
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_consistency?: number
          behaviour_reliability?: number
          engagement_index?: number
          id?: string
          risk_flags?: string[]
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_consistency?: number
          behaviour_reliability?: number
          engagement_index?: number
          id?: string
          risk_flags?: string[]
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_programme_allotments: {
        Row: {
          allotted_at: string
          allotted_by: string
          id: string
          programme_id: string
          student_user_id: string
        }
        Insert: {
          allotted_at?: string
          allotted_by: string
          id?: string
          programme_id: string
          student_user_id: string
        }
        Update: {
          allotted_at?: string
          allotted_by?: string
          id?: string
          programme_id?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_programme_allotments_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
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
      get_leaderboard: {
        Args: { p_limit?: number; p_verified_only?: boolean }
        Returns: {
          avatar_url: string
          is_verified: boolean
          name: string
          points_total: number
          rank: number
          user_id: string
        }[]
      }
      get_lecture_attendance_summary: {
        Args: { p_lecture_id: string }
        Returns: Json
      }
      is_active_user: { Args: { check_user_id: string }; Returns: boolean }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_student: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      account_deletion_status:
        | "requested"
        | "approved"
        | "rejected"
        | "completed"
      app_role: "admin" | "student"
      lecture_status: "scheduled" | "live" | "ended"
      notification_status: "draft" | "scheduled" | "sent" | "cancelled"
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
      account_deletion_status: [
        "requested",
        "approved",
        "rejected",
        "completed",
      ],
      app_role: ["admin", "student"],
      lecture_status: ["scheduled", "live", "ended"],
      notification_status: ["draft", "scheduled", "sent", "cancelled"],
    },
  },
} as const
