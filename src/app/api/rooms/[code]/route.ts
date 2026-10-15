import { handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import { viewFor } from "@/lib/rooms";

/** The caller's role-scoped view of the room: host or player, never anyone else's secrets. */
export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  return handle(async () => viewFor((await ctx.params).code, await currentUserId()));
}
