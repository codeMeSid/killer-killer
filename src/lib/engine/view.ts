// Role-scoped views: the only shape of game data that ever leaves the server.
// Never include killer_id, killer_method, points_to, clue/item/scene/option ids, kinds or the track.
import type { EndingKey, GameState, RecapKind, Result, Slot, Tree } from "./types.ts";
import { candidatesFor, characterName, fillText, optionsFor, playerWon, sceneById, statOf } from "./engine.ts";
import { DIFFICULTY, LUCK_MAX, STAT_MAX } from "./rules.ts";

export type RoomStatus = "lobby" | "playing" | "ended";
export type RoomPhase = "narrating" | "choosing" | "resolving" | "voting" | "finale";

export type Character = { name: string; description: string; alibi: string; motive: string };

export type ViewPlayer = {
  id: string;
  name: string;
  alive: boolean;
  /** Locked in for the current round (voted, during the vote). */
  locked: boolean;
  character: Character | null;
};

export type BaseView = {
  code: string;
  status: RoomStatus;
  phase: RoomPhase;
  mystery: {
    slug: string;
    title: string;
    difficulty: string;
    playerCount: number;
    premise: string;
    victim: { name: string; description: string };
  };
  /** `step` is the 0-based position on the clock (drives the ground); it is never shown as a number. */
  clock: { label: string; unit: string; value: string | null; previous: string | null; end: string; step: number; steps: number };
  /** Current scene intro, filled. Null in the lobby, during the vote and once the story is over. */
  intro: string | null;
  recap: { kind: RecapKind; text: string }[];
  /** Earlier rounds as narrated, oldest first (the clock value labels each, never a round number). */
  history: { clock: string; intro: string; recap: { kind: RecapKind; text: string }[] }[];
  players: ViewPlayer[];
  /** What the whole room knows: shared clues, party items, and the finale evidence once it is read out. */
  party: { clues: string[]; items: { name: string; description: string }[]; evidence: string | null };
  /** The accusation vote, while it is open: every suspect by name (a vote is an index into this list). */
  voting: null | { candidates: string[]; voted: number; voters: number };
  ending: null | {
    key: EndingKey;
    title: string;
    epilogue: string;
    killer: { character: string; player: string | null };
    /** Who the vote named (null: a tie, or everyone died first). */
    accused: string | null;
    votes: { voter: string; accused: string }[];
    fates: { player: string; character: string | null; alive: boolean; killer: boolean }[];
  };
};

export type HostView = BaseView & { role: "host" };

export type ViewOption = { slot: Slot; text: string; tag: "group" | "solo"; risky: boolean; sabotage: "player" | "group" | null };

export type PlayerView = BaseView & {
  role: "player";
  /** This phone's player row, known from the lobby on. */
  you: { id: string; name: string };
  me: {
    id: string;
    name: string;
    alive: boolean;
    killer: boolean;
    /** Your character's secret, never on anyone else's screen. */
    secret: string | null;
    /** What the last round did to you, in words. Null before the first round resolves. */
    result: string[] | null;
    luck: number;
    luckMax: number;
    stat: number;
    statMax: number;
    clues: string[];
    items: { name: string; description: string }[];
  } | null;
  options: ViewOption[] | null;
  myPick: { slot: Slot; text: string } | null;
  /** Your ballot while the vote is open: who you may accuse (indexes into voting.candidates), and your vote once cast. */
  ballot: null | { choices: number[]; mine: number | null };
  won: boolean | null;
};

export type ViewInput = {
  tree: Tree;
  slug: string;
  code: string;
  status: RoomStatus;
  phase: RoomPhase;
  state: GameState | null;
  /** Lobby roster from the DB (join order). Used until the game starts. */
  roster: { id: string; name: string }[];
  /** Players locked in this round, or (during the vote) who have voted. */
  locked: Set<string>;
};

function base(input: ViewInput): BaseView {
  const { tree, state } = input;
  const clockVals = tree.world.clock.values;
  const clueText = (id: string) => tree.world.clues.find((c) => c.id === id)?.text ?? "";
  const item = (id: string) => {
    const i = tree.world.items.find((x) => x.id === id);
    return { name: i?.name ?? "", description: i?.description ?? "" };
  };
  const character = (suspectId: string | null): Character | null => {
    const s = tree.world.suspects.find((x) => x.id === suspectId);
    return s ? { name: s.name, description: s.description, alibi: s.public_alibi, motive: s.motive } : null;
  };
  const storyOver = !!state?.ending;
  const finale = storyOver && input.phase === "finale";
  const suspectName = (i: number) => tree.world.suspects[i]?.name ?? "";

  let ending: BaseView["ending"] = null;
  if (state?.ending && finale) {
    const e = tree.endings[state.ending.key];
    const killerSuspect = tree.world.suspects.find((s) => s.id === tree.world.killer_id);
    ending = {
      key: state.ending.key,
      title: fillText(tree, state, e.title),
      epilogue: fillText(tree, state, e.epilogue),
      killer: {
        character: killerSuspect?.name ?? "",
        player: state.players.find((p) => p.id === state.killerPlayerId)?.name ?? null,
      },
      accused: state.ending.accused != null ? suspectName(state.ending.accused) : null,
      votes: state.players
        .filter((p) => state.votes?.[p.id] != null)
        .map((p) => ({ voter: characterName(tree, p), accused: suspectName(state.votes![p.id]) })),
      fates: state.players.map((p) => ({
        player: p.name,
        character: character(p.suspectId)?.name ?? null,
        alive: p.alive,
        killer: p.id === state.killerPlayerId,
      })),
    };
  }

  return {
    code: input.code,
    status: input.status,
    phase: input.phase,
    mystery: {
      slug: input.slug,
      title: tree.meta.title,
      difficulty: tree.meta.difficulty,
      playerCount: tree.meta.player_count,
      premise: tree.meta.premise,
      victim: tree.meta.victim,
    },
    clock: {
      label: tree.world.clock.label,
      unit: tree.world.clock.unit,
      value: state ? clockVals[(storyOver ? clockVals.length : state.round) - 1] : null,
      previous: state && state.round > 1 ? clockVals[state.round - 2] : null,
      end: clockVals[clockVals.length - 1],
      step: state ? (storyOver ? clockVals.length : state.round) - 1 : 0,
      steps: clockVals.length,
    },
    intro: state && !storyOver && !state.voting ? fillText(tree, state, sceneById(tree, state.sceneId).intro) : null,
    recap: state ? state.recap.map(({ kind, text }) => ({ kind, text })) : [],
    history: state?.history ?? [],
    players: state
      ? state.players.map((p) => ({
          id: p.id,
          name: p.name,
          alive: p.alive,
          locked: input.locked.has(p.id),
          character: character(p.suspectId),
        }))
      : input.roster.map((p) => ({ id: p.id, name: p.name, alive: true, locked: false, character: null })),
    party: state
      ? { clues: state.partyClues.map(clueText), items: state.partyItems.map(item), evidence: state.evidence ?? null }
      : { clues: [], items: [], evidence: null },
    voting:
      state?.voting && input.phase === "voting"
        ? {
            candidates: tree.world.suspects.map((s) => s.name),
            voted: state.players.filter((p) => p.alive && input.locked.has(p.id)).length,
            voters: state.players.filter((p) => p.alive).length,
          }
        : null,
    ending,
  };
}

/** A round's private results, in words for the phone. */
function resultText(tree: Tree, results: Result[]): string[] {
  const clue = (id: string) => tree.world.clues.find((c) => c.id === id)?.text ?? "";
  const item = (id: string) => tree.world.items.find((i) => i.id === id)?.name ?? "";
  const lines = results.map((r) => {
    switch (r.type) {
      case "found_clue":
        return r.shared ? `Everyone knows now: ${clue(r.clueId)}` : `Only you know: ${clue(r.clueId)}`;
      case "found_item":
        return r.shared ? `Found for everyone: ${item(r.itemId)}` : `You carry it now: ${item(r.itemId)}`;
      case "shared":
        return "You told everyone what you knew.";
      case "lost":
        return r.what === "clue" ? "Someone took something you knew." : "Someone took something you carried.";
      case "luck":
        return r.up ? "Luck is on your side." : "Your luck is slipping.";
    }
  });
  return lines.length ? lines : ["Nothing came of it."];
}

export function hostView(input: ViewInput): HostView {
  return { ...base(input), role: "host" };
}

export function playerView(
  input: ViewInput,
  you: { id: string; name: string },
  myPick: { slot: Slot } | null,
  myVote: number | null = null,
): PlayerView {
  const view = base(input);
  const { tree, state } = input;
  const p = state?.players.find((x) => x.id === you.id);
  if (!state || !p) return { ...view, role: "player", you, me: null, options: null, myPick: null, ballot: null, won: null };

  const options = optionsFor(tree, state, p.id);
  const canChoose = input.status === "playing" && input.phase === "choosing" && p.alive && !myPick;
  const picked = myPick ? options.find((o) => o.slot === myPick.slot) : undefined;

  return {
    ...view,
    role: "player",
    you,
    me: {
      id: p.id,
      name: p.name,
      alive: p.alive,
      killer: p.id === state.killerPlayerId,
      secret: tree.world.suspects.find((s) => s.id === p.suspectId)?.secret ?? null,
      result: state.results?.[p.id] ? resultText(tree, state.results[p.id]) : null,
      luck: p.luck,
      luckMax: LUCK_MAX,
      stat: statOf(tree, state, p),
      statMax: Math.min(DIFFICULTY[tree.meta.difficulty].keyNeeded, STAT_MAX),
      clues: p.clues.map((id) => tree.world.clues.find((c) => c.id === id)?.text ?? ""),
      items: p.items.map((id) => {
        const i = tree.world.items.find((x) => x.id === id);
        return { name: i?.name ?? "", description: i?.description ?? "" };
      }),
    },
    options: canChoose
      ? options.map((o) => ({
          slot: o.slot,
          text: o.text,
          tag: o.tag,
          risky: o.risk === "risky",
          sabotage: o.sabotage?.scope ?? null,
        }))
      : null,
    myPick: picked ? { slot: picked.slot, text: picked.text } : null,
    ballot: view.voting && p.alive ? { choices: candidatesFor(tree, state, p.id), mine: myVote } : null,
    won: state.ending && view.ending ? playerWon(state, p.id) : null,
  };
}
