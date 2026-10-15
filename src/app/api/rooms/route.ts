import { ApiError, handle } from "@/lib/api";
import { ensureUserId } from "@/lib/auth";
import { createRoom } from "@/lib/rooms";

/** Host screen opens a new room for a mystery. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as { mystery?: unknown } | null;
    if (typeof body?.mystery !== "string") throw new ApiError("Pick a case first.", 400);
    return createRoom(await ensureUserId(), body.mystery);
  });
}
