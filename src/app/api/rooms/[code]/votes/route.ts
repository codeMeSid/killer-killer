import { ApiError, handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import { castVote } from "@/lib/rooms";

/** A living player names who they think did it. Final once accepted. */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/votes">) {
  return handle(async () => {
    const userId = await currentUserId();
    if (!userId) throw new ApiError("You're not in this mystery.", 401);
    const body = (await req.json().catch(() => null)) as { index?: unknown } | null;
    if (!Number.isInteger(body?.index)) throw new ApiError("Pick who you accuse first.", 400);
    return castVote((await ctx.params).code, userId, { index: body!.index as number });
  });
}
