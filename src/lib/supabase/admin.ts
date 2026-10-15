import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let admin: SupabaseClient | undefined;

/**
 * Secret-key client for game tables. Bypasses RLS, so it is server-only and every caller
 * authorizes by user id first. Game tables have RLS on with no policies (see the migration).
 */
export function adminClient(): SupabaseClient {
  admin ??= createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
