export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          room_code: string;
          admin_key: string;
          status: "waiting" | "playing" | "finished";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          room_code: string;
          admin_key: string;
          status?: "waiting" | "playing" | "finished";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          participant_token: string;
          score: number;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          participant_token: string;
          score?: number;
          joined_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          event_id: string;
          order_no: number;
          text: string;
          option_1: string;
          option_2: string;
          option_3: string;
          option_4: string;
          correct_index: number;
          time_limit_sec: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          order_no: number;
          text: string;
          option_1: string;
          option_2: string;
          option_3: string;
          option_4: string;
          correct_index: number;
          time_limit_sec?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      answers: {
        Row: {
          id: string;
          event_id: string;
          question_id: string;
          participant_id: string;
          selected_index: number;
          response_ms: number;
          is_correct: boolean;
          point: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          question_id: string;
          participant_id: string;
          selected_index: number;
          response_ms: number;
          is_correct: boolean;
          point: number;
          answered_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["answers"]["Insert"]>;
        Relationships: [];
      };
      live_state: {
        Row: {
          event_id: string;
          current_question_id: string | null;
          phase: "lobby" | "question" | "closed" | "answer" | "ranking" | "finished";
          question_started_at: string | null;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          current_question_id?: string | null;
          phase?: "lobby" | "question" | "closed" | "answer" | "ranking" | "finished";
          question_started_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["live_state"]["Insert"]>;
        Relationships: [];
      };
      event_stats: {
        Row: {
          event_id: string;
          participant_count: number;
          total_answer_count: number;
          updated_at: string;
        };
        Insert: {
          event_id: string;
          participant_count?: number;
          total_answer_count?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_stats"]["Insert"]>;
        Relationships: [];
      };
      question_stats: {
        Row: {
          question_id: string;
          event_id: string;
          option_0_count: number;
          option_1_count: number;
          option_2_count: number;
          option_3_count: number;
          total_count: number;
          updated_at: string;
        };
        Insert: {
          question_id: string;
          event_id: string;
          option_0_count?: number;
          option_1_count?: number;
          option_2_count?: number;
          option_3_count?: number;
          total_count?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["question_stats"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_event: {
        Args: { p_room_code: string; p_name: string; p_participant_token: string };
        Returns: Json;
      };
      submit_answer: {
        Args: {
          p_room_code: string;
          p_participant_id: string;
          p_participant_token: string;
          p_question_id: string;
          p_selected_index: number;
        };
        Returns: Json;
      };
      get_room_snapshot: { Args: { p_room_code: string }; Returns: Json };
      get_answer_distribution: {
        Args: { p_room_code: string; p_question_id?: string | null };
        Returns: Json;
      };
      get_ranking: { Args: { p_room_code: string }; Returns: Json };
      get_my_answer: {
        Args: {
          p_room_code: string;
          p_participant_id: string;
          p_participant_token: string;
          p_question_id: string;
        };
        Returns: Json;
      };
      get_admin_room_snapshot: {
        Args: { p_room_code: string; p_admin_key: string };
        Returns: Json;
      };
      admin_start_question: {
        Args: { p_room_code: string; p_admin_key: string; p_question_id: string };
        Returns: Json;
      };
      admin_close_question: {
        Args: { p_room_code: string; p_admin_key: string };
        Returns: Json;
      };
      admin_reveal_answer: {
        Args: { p_room_code: string; p_admin_key: string };
        Returns: Json;
      };
      admin_show_ranking: {
        Args: { p_room_code: string; p_admin_key: string };
        Returns: Json;
      };
      admin_finish_event: {
        Args: { p_room_code: string; p_admin_key: string };
        Returns: Json;
      };
      admin_upsert_question: {
        Args: {
          p_room_code: string;
          p_admin_key: string;
          p_question_id: string | null;
          p_order_no: number;
          p_text: string;
          p_option_1: string;
          p_option_2: string;
          p_option_3: string;
          p_option_4: string;
          p_correct_index: number;
          p_time_limit_sec: number;
        };
        Returns: Json;
      };
      admin_delete_question: {
        Args: { p_room_code: string; p_admin_key: string; p_question_id: string };
        Returns: Json;
      };
      admin_reorder_questions: {
        Args: { p_room_code: string; p_admin_key: string; p_question_ids: string[] };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
