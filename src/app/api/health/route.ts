import { requireEnv } from "@/lib/env";
import { ok, fail } from "@/lib/api";

type Check = { ok: boolean; detail: string };

async function checkSupabase(): Promise<Check> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  // The REST root is closed to publishable keys (401); the auth health endpoint answers 200.
  const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: "no-store" });
  return { ok: res.ok, detail: `GET /auth/v1/health -> ${res.status}` };
}

/** Proves Supabase is reachable with the configured credentials. */
export async function GET() {
  const supabase = await checkSupabase().catch((e: Error) => ({ ok: false, detail: e.message }));
  return supabase.ok ? ok({ supabase }) : fail("Supabase unreachable", 503);
}
