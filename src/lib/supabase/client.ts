import { createBrowserClient } from "@supabase/ssr";

/** Browser/Client Component Supabase client. Publishable key only — never the secret key. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
