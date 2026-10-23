import { handle } from "@/lib/api";
import { leaderboard } from "@/lib/rooms";

export async function GET(req: Request) {
  return handle(async () => leaderboard(new URL(req.url).searchParams.get("slug")));
}
