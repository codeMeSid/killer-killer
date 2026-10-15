import { ApiError, handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { joinRoom } from "@/lib/rooms";

/** A phone takes a seat (or reclaims its own after a refresh). */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/players">) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
    if (typeof body?.name !== "string") throw new ApiError("Give yourself a name.", 400);
    return joinRoom((await ctx.params).code, await ensureUserId(), body.name);
  });
}
