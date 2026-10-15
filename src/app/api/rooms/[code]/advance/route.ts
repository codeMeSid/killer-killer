import { ApiError, handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import { advance } from "@/lib/rooms";

/** Host finished narrating: open choices, or reveal the ending once the story is over. */
export async function POST(_req: Request, ctx: RouteContext<"/api/rooms/[code]/advance">) {
  return handle(async () => {
    const userId = await currentUserId();
    if (!userId) throw new ApiError("Only the host screen can do that.", 401);
    return advance((await ctx.params).code, userId);
  });
}
