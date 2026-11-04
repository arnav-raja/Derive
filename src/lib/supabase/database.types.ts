// Generated from the live Supabase schema (project spivlvrkjsqxjeonnmvd) on
// 4 November 2026, then trimmed to the public schema helpers Derive uses.
// Regenerate after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      attempts: {
        Row: {
          card_id: string | null;
          confidence: number | null;
          correct: boolean | null;
          created_at: string;
          duration_ms: number | null;
          exercise_id: string | null;
          hints_used: number;
          id: number;
          kind: string;
          learner_id: string;
          lesson_code: string | null;
          payload: Json;
          rating: number | null;
        };
        Insert: {
          card_id?: string | null;
          confidence?: number | null;
          correct?: boolean | null;
          created_at?: string;
          duration_ms?: number | null;
          exercise_id?: string | null;
          hints_used?: number;
          id?: never;
          kind: string;
          learner_id: string;
          lesson_code?: string | null;
          payload?: Json;
          rating?: number | null;
        };
        Update: {
          card_id?: string | null;
          confidence?: number | null;
          correct?: boolean | null;
          created_at?: string;
          duration_ms?: number | null;
          exercise_id?: string | null;
          hints_used?: number;
          id?: never;
          kind?: string;
          learner_id?: string;
          lesson_code?: string | null;
          payload?: Json;
          rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      concept_state: {
        Row: {
          concept_id: string;
          evidence: Json;
          explained_at: string | null;
          learner_id: string;
          mastered_at: string | null;
          produced_at: string | null;
          provisional: boolean;
          recalled_at: string | null;
          updated_at: string;
        };
        Insert: {
          concept_id: string;
          evidence?: Json;
          explained_at?: string | null;
          learner_id: string;
          mastered_at?: string | null;
          produced_at?: string | null;
          provisional?: boolean;
          recalled_at?: string | null;
          updated_at?: string;
        };
        Update: {
          concept_id?: string;
          evidence?: Json;
          explained_at?: string | null;
          learner_id?: string;
          mastered_at?: string | null;
          produced_at?: string | null;
          provisional?: boolean;
          recalled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concept_state_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      explanations: {
        Row: {
          body: string;
          created_at: string;
          feedback: string | null;
          id: number;
          item_id: string;
          learner_id: string;
          lesson_code: string;
          passed: boolean | null;
          rubric: Json;
        };
        Insert: {
          body: string;
          created_at?: string;
          feedback?: string | null;
          id?: never;
          item_id: string;
          learner_id: string;
          lesson_code: string;
          passed?: boolean | null;
          rubric?: Json;
        };
        Update: {
          body?: string;
          created_at?: string;
          feedback?: string | null;
          id?: never;
          item_id?: string;
          learner_id?: string;
          lesson_code?: string;
          passed?: boolean | null;
          rubric?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "explanations_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          actual_cost_usd: number | null;
          cap_usd: number | null;
          created_at: string;
          estimated_cost_usd: number | null;
          finished_at: string | null;
          hardware: string | null;
          id: string;
          kind: string;
          learner_id: string;
          lesson_code: string | null;
          logs: Json;
          started_at: string | null;
          status: string;
        };
        Insert: {
          actual_cost_usd?: number | null;
          cap_usd?: number | null;
          created_at?: string;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          hardware?: string | null;
          id?: string;
          kind: string;
          learner_id: string;
          lesson_code?: string | null;
          logs?: Json;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          actual_cost_usd?: number | null;
          cap_usd?: number | null;
          created_at?: string;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          hardware?: string | null;
          id?: string;
          kind?: string;
          learner_id?: string;
          lesson_code?: string | null;
          logs?: Json;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      learners: {
        Row: {
          created_at: string;
          daily_tutor_budget_usd: number;
          display_name: string | null;
          id: string;
          monthly_compute_budget_usd: number;
          placement: Json;
          settings: Json;
          updated_at: string;
          weekly_hours: number;
        };
        Insert: {
          created_at?: string;
          daily_tutor_budget_usd?: number;
          display_name?: string | null;
          id: string;
          monthly_compute_budget_usd?: number;
          placement?: Json;
          settings?: Json;
          updated_at?: string;
          weekly_hours?: number;
        };
        Update: {
          created_at?: string;
          daily_tutor_budget_usd?: number;
          display_name?: string | null;
          id?: string;
          monthly_compute_budget_usd?: number;
          placement?: Json;
          settings?: Json;
          updated_at?: string;
          weekly_hours?: number;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          learner_id: string;
          lesson_code: string;
          phase: string;
          started_at: string;
          state: Json;
          status: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          learner_id: string;
          lesson_code: string;
          phase: string;
          started_at?: string;
          state?: Json;
          status?: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          learner_id?: string;
          lesson_code?: string;
          phase?: string;
          started_at?: string;
          state?: Json;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      notebook_entries: {
        Row: {
          body: string;
          created_at: string;
          id: number;
          kind: string;
          learner_id: string;
          lesson_code: string | null;
          location: string | null;
          resolved_at: string | null;
          revisit_at: string | null;
          source: string;
          status: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: never;
          kind: string;
          learner_id: string;
          lesson_code?: string | null;
          location?: string | null;
          resolved_at?: string | null;
          revisit_at?: string | null;
          source: string;
          status?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: never;
          kind?: string;
          learner_id?: string;
          lesson_code?: string | null;
          location?: string | null;
          resolved_at?: string | null;
          revisit_at?: string | null;
          source?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notebook_entries_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      review_cards: {
        Row: {
          card_id: string;
          concept_id: string;
          created_at: string;
          difficulty: number;
          due: string;
          elapsed_days: number;
          lapses: number;
          last_review: string | null;
          learner_id: string;
          learning_steps: number;
          lesson_code: string;
          next_variant: number;
          provisional: boolean;
          reps: number;
          scheduled_days: number;
          stability: number;
          state: number;
        };
        Insert: {
          card_id: string;
          concept_id: string;
          created_at?: string;
          difficulty?: number;
          due: string;
          elapsed_days?: number;
          lapses?: number;
          last_review?: string | null;
          learner_id: string;
          learning_steps?: number;
          lesson_code: string;
          next_variant?: number;
          provisional?: boolean;
          reps?: number;
          scheduled_days?: number;
          stability?: number;
          state?: number;
        };
        Update: {
          card_id?: string;
          concept_id?: string;
          created_at?: string;
          difficulty?: number;
          due?: string;
          elapsed_days?: number;
          lapses?: number;
          last_review?: string | null;
          learner_id?: string;
          learning_steps?: number;
          lesson_code?: string;
          next_variant?: number;
          provisional?: boolean;
          reps?: number;
          scheduled_days?: number;
          stability?: number;
          state?: number;
        };
        Relationships: [
          {
            foreignKeyName: "review_cards_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_sessions: {
        Row: {
          cache_read_tokens: number;
          cache_write_tokens: number;
          cost_usd: number;
          created_at: string;
          exercise_id: string | null;
          guard_blocked: number;
          id: number;
          input_tokens: number;
          learner_id: string;
          lesson_code: string | null;
          mode: string;
          output_tokens: number;
          rung: number | null;
          summary: string | null;
        };
        Insert: {
          cache_read_tokens?: number;
          cache_write_tokens?: number;
          cost_usd?: number;
          created_at?: string;
          exercise_id?: string | null;
          guard_blocked?: number;
          id?: never;
          input_tokens?: number;
          learner_id: string;
          lesson_code?: string | null;
          mode: string;
          output_tokens?: number;
          rung?: number | null;
          summary?: string | null;
        };
        Update: {
          cache_read_tokens?: number;
          cache_write_tokens?: number;
          cost_usd?: number;
          created_at?: string;
          exercise_id?: string | null;
          guard_blocked?: number;
          id?: never;
          input_tokens?: number;
          learner_id?: string;
          lesson_code?: string | null;
          mode?: string;
          output_tokens?: number;
          rung?: number | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_sessions_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      signup_open: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
