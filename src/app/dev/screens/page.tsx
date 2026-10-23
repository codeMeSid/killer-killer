import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DEMO_LEXICON, DEMO_SOLUTION, DEMO_VIEW } from "@/components/dev/demo-case";
import { Desk, type DeskInitial } from "@/components/desk/desk";
import type { RoomView } from "@/lib/rooms";

// Dev-only gallery: every desk screen from an in-code demo case, no database or Realtime.
// 404s in production builds.

const SCENES = ["desk", "desk-item", "accuse", "wrong", "solved", "defeated"] as const;
type Scene = (typeof SCENES)[number];

async function Scene({ searchParams }: PageProps<"/dev/screens">) {
  if (process.env.NODE_ENV === "production") notFound();
  const s = (await searchParams).s;
  const scene: Scene = SCENES.find((x) => x === s) ?? "desk";
  const base = DEMO_VIEW;
  const ended = (status: "solved" | "defeated"): RoomView => ({
    ...base,
    status,
    guessesUsed: status === "solved" ? 1 : 2,
    endedAt: new Date(Date.parse(base.startedAt) + 14 * 60_000).toISOString(),
    ending: { solution: DEMO_SOLUTION, seconds: 14 * 60, rank: status === "solved" ? 5 : null },
  });

  const scenes: Record<Scene, { view: RoomView; initial?: DeskInitial }> = {
    desk: { view: base, initial: { open: false, sel: "brief" } },
    "desk-item": { view: base, initial: { sel: "ph-stairs" } },
    accuse: { view: base, initial: { accuse: true, draft: { who: [2], motive: "m3" } } },
    wrong: { view: { ...base, guessesUsed: 1, lastWrong: true }, initial: { open: false } },
    solved: { view: ended("solved") },
    defeated: { view: ended("defeated") },
  };
  const { view, initial } = scenes[scene];
  return <Desk view={view} online={[1, 2, 3]} reading={{ "ph-stairs": [2], autopsy: [3] }} lexicon={DEMO_LEXICON} initial={initial} />;
}

export default function DevScreensPage(props: PageProps<"/dev/screens">) {
  return (
    <Suspense>
      <Scene {...props} />
    </Suspense>
  );
}
