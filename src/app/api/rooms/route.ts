import { ApiError, handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { createRoom } from "@/lib/rooms";

/** The host opens a case: picks a file and names the team. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as { slug?: unknown; team?: unknown } | null;
    if (typeof body?.slug !== "string") throw new ApiError("Pick a case first.", 400);
    return createRoom(await ensureUserId(), body.slug, body.team);
  });
}
