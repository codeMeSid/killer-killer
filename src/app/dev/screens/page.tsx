import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DevScreen, type DevScene } from "@/components/dev-screen";
import { optionsFor, resolveRound, startGame } from "@/lib/engine/engine";
import type { GameState, Pick, Rng } from "@/lib/engine/types";
import { hostView, playerView, type ViewInput } from "@/lib/engine/view";
import { MYSTERIES } from "@/mysteries";

// Dev-only gallery of every game screen in a believable mid-game state, built by the real
// engine from a shipped mystery. No database or Realtime needed. 404s in production builds.

const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const NAMES = ["Mira", "Dev", "Sam", "Ivy"];

function play(rounds: number, seed: number) {
  const { tree, slug } = MYSTERIES.find((m) => m.tree.meta.player_count === 4)!; // ponytail: 4p only; add ?m= when a second gallery story matters
  const rng = seeded(seed);
  let state: GameState = startGame(tree, NAMES.map((name, i) => ({ id: `p${i + 1}`, name })), rng);
  for (let r = 0; r < rounds && !state.ending; r++) {
    const picks: Pick[] = state.players
      .filter((p) => p.alive)
      .map((p) => {
        const opts = optionsFor(tree, state, p.id).filter((o) => !o.sabotage);
        const o = opts[Math.floor(rng() * opts.length)];
        return { playerId: p.id, optionId: o.id, pushed: false, targetId: null };
      });
    state = resolveRound(tree, state, picks, rng);
  }
  return { tree, slug, state };
}

async function Scene({ searchParams }: PageProps<"/dev/screens">) {
  if (process.env.NODE_ENV === "production") notFound();
  const s = (await searchParams).s;
  const scene = (typeof s === "string" ? s : "mystery-narrate") as DevScene;

  const { tree, slug, state } = play(scene.startsWith("end") ? 12 : 4, 7);
  const base: ViewInput = { tree, slug, code: "K7XQ2M9P", status: "playing", phase: "narrating", state, roster: [], locked: new Set() };
  const online = new Set(["p1", "p2", "p3"]); // Ivy's phone is offline
  const you = state.players.find((p) => p.alive && p.id !== state.killerPlayerId) ?? state.players[0];
  const killer = state.players.find((p) => p.id === state.killerPlayerId) ?? state.players[0];

  const lobby: ViewInput = { ...base, status: "lobby", state: null, roster: NAMES.slice(0, 3).map((name, i) => ({ id: `p${i + 1}`, name })) };
  const choosing: ViewInput = { ...base, phase: "choosing", locked: new Set(state.players.filter((p) => p.alive).slice(0, 2).map((p) => p.id)) };
  const ended: ViewInput = { ...base, status: "ended", phase: "finale" };
  const dead: ViewInput = { ...base, state: { ...state, players: state.players.map((p) => (p.id === you.id ? { ...p, alive: false } : p)) } };
  const youRef = { id: you.id, name: you.name };

  const views = {
    "lobby-host": () => hostView(lobby),
    "lobby-player": () => playerView(lobby, { id: "p1", name: "Mira" }, null),
    "mystery-narrate": () => hostView(base),
    "mystery-choose": () => hostView(choosing),
    "mystery-resolving": () => hostView({ ...base, phase: "resolving" }),
    "story-narrate": () => playerView(base, youRef, null),
    "story-choose": () => playerView({ ...choosing, locked: new Set() }, youRef, null),
    "story-killer": () => playerView({ ...choosing, locked: new Set() }, { id: killer.id, name: killer.name }, null),
    "story-locked": () => playerView(choosing, youRef, { slot: "A" }),
    "story-dead": () => playerView(dead, youRef, null),
    "end-host": () => hostView(ended),
    "end-player": () => playerView(ended, youRef, null),
  } satisfies Record<DevScene, () => unknown>;

  const view = (views[scene] ?? views["mystery-narrate"])();
  return <DevScreen scene={scene} view={view} online={[...online]} />;
}

export default function DevScreensPage(props: PageProps<"/dev/screens">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense>
        <Scene {...props} />
      </Suspense>
    </main>
  );
}
