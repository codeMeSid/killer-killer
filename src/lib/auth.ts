import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The signed-in (usually anonymous) user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

/**
 * Returns the user's id, signing in anonymously first if there is no session.
 * Route handlers only: the session cookie it sets is what lets a refreshed phone keep its seat.
 */
export async function ensureUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub as string | undefined;
  if (sub) return sub;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw new Error(`Anonymous sign-in failed: ${error?.message ?? "no user"}`);
  return signed.user.id;
}
