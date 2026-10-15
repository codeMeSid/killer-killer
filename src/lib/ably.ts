import Ably from "ably";
import { requireEnv } from "@/lib/env";

let rest: Ably.Rest | undefined;

/** Server-side Ably REST client. Holds the root API key — server only, never imported by a Client Component. */
export function ablyRest(): Ably.Rest {
  rest ??= new Ably.Rest({ key: requireEnv("ABLY_API_KEY") });
  return rest;
}
