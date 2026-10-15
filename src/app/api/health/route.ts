import { requireEnv } from "@/lib/env";
import { ok, fail } from "@/lib/api";

type Check = { ok: boolean; detail: string };

async function checkSupabase(): Promise<Check> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key }, cache: "no-store" });
  return { ok: res.ok, detail: `GET /rest/v1/ -> ${res.status}` };
}

/** Proves Supabase is reachable with the configured credentials. */
export async function GET() {
  const supabase = await checkSupabase().catch((e: Error) => ({ ok: false, detail: e.message }));
  return supabase.ok ? ok({ supabase }) : fail("Supabase unreachable", 503);
}
