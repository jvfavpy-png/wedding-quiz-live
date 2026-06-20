import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabaseのサーバー環境変数が未設定です");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAnonServerClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabaseの公開環境変数が未設定です");
  }

  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
