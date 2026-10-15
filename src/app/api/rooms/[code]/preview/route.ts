import { handle } from "@/lib/api";
import { preview } from "@/lib/rooms";

/** Public teaser for the join screen: title, difficulty, seats left. No session needed. */
export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[code]/preview">) {
  return handle(async () => preview((await ctx.params).code));
}
