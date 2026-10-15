// The game engine: a pure port of the skill's references/engine-rules.md.
// No I/O, no clock, randomness injected — so it is testable and the server is the only caller.
import type {
  Effect, Ending, GameState, Option, Pick, PlayerState, RecapLine, Rng, Scene, Slot, Tag, Tree, Variant,
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
    ending: null,
  };
}

const keyClueIds = (tree: Tree) => new Set(tree.world.clues.filter((c) => c.kind === "key").map((c) => c.id));

/** closer_to_mystery: distinct key clues the player knows (private + shared), capped. */
export function statOf(tree: Tree, state: GameState, p: PlayerState): number {
  const keys = keyClueIds(tree);
  return Math.min(new Set([...p.clues, ...state.partyClues].filter((id) => keys.has(id))).size, STAT_MAX);
}

const holds = (state: GameState, p: PlayerState, itemId: string) =>
  p.items.includes(itemId) || state.partyItems.includes(itemId);

function meets(tree: Tree, state: GameState, p: PlayerState, req: Variant["requires"]): boolean {
  if (req.items && !req.items.every((i) => holds(state, p, i))) return false;
  if (req.min_stat != null && statOf(tree, state, p) < req.min_stat) return false;
  if (req.role === "killer" && state.killerPlayerId !== p.id) return false;
  return true;
}

/** The four options this player sees: per slot, the first variant they qualify for, else the default. */
export function optionsFor(tree: Tree, state: GameState, playerId: string): Option[] {
  const p = playerById(state, playerId);
  const scene = sceneById(tree, state.sceneId);
  return scene.options.map(
    (def) => scene.variants.find((v) => v.slot === def.slot && meets(tree, state, p, v.requires))?.option ?? def,
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

function grantClue(state: GameState, actor: PlayerState, tag: Tag, clueId: string) {
  if (state.partyClues.includes(clueId)) return;
  if (tag === "group") {
    state.partyClues.push(clueId);
    for (const p of state.players) p.clues = p.clues.filter((c) => c !== clueId);
  } else if (!actor.clues.includes(clueId)) {
    actor.clues.push(clueId);
  }
}

function grantItem(tree: Tree, state: GameState, actor: PlayerState, tag: Tag, itemId: string) {
  const held = state.partyItems.includes(itemId) || state.players.some((p) => p.items.includes(itemId));
  if (held) return;
  (tag === "group" ? state.partyItems : actor.items).push(itemId);
  if (tree.world.items.find((i) => i.id === itemId)?.luck_on_grant === 1) actor.luck += 1;
}

function applyEffect(tree: Tree, state: GameState, actor: PlayerState, tag: Tag, effect: Effect) {
  switch (effect.type) {
    case "grant_clue":
      return grantClue(state, actor, tag, effect.clue_id);
    case "grant_item":
      return grantItem(tree, state, actor, tag, effect.item_id);
    case "luck":
      actor.luck += effect.delta;
      return;
    case "share_private_clues":
      for (const c of actor.clues) if (!state.partyClues.includes(c)) state.partyClues.push(c);
      actor.clues = [];
      return;
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

/** Fills the six placeholders the skill allows. Anything unresolved reads as "someone". */
export function fillText(tree: Tree, state: GameState, text: string, who: { player?: string; target?: string } = {}): string {
  const killer = tree.world.suspects.find((s) => s.id === tree.world.killer_id)?.name ?? "someone";
  const vars: Record<string, string> = {
    player: who.player ?? "someone",
    target: who.target ?? "someone",
    party: "the group",
    victim: tree.meta.victim.name,
    killer,
    survivors: joinNames(state.players.filter((p) => p.alive).map((p) => p.name)),
  };
  return text.replace(/\{(player|target|party|victim|killer|survivors)\}/g, (_, k: string) => vars[k]);
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

/** Early-out endings: everyone dead, or (suspects mode) only the killer left. */
function earlyEnding(state: GameState): Ending | null {
  const alive = state.players.filter((p) => p.alive);
  const killerAlone = state.killerPlayerId && state.players.length > 1 && alive.length === 1 && alive[0].id === state.killerPlayerId;
  if (alive.length > 0 && !killerAlone) return null;
  if (alive.length === 0 && state.track === "wrong") return { key: "wrong_culprit", downgraded: false };
  return { key: "culprit_escapes", downgraded: state.track === "solved" };
}

/**
 * Resolves one round from every alive player's lock-in. Returns the next state; the input is not mutated.
 * Order follows engine-rules §3: roll → effects → sabotage (slot order) → deaths → branch → recap.
 */
export function resolveRound(tree: Tree, prev: GameState, picks: Pick[], rng: Rng): GameState {
  if (prev.ending) throw new Error("The mystery is already over");
  const s = structuredClone(prev);
  const name = (id: string | null | undefined) => (id ? s.players.find((p) => p.id === id)?.name : undefined);
  const fill = (text: string, actorId?: string, targetId?: string | null) =>
    fillText(tree, s, text, { player: name(actorId), target: name(targetId) });

  const startLuck = new Map(s.players.map((p) => [p.id, p.luck]));
  const startStat = new Map(s.players.map((p) => [p.id, statOf(tree, s, p)]));

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
    for (const e of block.effects) applyEffect(tree, s, r.p, r.option.tag, e);
    if (r.success && r.option.tag === "group") r.p.luck += 1;
    if (r.success && r.die === 6) {
      r.p.luck += 1;
      if (r.option.bonus_clue_id) grantClue(s, r.p, r.option.tag, r.option.bonus_clue_id);
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
        } else if (sab.effect === "steal_personal_item") {
          const i = victim.p.items.pop();
          if (i) r.p.items.push(i);
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
  s.recap = recap;

  // 6. Branch: plurality slot among this round's picks; ties → more successes → tie_break_order.
  const scene = sceneById(tree, prev.sceneId);
  const bySlot = new Map<Slot, typeof results>();
  for (const r of results) bySlot.set(r.option.slot, [...(bySlot.get(r.option.slot) ?? []), r]);
  let best: Slot | null = null;
  const score = (slot: Slot) => {
    const list = bySlot.get(slot) ?? [];
    return [list.length, list.filter((r) => r.success).length] as const;
  };
  for (const slot of scene.tie_break_order) {
    if (!bySlot.has(slot)) continue;
    if (best === null) { best = slot; continue; }
    const [n, w] = score(slot);
    const [bn, bw] = score(best);
    if (n > bn || (n === bn && w > bw)) best = slot;
  }
  const chosen = bySlot.get(best!)!;
  const tally = new Map<string, number>();
  for (const r of chosen) tally.set(r.option.id, (tally.get(r.option.id) ?? 0) + 1);
  const defaultOpt = scene.options.find((o) => o.slot === best)!;
  const top = Math.max(...tally.values());
  const representative = (tally.get(defaultOpt.id) === top ? defaultOpt : chosen.find((r) => tally.get(r.option.id) === top)!.option);
  if (s.round <= PIVOT_ROUND && representative.follows_red_herring) s.redHerrings += 1;

  const early = earlyEnding(s);
  if (early) {
    s.ending = early;
    return s;
  }

  if (s.round < PIVOT_ROUND) {
    s.sceneId = representative.leads_to!;
  } else if (s.round === PIVOT_ROUND) {
    s.track = pivotTrack(tree, s);
    s.sceneId = `r9_${s.track}`;
  } else if (s.round === PIVOT_ROUND + 1) {
    s.sceneId = `r10_${s.track}`;
  } else {
    const landed = results.some((r) => r.option.decisive && r.success);
    s.ending =
      s.track === "solved"
        ? landed ? { key: "solved", downgraded: false } : { key: "culprit_escapes", downgraded: true }
        : s.track === "wrong"
          ? { key: "wrong_culprit", downgraded: false }
          : { key: "culprit_escapes", downgraded: false };
    return s;
  }
  s.round += 1;
  return s;
}

/** Personal result: the killer wins whenever the case is not solved; everyone else only when it is. */
export function playerWon(state: GameState, playerId: string): boolean {
  const solved = state.ending?.key === "solved";
  return playerId === state.killerPlayerId ? !solved : solved;
}
