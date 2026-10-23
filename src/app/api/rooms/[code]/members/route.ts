import { handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { joinRoom } from "@/lib/rooms";

/** A device joins the case (or reclaims its agent number after a refresh). */
export async function POST(_req: Request, ctx: RouteContext<"/api/rooms/[code]/members">) {
  return handle(async () => joinRoom((await ctx.params).code, await ensureUserId()));
}
