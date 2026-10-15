import { ablyRest } from "@/lib/ably";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";

/**
 * Issues a short-lived Ably token so the browser never sees ABLY_API_KEY.
 * The clientId is taken from the Supabase session, so realtime identity == app identity.
 * Returns a raw Ably TokenRequest (not the app envelope) — the Ably SDK requires that exact shape.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const clientId = (data?.claims?.sub as string | undefined) ?? "anonymous";

    const tokenRequest = await ablyRest().auth.createTokenRequest({
      clientId,
      capability: {
        "demo*": ["subscribe", "publish", "presence"],
        // Game rooms: clients listen and show presence; only the server publishes (payload-free pings).
        "room:*": ["subscribe", "presence"],
      },
    });

    return Response.json(tokenRequest);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Ably token request failed", 500);
  }
}
