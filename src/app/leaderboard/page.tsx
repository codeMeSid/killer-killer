import type { Metadata } from "next";
import { Suspense } from "react";
import { Leaderboard } from "@/components/leaderboard";
import { Machine } from "@/components/machine";

export const metadata: Metadata = { title: "Leaderboard · killer-killer" };

async function Board({ searchParams }: PageProps<"/leaderboard">) {
  const slug = (await searchParams).slug;
  return <Leaderboard slug={typeof slug === "string" ? slug : null} />;
}

export default function LeaderboardPage(props: PageProps<"/leaderboard">) {
  return (
    <Machine kind="computer">
      <main className="flex flex-1 flex-col">
        <Suspense>
          <Board {...props} />
        </Suspense>
      </main>
    </Machine>
  );
}
