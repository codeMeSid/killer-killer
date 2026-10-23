import { handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { submitGuess } from "@/lib/rooms";

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/guesses">) {
  return handle(async () => submitGuess((await ctx.params).code, await ensureUserId(), await req.json().catch(() => null)));
}
