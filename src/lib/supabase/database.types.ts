// Generated from the live schema via the Supabase MCP
// (generate_typescript_types, project sfnrbogmmhloctlipwcr). Regenerate after
// migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          earned_at: string;
          key: string;
          user_id: string;
        };
        Insert: {
          earned_at?: string;
          key: string;
          user_id: string;
        };
        Update: {
          earned_at?: string;
          key?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          ui_lang: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          ui_lang?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          ui_lang?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          due_at: string | null;
          ease: number;
          interval_days: number;
          last_seen: string | null;
          mastery: number;
          reps: number;
          status: string;
          times_correct: number;
          times_seen: number;
          updated_at: string;
          user_id: string;
          word_id: number;
        };
        Insert: {
          due_at?: string | null;
          ease?: number;
          interval_days?: number;
          last_seen?: string | null;
          mastery?: number;
          reps?: number;
          status?: string;
          times_correct?: number;
          times_seen?: number;
          updated_at?: string;
          user_id: string;
          word_id: number;
        };
        Update: {
          due_at?: string | null;
          ease?: number;
          interval_days?: number;
          last_seen?: string | null;
          mastery?: number;
          reps?: number;
          status?: string;
          times_correct?: number;
          times_seen?: number;
          updated_at?: string;
          user_id?: string;
          word_id?: number;
        };
        Relationships: [];
      };
      stats: {
        Row: {
          daily_goal: number;
          gems: number;
          last_active: string | null;
          lessons_completed: Json;
          level: number;
          longest_streak: number;
          streak: number;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          daily_goal?: number;
          gems?: number;
          last_active?: string | null;
          lessons_completed?: Json;
          level?: number;
          longest_streak?: number;
          streak?: number;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          daily_goal?: number;
          gems?: number;
          last_active?: string | null;
          lessons_completed?: Json;
          level?: number;
          longest_streak?: number;
          streak?: number;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ProgressRow = Database["public"]["Tables"]["progress"]["Row"];
export type ProgressInsert = Database["public"]["Tables"]["progress"]["Insert"];
export type StatsRow = Database["public"]["Tables"]["stats"]["Row"];
export type StatsInsert = Database["public"]["Tables"]["stats"]["Insert"];
