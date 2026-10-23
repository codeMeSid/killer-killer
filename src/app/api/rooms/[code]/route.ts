import { handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import { roomView } from "@/lib/rooms";

/** The same case file on every device. The solution stays out until the case is closed. */
export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  return handle(async () => roomView((await ctx.params).code, await currentUserId()));
}
