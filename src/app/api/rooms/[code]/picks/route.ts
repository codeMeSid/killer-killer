import { ApiError, handle } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import type { Slot } from "@/lib/engine/types";
import { lockIn } from "@/lib/rooms";

const SLOTS: readonly string[] = ["A", "B", "C", "D"];

/** A player locks in their choice for this round. Final once accepted. */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/picks">) {
  return handle(async () => {
    const userId = await currentUserId();
    if (!userId) throw new ApiError("You're not in this mystery.", 401);
    const body = (await req.json().catch(() => null)) as { slot?: unknown; pushed?: unknown; targetId?: unknown } | null;
    if (typeof body?.slot !== "string" || !SLOTS.includes(body.slot)) throw new ApiError("Choose something first.", 400);
    return lockIn((await ctx.params).code, userId, {
      slot: body.slot as Slot,
      pushed: body.pushed === true,
      targetId: typeof body.targetId === "string" ? body.targetId : null,
    });
  });
}
