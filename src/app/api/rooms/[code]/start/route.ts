import { ApiError, handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import { startRoom } from "@/lib/rooms";

/** Host starts the mystery once every seat is filled. */
export async function POST(_req: Request, ctx: RouteContext<"/api/rooms/[code]/start">) {
  return handle(async () => {
    const userId = await currentUserId();
    if (!userId) throw new ApiError("Only the host screen can do that.", 401);
    return startRoom((await ctx.params).code, userId);
  });
}
