import { handle } from "@/lib/api";
import { leaderboard } from "@/lib/rooms";

export async function GET() {
  return handle(async () => leaderboard());
}
