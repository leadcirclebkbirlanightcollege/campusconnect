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
      achievements: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string
          icon: string
          id: string
          is_active: boolean
          points_reward: number
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          points_reward?: number
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          points_reward?: number
          title?: string
          updated_at?: string
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
      assignments: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          college_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          is_active: boolean
          max_marks: number | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          college_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          is_active?: boolean
          max_marks?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          college_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          is_active?: boolean
          max_marks?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          college_id: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          lecture_id: string
          marked_at: string
          points_earned: number
          status: string
          student_user_id: string
        }
        Insert: {
          college_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          lecture_id: string
          marked_at?: string
          points_earned?: number
          status?: string
          student_user_id: string
        }
        Update: {
          college_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          lecture_id?: string
          marked_at?: string
          points_earned?: number
          status?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attendance_student_profile"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attendance_audit_log: {
        Row: {
          attendance_id: string | null
          changed_at: string
          changed_by: string
          id: string
          lecture_id: string
          new_status: string | null
          old_status: string | null
          reason: string
          student_user_id: string
        }
        Insert: {
          attendance_id?: string | null
          changed_at?: string
          changed_by: string
          id?: string
          lecture_id: string
          new_status?: string | null
          old_status?: string | null
          reason: string
          student_user_id: string
        }
        Update: {
          attendance_id?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          lecture_id?: string
          new_status?: string | null
          old_status?: string | null
          reason?: string
          student_user_id?: string
        }
        Relationships: []
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
      audit_logs: {
        Row: {
          action: string
          college_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          performed_by: string
          target_entity: string
          target_id: string | null
        }
        Insert: {
          action: string
          college_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by: string
          target_entity: string
          target_id?: string | null
        }
        Update: {
          action?: string
          college_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by?: string
          target_entity?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          bonus_points: number
          challenge_type: string
          college_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          bonus_points?: number
          challenge_type?: string
          college_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          target_value?: number
          title: string
        }
        Update: {
          bonus_points?: number
          challenge_type?: string
          college_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          college_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          college_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_active: boolean
          name: string
          section: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          college_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          section?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          college_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          section?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          banner_image: string | null
          college_name: string
          created_at: string
          enabled_features: Json
          id: string
          is_active: boolean
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          subdomain: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          college_name: string
          created_at?: string
          enabled_features?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          subdomain?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          college_name?: string
          created_at?: string
          enabled_features?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          subdomain?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      core_team_members: {
        Row: {
          class: string | null
          college_id: string | null
          created_at: string
          designation: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          photo_url: string | null
        }
        Insert: {
          class?: string | null
          college_id?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          photo_url?: string | null
        }
        Update: {
          class?: string | null
          college_id?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_team_members_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          college_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          checkin_date?: string
          college_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          college_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      daily_rewards_log: {
        Row: {
          created_at: string
          id: string
          message: string | null
          points_awarded: number
          reward_date: string
          reward_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          points_awarded?: number
          reward_date: string
          reward_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          points_awarded?: number
          reward_date?: string
          reward_type?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          college_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          college_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          college_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_level: string
          class_id: string | null
          college_id: string | null
          created_at: string
          doc_type: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean
          subject: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          access_level?: string
          class_id?: string | null
          college_id?: string | null
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean
          subject?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          access_level?: string
          class_id?: string | null
          college_id?: string | null
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean
          subject?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          college_id: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string
          flyer_url: string | null
          id: string
          is_featured: boolean
          max_stalls: number | null
          poster_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time: string
          flyer_url?: string | null
          id?: string
          is_featured?: boolean
          max_stalls?: number | null
          poster_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          college_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string
          flyer_url?: string | null
          id?: string
          is_featured?: boolean
          max_stalls?: number | null
          poster_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          college_id: string | null
          created_at: string
          entered_by: string
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number
          remarks: string | null
          student_user_id: string
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          entered_by: string
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          remarks?: string | null
          student_user_id: string
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          entered_by?: string
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          remarks?: string | null
          student_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          college_id: string | null
          created_at: string
          created_by: string
          description: string | null
          exam_date: string
          id: string
          is_active: boolean
          max_marks: number
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          exam_date: string
          id?: string
          is_active?: boolean
          max_marks?: number
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          exam_date?: string
          id?: string
          is_active?: boolean
          max_marks?: number
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_note: string | null
          category: string
          college_id: string | null
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category?: string
          college_id?: string | null
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          college_id?: string | null
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          college: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          student_count: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          college: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          student_count?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          college?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          student_count?: string | null
          updated_at?: string
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
          college_id: string | null
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
          college_id?: string | null
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
          college_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "lectures_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      login_activity: {
        Row: {
          college_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_activity_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          channel_id: string | null
          created_at: string
          id: string
          is_deleted: boolean
          message_text: string | null
          reactions: Json | null
          receiver_id: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          channel_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_text?: string | null
          reactions?: Json | null
          receiver_id?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_text?: string | null
          reactions?: Json | null
          receiver_id?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          achievement_alerts: boolean
          announcements: boolean
          attendance_alerts: boolean
          created_at: string
          id: string
          lecture_alerts: boolean
          system_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_alerts?: boolean
          announcements?: boolean
          attendance_alerts?: boolean
          created_at?: string
          id?: string
          lecture_alerts?: boolean
          system_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_alerts?: boolean
          announcements?: boolean
          attendance_alerts?: boolean
          created_at?: string
          id?: string
          lecture_alerts?: boolean
          system_updates?: boolean
          updated_at?: string
          user_id?: string
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
      permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          college_id: string | null
          created_at: string
          id: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          college_id?: string | null
          created_at?: string
          id?: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          college_id?: string | null
          created_at?: string
          id?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_branding: {
        Row: {
          brand_name: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          tagline: string
          updated_at: string
        }
        Insert: {
          brand_name?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      point_claims: {
        Row: {
          activity_type: Database["public"]["Enums"]["claim_activity_type"]
          college_id: string | null
          created_at: string
          description: string | null
          event_id: string | null
          evidence_url: string | null
          id: string
          points: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["claim_activity_type"]
          college_id?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          points: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["claim_activity_type"]
          college_id?: string | null
          created_at?: string
          description?: string | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          points?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          college_id: string | null
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
          college_id?: string | null
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
          college_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "points_ledger_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
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
          bio: string | null
          class_name: string | null
          college_id: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string
          graduation_year: number | null
          id: string
          is_deleted: boolean
          is_verified: boolean
          name: string
          phone: string | null
          status: string
          student_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          class_name?: string | null
          college_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email: string
          graduation_year?: number | null
          id?: string
          is_deleted?: boolean
          is_verified?: boolean
          name: string
          phone?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          class_name?: string | null
          college_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string
          graduation_year?: number | null
          id?: string
          is_deleted?: boolean
          is_verified?: boolean
          name?: string
          phone?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          college_id: string | null
          created_at: string
          details: Json | null
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          college_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          college_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_registrations: {
        Row: {
          college_id: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          requirements: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stall_name: string
          status: Database["public"]["Enums"]["stall_status"]
          type: Database["public"]["Enums"]["stall_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          college_id?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          requirements?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name: string
          status?: Database["public"]["Enums"]["stall_status"]
          type?: Database["public"]["Enums"]["stall_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          college_id?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          requirements?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name?: string
          status?: Database["public"]["Enums"]["stall_status"]
          type?: Database["public"]["Enums"]["stall_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          awarded_at: string
          code: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          code: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          code?: string
          id?: string
          metadata?: Json | null
          user_id?: string
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
      student_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          deadline: string | null
          goal_type: string
          id: string
          status: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          deadline?: string | null
          goal_type: string
          id?: string
          status?: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          deadline?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_value?: number
          updated_at?: string
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
      student_streaks: {
        Row: {
          current_streak: number
          last_login_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_login_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_login_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: string
          attachment_name: string | null
          attachment_url: string | null
          college_id: string | null
          content: string | null
          created_at: string
          feedback: string | null
          id: string
          marks_obtained: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_user_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachment_name?: string | null
          attachment_url?: string | null
          college_id?: string | null
          content?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          marks_obtained?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_user_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachment_name?: string | null
          attachment_url?: string | null
          college_id?: string | null
          content?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          marks_obtained?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_user_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          class_id: string | null
          college_id: string
          created_at: string
          created_by: string
          day_of_week: number
          department_id: string | null
          end_time: string
          faculty_name: string | null
          id: string
          is_active: boolean
          start_time: string
          subject: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          class_id?: string | null
          college_id: string
          created_at?: string
          created_by: string
          day_of_week: number
          department_id?: string | null
          end_time: string
          faculty_name?: string | null
          id?: string
          is_active?: boolean
          start_time: string
          subject: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          class_id?: string | null
          college_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          department_id?: string | null
          end_time?: string
          faculty_name?: string | null
          id?: string
          is_active?: boolean
          start_time?: string
          subject?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          college_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_attendance_corrections: {
        Args: {
          p_end_date?: string
          p_lecture_id: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          attendance_id: string
          edited_at: string
          marked_at: string
          programme: string
          status: string
          student_id: string
          student_name: string
          student_user_id: string
          total_count: number
        }[]
      }
      award_points: {
        Args: {
          p_note?: string
          p_points: number
          p_source: string
          p_source_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      export_monthly_attendance_combined: {
        Args: {
          p_end_date: string
          p_programme_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_admin_college_analytics: { Args: never; Returns: Json }
      get_college_admins: { Args: never; Returns: Json }
      get_event_stall_summary: { Args: { p_event_id: string }; Returns: Json }
      get_faculty_lecture_analytics: {
        Args: { p_faculty_id?: string }
        Returns: Json
      }
      get_growth_insights: { Args: { p_user_id?: string }; Returns: Json }
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
      get_my_achievements: { Args: { p_limit?: number }; Returns: Json }
      get_my_college_id: { Args: never; Returns: string }
      get_my_points_total: { Args: never; Returns: number }
      get_my_streak: { Args: never; Returns: Json }
      get_my_tier_progress: {
        Args: {
          p_bronze_max?: number
          p_gold_max?: number
          p_silver_max?: number
        }
        Returns: Json
      }
      get_platform_analytics: { Args: never; Returns: Json }
      get_weekly_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          is_verified: boolean
          name: string
          rank: number
          user_id: string
          weekly_points: number
        }[]
      }
      is_active_user: { Args: { check_user_id: string }; Returns: boolean }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_faculty: { Args: { check_user_id: string }; Returns: boolean }
      is_student: { Args: { check_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_college_id?: string
          p_details?: Json
          p_ip_address?: string
          p_performed_by: string
          p_target_entity: string
          p_target_id?: string
        }
        Returns: undefined
      }
      unlock_achievement: {
        Args: { p_code: string; p_metadata?: Json; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_deletion_status:
        | "requested"
        | "approved"
        | "rejected"
        | "completed"
      app_role: "admin" | "student" | "super_admin" | "faculty"
      claim_activity_type:
        | "event_attendance"
        | "participation"
        | "winning"
        | "idea_submission"
        | "other"
      claim_status: "pending" | "approved" | "rejected"
      lecture_status: "scheduled" | "live" | "ended"
      notification_status: "draft" | "scheduled" | "sent" | "cancelled"
      stall_status: "pending" | "approved" | "rejected"
      stall_type: "food" | "game" | "startup" | "other"
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
      app_role: ["admin", "student", "super_admin", "faculty"],
      claim_activity_type: [
        "event_attendance",
        "participation",
        "winning",
        "idea_submission",
        "other",
      ],
      claim_status: ["pending", "approved", "rejected"],
      lecture_status: ["scheduled", "live", "ended"],
      notification_status: ["draft", "scheduled", "sent", "cancelled"],
      stall_status: ["pending", "approved", "rejected"],
      stall_type: ["food", "game", "startup", "other"],
    },
  },
} as const
