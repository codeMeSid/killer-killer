import { ablyRest } from "@/lib/ably";
import { requireEnv } from "@/lib/env";
import { ok, fail } from "@/lib/api";

type Check = { ok: boolean; detail: string };

async function checkSupabase(): Promise<Check> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key }, cache: "no-store" });
  return { ok: res.ok, detail: `GET /rest/v1/ -> ${res.status}` };
}

async function checkAbly(): Promise<Check> {
  const serverTime = await ablyRest().time();
  return { ok: true, detail: `ably time -> ${new Date(serverTime).toISOString()}` };
}

/** Proves both backends are actually reachable with the configured credentials. */
export async function GET() {
  const [supabase, ably] = await Promise.all([
    checkSupabase().catch((e: Error) => ({ ok: false, detail: e.message })),
    checkAbly().catch((e: Error) => ({ ok: false, detail: e.message })),
  ]);

  const payload = { supabase, ably };
  return supabase.ok && ably.ok ? ok(payload) : fail("One or more services unreachable", 503);
}
