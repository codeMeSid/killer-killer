import type { Metadata } from "next";
import { Leaderboard } from "@/components/leaderboard";
import { Machine } from "@/components/machine";

export const metadata: Metadata = { title: "Leaderboard · killer-killer" };

export default function LeaderboardPage() {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col">
        <Leaderboard />
      </main>
    </Machine>
  );
}
