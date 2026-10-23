import { handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { togglePin } from "@/lib/rooms";

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/pins">) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as { itemId?: unknown } | null;
    return togglePin((await ctx.params).code, await ensureUserId(), body?.itemId);
  });
}
