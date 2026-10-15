// The game engine: a pure port of the skill's references/engine-rules.md.
// No I/O, no clock, randomness injected — so it is testable and the server is the only caller.
import type {
  Effect, Ending, GameState, Option, Pick, PlayerState, RecapLine, Result, Rng, Scene, Slot, Tag, Tree, Variant,
} from "./types.ts";
import {
  DIFFICULTY, LUCK_MAX, PIVOT_ROUND, PUSH_BONUS, PUSH_COST, RED_HERRING_COMMITS_FOR_WRONG, START_LUCK,
  STAT_MAX, THRESHOLDS,
} from "./rules.ts";

export function sceneById(tree: Tree, id: string): Scene {
  const scene = tree.scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
}

export function playerById(state: GameState, id: string): PlayerState {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Seats players. Suspects mode maps players to suspect slots at random, so one tree replays differently. */
export function startGame(tree: Tree, players: { id: string; name: string }[], rng: Rng): GameState {
  if (players.length !== tree.meta.player_count) {
    throw new Error(`This mystery needs ${tree.meta.player_count} players, got ${players.length}`);
  }
  const suspects = tree.meta.player_role === "suspects" ? shuffle(tree.world.suspects, rng) : null;
  const seated: PlayerState[] = players.map((p, i) => {
    const suspect = suspects?.[i] ?? null;
    return {
      id: p.id,
      name: p.name,
      slot: suspect?.player_slot ?? i + 1,
      suspectId: suspect?.id ?? null,
      luck: START_LUCK,
      alive: true,
      clues: [],
      items: [],
    };
  });
  seated.sort((a, b) => a.slot - b.slot);
  const first = tree.scenes.find((s) => s.round === 1);
  if (!first) throw new Error("Tree has no round-1 scene");
  return {
    round: 1,
    sceneId: first.id,
    players: seated,
    killerPlayerId: seated.find((p) => p.suspectId === tree.world.killer_id)?.id ?? null,
    partyClues: [],
    partyItems: [],
    redHerrings: 0,
    track: null,
    recap: [],
    history: [],
    results: {},
    evidence: null,
    voting: false,
    votes: null,
    ending: null,
  };
}

/** What the story calls a player: their character's name in suspects mode, their own name otherwise. */
export function characterName(tree: Tree, p: PlayerState): string {
  const s = tree.world.suspects.find((x) => x.id === p.suspectId);
  return s ? (s.short_name ?? s.name) : p.name;
}

const keyClueIds = (tree: Tree) => new Set(tree.world.clues.filter((c) => c.kind === "key").map((c) => c.id));

/** closer_to_mystery: distinct key clues the player knows (private + shared), capped. */
export function statOf(tree: Tree, state: GameState, p: PlayerState): number {
  const keys = keyClueIds(tree);
  return Math.min(new Set([...p.clues, ...state.partyClues].filter((id) => keys.has(id))).size, STAT_MAX);
}

const holds = (state: GameState, p: PlayerState, itemId: string) =>
  p.items.includes(itemId) || state.partyItems.includes(itemId);

function meets(tree: Tree, state: GameState, p: PlayerState, v: Variant): boolean {
  if (v.player_slot != null && v.player_slot !== p.slot) return false;
  if (v.requires.items && !v.requires.items.every((i) => holds(state, p, i))) return false;
  if (v.requires.min_stat != null && statOf(tree, state, p) < v.requires.min_stat) return false;
  return true;
}

/** The player's base options: their character's own set (suspects mode) or the shared four. */
function baseOptions(scene: Scene, p: PlayerState): Option[] {
  const own = scene.personal?.[String(p.slot)] ?? scene.options;
  if (!own) throw new Error(`Scene ${scene.id} has no options for slot ${p.slot}`);
  return own;
}

/** The four options this player sees: per slot, the first variant open to them that they qualify for, else their own. */
export function optionsFor(tree: Tree, state: GameState, playerId: string): Option[] {
  const p = playerById(state, playerId);
  const scene = sceneById(tree, state.sceneId);
  return baseOptions(scene, p).map(
    (def) => scene.variants.find((v) => v.slot === def.slot && meets(tree, state, p, v))?.option ?? def,
  );
}

/** Server-side check of a lock-in. Returns a player-facing error, or null when the pick is legal. */
export function validatePick(tree: Tree, state: GameState, pick: { playerId: string; slot: Slot; pushed: boolean; targetId: string | null }): string | null {
  const p = state.players.find((x) => x.id === pick.playerId);
  if (!p) return "You are not in this mystery.";
  if (!p.alive) return "The dead don't choose.";
  const option = optionsFor(tree, state, p.id).find((o) => o.slot === pick.slot);
  if (!option) return "That choice isn't on the table.";
  if (pick.pushed && p.luck < PUSH_COST) return "You have no luck left to push.";
  if (option.sabotage?.scope === "player") {
    const target = state.players.find((x) => x.id === pick.targetId);
    if (!target || target.id === p.id || !target.alive) return "Pick someone to turn on.";
  }
  return null;
}

const clampLuck = (state: GameState) => {
  for (const p of state.players) p.luck = Math.max(0, Math.min(LUCK_MAX, p.luck));
};

/** Grants a clue; true when it was news (a fresh private find, or newly shared with everyone). */
function grantClue(state: GameState, actor: PlayerState, tag: Tag, clueId: string): boolean {
  if (state.partyClues.includes(clueId)) return false;
  if (tag === "group") {
    state.partyClues.push(clueId);
    for (const p of state.players) p.clues = p.clues.filter((c) => c !== clueId);
    return true;
  }
  if (actor.clues.includes(clueId)) return false;
  actor.clues.push(clueId);
  return true;
}

function grantItem(tree: Tree, state: GameState, actor: PlayerState, tag: Tag, itemId: string): boolean {
  const held = state.partyItems.includes(itemId) || state.players.some((p) => p.items.includes(itemId));
  if (held) return false;
  (tag === "group" ? state.partyItems : actor.items).push(itemId);
  if (tree.world.items.find((i) => i.id === itemId)?.luck_on_grant === 1) actor.luck += 1;
  return true;
}

function applyEffect(tree: Tree, state: GameState, actor: PlayerState, tag: Tag, effect: Effect): Result | null {
  const shared = tag === "group";
  switch (effect.type) {
    case "grant_clue":
      return grantClue(state, actor, tag, effect.clue_id) ? { type: "found_clue", clueId: effect.clue_id, shared } : null;
    case "grant_item":
      return grantItem(tree, state, actor, tag, effect.item_id) ? { type: "found_item", itemId: effect.item_id, shared } : null;
    case "luck":
      actor.luck += effect.delta;
      return null; // reported once per round from the net change
    case "share_private_clues": {
      const had = actor.clues.length > 0;
      for (const c of actor.clues) if (!state.partyClues.includes(c)) state.partyClues.push(c);
      actor.clues = [];
      return had ? { type: "shared" } : null;
    }
  }
}

function dropBelongings(state: GameState, p: PlayerState) {
  for (const c of p.clues) if (!state.partyClues.includes(c)) state.partyClues.push(c);
  for (const i of p.items) if (!state.partyItems.includes(i)) state.partyItems.push(i);
  p.clues = [];
  p.items = [];
}

const joinNames = (names: string[]) =>
  names.length === 0 ? "no one" : names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** Fills the placeholders the skill allows, with character names. Anything unresolved reads as "someone". */
export function fillText(tree: Tree, state: GameState, text: string, who: { player?: string; target?: string } = {}): string {
  const killer = tree.world.suspects.find((s) => s.id === tree.world.killer_id)?.name ?? "someone";
  const accused = state.ending?.accused != null ? tree.world.suspects[state.ending.accused]?.name : undefined;
  const vars: Record<string, string> = {
    player: who.player ?? "someone",
    target: who.target ?? "someone",
    party: "the group",
    victim: tree.meta.victim.name,
    killer,
    survivors: joinNames(state.players.filter((p) => p.alive).map((p) => characterName(tree, p))),
    accused: accused ?? "someone",
  };
  return text.replace(/\{(player|target|party|victim|killer|survivors|accused)\}/g, (_, k: string) => vars[k]);
}

/** Track lock at the pivot, from alive players' knowledge plus the party pool. */
function pivotTrack(tree: Tree, state: GameState) {
  const keys = keyClueIds(tree);
  const alive = state.players.filter((p) => p.alive);
  const known = new Set([...state.partyClues, ...alive.flatMap((p) => p.clues)].filter((c) => keys.has(c)));
  const decisive = tree.world.items.find((i) => i.decisive)?.id;
  const hasDecisive = !!decisive && (state.partyItems.includes(decisive) || alive.some((p) => p.items.includes(decisive)));
  if (known.size >= DIFFICULTY[tree.meta.difficulty].keyNeeded && hasDecisive) return "solved" as const;
  if (state.redHerrings >= RED_HERRING_COMMITS_FOR_WRONG) return "wrong" as const;
  return "escape" as const;
}

/** Early-out ending, no vote: everyone dead, or (suspects mode) only the killer left. */
function earlyEnding(state: GameState): Ending | null {
  const alive = state.players.filter((p) => p.alive);
  const killerAlone = state.killerPlayerId && state.players.length > 1 && alive.length === 1 && alive[0].id === state.killerPlayerId;
  if (alive.length > 0 && !killerAlone) return null;
  return { key: "culprit_escapes", accused: null };
}

/**
 * Resolves one round from every alive player's lock-in. Returns the next state; the input is not mutated.
 * Order follows engine-rules §3: roll → effects → sabotage (slot order) → deaths → branch → recap.
 */
export function resolveRound(tree: Tree, prev: GameState, picks: Pick[], rng: Rng): GameState {
  if (prev.ending || prev.voting) throw new Error("The rounds are over");
  const s = structuredClone(prev);
  const name = (id: string | null | undefined) => {
    const p = id ? s.players.find((x) => x.id === id) : undefined;
    return p ? characterName(tree, p) : undefined;
  };
  const fill = (text: string, actorId?: string, targetId?: string | null) =>
    fillText(tree, s, text, { player: name(actorId), target: name(targetId) });

  const startLuck = new Map(s.players.map((p) => [p.id, p.luck]));
  const startStat = new Map(s.players.map((p) => [p.id, statOf(tree, s, p)]));
  const notes: Record<string, Result[]> = {};
  const note = (id: string, r: Result | null) => r && (notes[id] ??= []).push(r);

  const results = s.players
    .filter((p) => p.alive)
    .flatMap((p) => {
      const pick = picks.find((k) => k.playerId === p.id);
      if (!pick) return [];
      const option = optionsFor(tree, prev, p.id).find((o) => o.id === pick.optionId);
      if (!option) throw new Error(`Option ${pick.optionId} is not available to ${p.id}`);
      return [{ p, pick, option, die: 0, success: false }];
    });
  if (results.length === 0) throw new Error("No picks to resolve");

  // 1. Roll. Luck at round start decides; pushing spends luck even on a success.
  for (const r of results) {
    const luck0 = startLuck.get(r.p.id)!;
    const pushed = r.pick.pushed && luck0 >= PUSH_COST;
    if (pushed) r.p.luck -= PUSH_COST;
    r.die = Math.floor(rng() * 6) + 1;
    r.success = r.die !== 1 && r.die + luck0 + (pushed ? PUSH_BONUS : 0) >= THRESHOLDS[r.option.tier];
    if (r.die === 1) r.p.luck -= 1;
  }
  clampLuck(s);

  // 2. Effects.
  for (const r of results) {
    const block = r.success ? r.option.on_success : r.option.on_failure;
    for (const e of block.effects) note(r.p.id, applyEffect(tree, s, r.p, r.option.tag, e));
    if (r.success && r.option.tag === "group") r.p.luck += 1;
    if (r.success && r.die === 6) {
      r.p.luck += 1;
      if (r.option.bonus_clue_id && grantClue(s, r.p, r.option.tag, r.option.bonus_clue_id)) {
        note(r.p.id, { type: "found_clue", clueId: r.option.bonus_clue_id, shared: r.option.tag === "group" });
      }
    }
  }
  clampLuck(s);

  // 3. Sabotage, in slot order, independent of the roll. Every attempt is exposed, even a fizzle.
  const exposures: RecapLine[] = [];
  for (const r of results) {
    const sab = r.option.sabotage;
    if (!sab) continue;
    const targetId = sab.scope === "player" ? r.pick.targetId : null;
    if (sab.scope === "player") {
      const victim = results.find((x) => x.p.id === targetId);
      if (victim && victim.p.id !== r.p.id && victim.p.alive && victim.option.tag === "solo") {
        if (sab.effect === "steal_private_clue") {
          const c = victim.p.clues.pop();
          if (c && !r.p.clues.includes(c)) r.p.clues.push(c);
          if (c) note(victim.p.id, { type: "lost", what: "clue" });
        } else if (sab.effect === "steal_personal_item") {
          const i = victim.p.items.pop();
          if (i) r.p.items.push(i);
          if (i) note(victim.p.id, { type: "lost", what: "item" });
        } else {
          victim.p.luck -= 1;
        }
      }
    } else if (sab.effect === "destroy_party_clue") {
      s.partyClues.pop();
    } else if (sab.effect === "destroy_party_item") {
      s.partyItems.pop();
    } else {
      s.redHerrings += 1;
    }
    exposures.push({ kind: "sabotage", text: fill(r.option.exposure ?? "{player} turned on the group.", r.p.id, targetId), playerId: r.p.id });
  }
  clampLuck(s);

  // 4. Deaths: a failed risky option kills when it is lethal, luck was 0, or the stat gate is missed.
  const died = new Set<string>();
  for (const r of results) {
    if (r.option.risk !== "risky" || r.success) continue;
    const gate = r.option.lethal_if_stat_below;
    const lethal = r.option.lethal_on_fail || startLuck.get(r.p.id) === 0 || (gate != null && startStat.get(r.p.id)! < gate);
    if (!lethal) continue;
    r.p.alive = false;
    died.add(r.p.id);
    dropBelongings(s, r.p);
  }

  // Private results: what each player found or lost, plus the net luck change.
  for (const r of results) {
    const delta = r.p.luck - startLuck.get(r.p.id)!;
    if (delta !== 0 && r.p.alive) note(r.p.id, { type: "luck", up: delta > 0 });
  }
  s.results = Object.fromEntries(results.map((r) => [r.p.id, notes[r.p.id] ?? []]));

  // 5. Recap: each player's choice and outcome, then exposures, then deaths.
  const recap: RecapLine[] = [];
  for (const r of results) {
    const targetId = r.option.sabotage?.scope === "player" ? r.pick.targetId : null;
    recap.push({ kind: "choice", text: fill(r.option.recap, r.p.id, targetId), playerId: r.p.id });
    const dead = died.has(r.p.id);
    const narration = dead
      ? (r.option.on_death?.narration ?? "{player} is gone.")
      : (r.success ? r.option.on_success : r.option.on_failure).narration;
    recap.push({ kind: dead ? "death" : "outcome", text: fill(narration, r.p.id, targetId), playerId: r.p.id });
  }
  recap.push(...exposures);
  for (const id of died) recap.push({ kind: "death", text: `${name(id)} is gone.`, playerId: id });

  // 6. Branch: the next scene most picks lead to; ties → more successes → tie_break_order.
  const scene = sceneById(tree, prev.sceneId);
  if (s.round <= PIVOT_ROUND && results.filter((r) => r.option.follows_red_herring).length * 2 >= results.length) {
    s.redHerrings += 1;
  }
  const early = earlyEnding(s);
  const finalRound = !early && s.round === PIVOT_ROUND + 2;
  if (finalRound) {
    // Finale evidence by track, read out before the vote.
    const landed = results.some((r) => r.option.decisive && r.success);
    const f = tree.world.finale;
    s.evidence = s.track === "solved" && landed ? fill(f.proof) : s.track === "wrong" ? fill(f.frame) : null;
    if (s.evidence) recap.push({ kind: "evidence", text: s.evidence });
  }
  s.recap = recap;
  s.history.push({
    clock: tree.world.clock.values[prev.round - 1],
    intro: fillText(tree, prev, scene.intro),
    recap: recap.map(({ kind, text }) => ({ kind, text })),
  });

  if (early) {
    s.ending = early;
    return s;
  }
  if (finalRound) {
    s.voting = true;
    return s;
  }
  if (s.round < PIVOT_ROUND) {
    s.sceneId = nextScene(scene, results);
  } else if (s.round === PIVOT_ROUND) {
    s.track = pivotTrack(tree, s);
    s.sceneId = `r9_${s.track}`;
  } else {
    s.sceneId = `r10_${s.track}`;
  }
  s.round += 1;
  return s;
}

/** The scene most picks lead to. Ties: more successful picks, then the scene's tie_break_order. */
function nextScene(scene: Scene, results: { option: Option; success: boolean }[]): string {
  const score = new Map<string, [number, number]>();
  for (const r of results) {
    const [n, w] = score.get(r.option.leads_to!) ?? [0, 0];
    score.set(r.option.leads_to!, [n + 1, w + (r.success ? 1 : 0)]);
  }
  const rank = (id: string) => {
    const i = scene.tie_break_order.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return [...score.keys()].sort((a, b) => {
    const [an, aw] = score.get(a)!;
    const [bn, bw] = score.get(b)!;
    return bn - an || bw - aw || rank(a) - rank(b);
  })[0];
}

/** The suspects a player may accuse: every suspect except their own character. Indexes into world.suspects. */
export function candidatesFor(tree: Tree, state: GameState, playerId: string): number[] {
  const p = playerById(state, playerId);
  return tree.world.suspects.map((_, i) => i).filter((i) => tree.world.suspects[i].id !== p.suspectId);
}

/** Server-side check of a vote. Returns a player-facing error, or null when it is legal. */
export function validateVote(tree: Tree, state: GameState, playerId: string, index: number): string | null {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return "You are not in this mystery.";
  if (!state.voting) return "The vote isn't open.";
  if (!p.alive) return "The dead don't vote.";
  if (!candidatesFor(tree, state, playerId).includes(index)) return "You can't accuse that person.";
  return null;
}

/** Counts the living players' votes: most votes on the killer = solved, on an innocent = wrong culprit, a tie = escape. */
export function resolveVote(tree: Tree, prev: GameState, votes: Record<string, number>): GameState {
  if (!prev.voting) throw new Error("The vote isn't open");
  const s = structuredClone(prev);
  const living = new Set(s.players.filter((p) => p.alive).map((p) => p.id));
  const cast = Object.fromEntries(Object.entries(votes).filter(([id]) => living.has(id)));
  const tally = new Map<number, number>();
  for (const i of Object.values(cast)) tally.set(i, (tally.get(i) ?? 0) + 1);
  const top = Math.max(0, ...tally.values());
  const leaders = [...tally.keys()].filter((i) => tally.get(i) === top);
  const accused = leaders.length === 1 ? leaders[0] : null;
  const killer = tree.world.suspects.findIndex((x) => x.id === tree.world.killer_id);
  s.ending = { key: accused == null ? "culprit_escapes" : accused === killer ? "solved" : "wrong_culprit", accused };
  s.votes = cast;
  s.voting = false;
  return s;
}

/** Personal result: the killer wins whenever the case is not solved; everyone else only when it is. */
export function playerWon(state: GameState, playerId: string): boolean {
  const solved = state.ending?.key === "solved";
  return playerId === state.killerPlayerId ? !solved : solved;
}
