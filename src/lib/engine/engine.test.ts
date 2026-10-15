import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GameState, Pick, Rng, Slot, Tree } from "./types.ts";
import { candidatesFor, optionsFor, playerWon, resolveRound, resolveVote, startGame, statOf, validatePick, validateVote } from "./engine.ts";
import { hostView, playerView } from "./view.ts";

const here = dirname(fileURLToPath(import.meta.url));
const load = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Tree;
const suspects2p = load(join(here, "fixtures/skeleton-2p-suspects.json"));
const investigators4p = load(join(here, "fixtures/skeleton-4p-investigators.json"));

/** RNG that yields the given die faces in order (each face maps into its sixth of [0,1)). */
const dice = (...faces: number[]): Rng => {
  let i = 0;
  return () => (faces[i++ % faces.length] - 1) / 6 + 0.01;
};
const PLAYERS2 = [{ id: "p1", name: "Ana" }, { id: "p2", name: "Ben" }];

/** Starts a 2p suspects game with p1 seated as slot 1 (innocent) and p2 as slot 2 (killer s2). */
function start2p(): GameState {
  // shuffle of 2 with rng face 6 → j = 1 → order unchanged
  return startGame(suspects2p, PLAYERS2, dice(6));
}

const pick = (state: GameState, tree: Tree, playerId: string, slot: Slot, extra: Partial<Pick> = {}): Pick => ({
  playerId,
  optionId: optionsFor(tree, state, playerId).find((o) => o.slot === slot)!.id,
  pushed: false,
  targetId: null,
  ...extra,
});

test("startGame seats suspects and marks the killer", () => {
  const s = start2p();
  assert.deepEqual(s.players.map((p) => [p.id, p.suspectId, p.luck, p.alive]), [["p1", "s1", 3, true], ["p2", "s2", 3, true]]);
  assert.equal(s.killerPlayerId, "p2");
  assert.equal(s.sceneId, "r1_a");
  assert.throws(() => startGame(suspects2p, [PLAYERS2[0]], dice(1)));
});

test("investigators mode has no killer player and seats by join order", () => {
  const players = ["a", "b", "c", "d"].map((id) => ({ id, name: id }));
  const s = startGame(investigators4p, players, dice(3));
  assert.equal(s.killerPlayerId, null);
  assert.deepEqual(s.players.map((p) => [p.slot, p.suspectId]), [[1, null], [2, null], [3, null], [4, null]]);
});

test("rolls: threshold, natural 1, push, group bonus, shared vs private grants", () => {
  const s = start2p();
  // p1: A (group easy, grants k1) with die 2 → 2+3 = 5 ≥ 5 success. p2: D (solo medium) die 1 → fail, -1 luck.
  const next = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "A"), pick(s, suspects2p, "p2", "D")], dice(2, 1));
  const [a, b] = next.players;
  assert.equal(a.luck, 4, "group success +1");
  assert.equal(b.luck, 2, "natural 1 costs a luck");
  assert.deepEqual(next.partyClues, ["k1"], "group grant is shared");
  assert.equal(statOf(suspects2p, next, b), 1, "shared key clue counts for everyone");
  assert.equal(next.round, 2);

  // pushed medium roll: die 3 + luck 3 + 2 = 8 ≥ 7 → success; push -1, the option's luck effect +1, group +1 → 4.
  const s2 = start2p();
  const r = resolveRound(suspects2p, s2, [pick(s2, suspects2p, "p1", "C", { pushed: true }), pick(s2, suspects2p, "p2", "B")], dice(3, 4));
  assert.equal(r.players[0].luck, 4);
});

test("each character sees their own four options, and the story names characters, not players", () => {
  const s = start2p();
  const own = (id: string) => optionsFor(suspects2p, s, id).map((o) => o.id);
  assert.deepEqual(own("p1"), ["r1_a_p1_A", "r1_a_p1_B", "r1_a_p1_C", "r1_a_p1_D"]);
  assert.deepEqual(own("p2"), ["r1_a_p2_A", "r1_a_p2_B", "r1_a_p2_C", "r1_a_p2_D"]);
  const named: Tree = structuredClone(suspects2p);
  named.world.suspects[0].name = "Rafe";
  named.world.suspects[1].name = "Tara";
  const next = resolveRound(named, s, [pick(s, named, "p1", "A"), pick(s, named, "p2", "B")], dice(4, 4));
  assert.ok(next.recap.every((l) => !l.text.includes("Ana") && !l.text.includes("Ben")), "player names leaked into narration");
  assert.ok(next.recap[0].text.startsWith("Rafe "));
});

test("results, history and the red-herring half rule", () => {
  const s = atScene("r2_a", 2);
  // p1 A (group, grants k2) succeeds; p2 D (follows a red herring, grants h1) succeeds → half the picks follow it.
  const next = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "A"), pick(s, suspects2p, "p2", "D")], dice(4, 6));
  assert.deepEqual(next.results.p1, [{ type: "found_clue", clueId: "k2", shared: true }, { type: "luck", up: true }]);
  assert.equal(next.results.p2[0].type, "found_clue");
  assert.equal(next.redHerrings, 1, "one of two picks followed a red herring: half counts");
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].recap.length, next.recap.length);
  // nothing happened → an empty result list (the phone says "Nothing came of it")
  const dull = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "D"), pick(s, suspects2p, "p2", "D")], dice(2, 3));
  assert.deepEqual(dull.results.p1, []);
});

test("natural 6 success adds luck, clamped to 5", () => {
  let s = start2p();
  s = { ...s, players: s.players.map((p) => ({ ...p, luck: 5 })) };
  const next = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "B"), pick(s, suspects2p, "p2", "B")], dice(6, 6));
  assert.deepEqual(next.players.map((p) => p.luck), [5, 5]);
});

test("plurality ties break on successes, then tie_break_order", () => {
  const s = start2p();
  // A fails (die 1), C succeeds (die 6): tie 1-1 on count, C has more successes → r2_b
  const a = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "A"), pick(s, suspects2p, "p2", "C")], dice(1, 6));
  assert.equal(a.sceneId, "r2_b");
  // both succeed: tie → tie_break_order puts A first → r2_a
  const b = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "A"), pick(s, suspects2p, "p2", "C")], dice(6, 6));
  assert.equal(b.sceneId, "r2_a");
});

function atScene(sceneId: string, round: number, patch: Partial<GameState> = {}): GameState {
  return { ...start2p(), sceneId, round, ...patch };
}

test("player sabotage fizzles unless the target also went solo, and is always exposed", () => {
  const base = atScene("r4_a", 4);
  base.players[0].clues = ["h1"];
  // p2 steals from p1 (r4_a B = steal_private_clue). p1 picked A (group) → fizzle.
  const fizzle = resolveRound(suspects2p, base, [pick(base, suspects2p, "p1", "A"), pick(base, suspects2p, "p2", "B", { targetId: "p1" })], dice(3, 3));
  assert.deepEqual(fizzle.players[0].clues, ["h1"]);
  assert.ok(fizzle.recap.some((l) => l.kind === "sabotage"));
  // p1 picked D (solo) → steal lands.
  const steal = resolveRound(suspects2p, base, [pick(base, suspects2p, "p1", "D"), pick(base, suspects2p, "p2", "B", { targetId: "p1" })], dice(1, 3));
  assert.deepEqual(steal.players[0].clues, []);
  assert.ok(steal.players[1].clues.includes("h1"));
});

test("a failed lethal risky option kills and drops belongings to the party", () => {
  const s = atScene("r7_a", 7);
  s.players[0].clues = ["k3"];
  s.players[0].items = ["lucky_item"];
  const next = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "D"), pick(s, suspects2p, "p2", "A")], dice(2, 6));
  assert.equal(next.players[0].alive, false);
  assert.ok(next.partyClues.includes("k3"));
  assert.ok(next.partyItems.includes("lucky_item"));
  assert.ok(next.recap.some((l) => l.kind === "death"));
  // only the killer is left alive → culprit escapes immediately, no vote
  assert.deepEqual(next.ending, { key: "culprit_escapes", accused: null });
  assert.equal(next.voting, false);
});

test("pivot at round 8 locks solved / wrong / escape", () => {
  const solved = atScene("r8_a", 8, { partyClues: ["k1", "k2", "k3"], partyItems: ["decisive_item"] });
  const p = (st: GameState) => [pick(st, suspects2p, "p1", "A"), pick(st, suspects2p, "p2", "A")];
  assert.equal(resolveRound(suspects2p, solved, p(solved), dice(3)).sceneId, "r9_solved");
  const wrong = atScene("r8_a", 8, { redHerrings: 2 });
  assert.equal(resolveRound(suspects2p, wrong, p(wrong), dice(3)).sceneId, "r9_wrong");
  const escape = atScene("r8_a", 8);
  const e = resolveRound(suspects2p, escape, p(escape), dice(3));
  assert.equal(e.sceneId, "r9_escape");
  assert.equal(e.round, 9);
});

test("round 10: the track decides the evidence, then the vote opens", () => {
  const s = atScene("r10_solved", 10, { track: "solved", partyClues: ["k1", "k2", "k3"], partyItems: ["decisive_item"] });
  const opts = optionsFor(suspects2p, s, "p1");
  assert.ok(opts.find((o) => o.slot === "A")!.decisive, "gated decisive variant shows");
  const landed = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "A"), pick(s, suspects2p, "p2", "B")], dice(6, 3));
  assert.equal(landed.voting, true);
  assert.equal(landed.ending, null);
  assert.equal(landed.evidence, suspects2p.world.finale.proof);
  assert.equal(landed.recap.at(-1)!.kind, "evidence");
  const missed = resolveRound(suspects2p, s, [pick(s, suspects2p, "p1", "B"), pick(s, suspects2p, "p2", "B")], dice(3, 3));
  assert.equal(missed.evidence, null, "no decisive move, no proof");
  const wrong = atScene("r10_wrong", 10, { track: "wrong" });
  const framed = resolveRound(suspects2p, wrong, [pick(wrong, suspects2p, "p1", "B"), pick(wrong, suspects2p, "p2", "B")], dice(3, 3));
  assert.equal(framed.evidence, suspects2p.world.finale.frame);
  assert.throws(() => resolveRound(suspects2p, framed, [], dice(3)), /over/);
});

test("the vote: most votes on the killer solves, on an innocent is wrong, a tie lets them go", () => {
  const four = startGame(investigators4p, ["a", "b", "c", "d"].map((id) => ({ id, name: id })), dice(3));
  const open = { ...four, voting: true };
  const killer = investigators4p.world.suspects.findIndex((x) => x.id === investigators4p.world.killer_id);
  const innocent = killer === 0 ? 1 : 0;
  assert.deepEqual(resolveVote(investigators4p, open, { a: killer, b: killer, c: innocent, d: 2 }).ending, { key: "solved", accused: killer });
  assert.deepEqual(resolveVote(investigators4p, open, { a: innocent, b: innocent, c: killer, d: 2 }).ending, { key: "wrong_culprit", accused: innocent });
  assert.deepEqual(resolveVote(investigators4p, open, { a: killer, b: killer, c: innocent, d: innocent }).ending, { key: "culprit_escapes", accused: null });
  // the dead don't count
  const dead = { ...open, players: open.players.map((p) => (p.id === "d" ? { ...p, alive: false } : p)) };
  assert.equal(resolveVote(investigators4p, dead, { a: killer, b: innocent, c: killer, d: innocent }).ending!.key, "solved");
});

test("validateVote: living players only, never your own character", () => {
  const s = { ...start2p(), voting: true };
  assert.deepEqual(candidatesFor(suspects2p, s, "p1"), [1], "p1 is suspect 0 and can only accuse suspect 1");
  assert.equal(validateVote(suspects2p, s, "p1", 0), "You can't accuse that person.");
  assert.equal(validateVote(suspects2p, s, "p1", 1), null);
  assert.equal(validateVote(suspects2p, { ...s, voting: false }, "p1", 1), "The vote isn't open.");
  s.players[0].alive = false;
  assert.equal(validateVote(suspects2p, s, "p1", 1), "The dead don't vote.");
  const won = resolveVote(suspects2p, { ...start2p(), voting: true }, { p1: 1, p2: 0 });
  assert.equal(won.ending!.key, "culprit_escapes", "one vote each is a tie");
  assert.equal(playerWon(won, "p2"), true, "killer wins when the culprit escapes");
  assert.equal(playerWon(resolveVote(suspects2p, { ...start2p(), voting: true }, { p1: 1 }), "p1"), true);
});

test("validatePick rejects illegal lock-ins", () => {
  const s = atScene("r4_a", 4);
  assert.equal(validatePick(suspects2p, s, { playerId: "p2", slot: "B", pushed: false, targetId: null }), "Pick someone to turn on.");
  assert.equal(validatePick(suspects2p, s, { playerId: "p2", slot: "B", pushed: false, targetId: "p1" }), null);
  s.players[0].luck = 0;
  assert.equal(validatePick(suspects2p, s, { playerId: "p1", slot: "A", pushed: true, targetId: null }), "You have no luck left to push.");
  s.players[0].alive = false;
  assert.match(validatePick(suspects2p, s, { playerId: "p1", slot: "A", pushed: false, targetId: null }) ?? "", /dead/);
});

// ---- fuzz: random full games on every fixture and every shipped mystery

function seeded(seed: number): Rng {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function assertNoLeaks(tree: Tree, state: GameState, json: string, viewer: string | null) {
  assert.ok(!json.includes("points_to") && !json.includes("killer_id") && !json.includes(tree.world.killer_method), "secret fields leaked");
  assert.ok(!/"r\d+_[a-z]+"/.test(json), "scene/option id leaked");
  const viewerClues = state.players.find((p) => p.id === viewer)?.clues ?? [];
  for (const p of state.players) {
    if (p.id === viewer) continue;
    for (const id of p.clues) {
      if (viewerClues.includes(id)) continue; // both found it on their own
      const text = tree.world.clues.find((c) => c.id === id)!.text;
      if (!state.partyClues.some((pc) => tree.world.clues.find((c) => c.id === pc)!.text === text)) {
        assert.ok(!json.includes(JSON.stringify(text)), `private clue of ${p.id} leaked to ${viewer ?? "host"}`);
      }
    }
  }
  if (viewer !== state.killerPlayerId) assert.ok(!json.includes('"killer":true'), "killer identity leaked");
  for (const p of state.players) {
    const secret = tree.world.suspects.find((x) => x.id === p.suspectId)?.secret;
    if (secret && p.id !== viewer) assert.ok(!json.includes(JSON.stringify(secret)), `secret of ${p.id} leaked to ${viewer ?? "host"}`);
  }
  assert.ok(!/"(found_clue|found_item|clueId|itemId)"/.test(json), "raw result leaked");
}

function playRandom(tree: Tree, seed: number) {
  const rng = seeded(seed);
  const players = Array.from({ length: tree.meta.player_count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
  let state = startGame(tree, players, rng);
  for (let guard = 0; guard < 12 && !state.ending && !state.voting; guard++) {
    const picks: Pick[] = [];
    for (const p of state.players.filter((x) => x.alive)) {
      const opts = optionsFor(tree, state, p.id);
      const o = opts[Math.floor(rng() * opts.length)];
      const others = state.players.filter((x) => x.alive && x.id !== p.id);
      const targetId = o.sabotage?.scope === "player" ? (others[Math.floor(rng() * others.length)]?.id ?? null) : null;
      const pushed = p.luck > 0 && rng() < 0.3;
      if (o.sabotage?.scope === "player" && !targetId) continue; // lone survivor can't target; skip that slot
      assert.equal(validatePick(tree, state, { playerId: p.id, slot: o.slot, pushed, targetId }), null);
      picks.push({ playerId: p.id, optionId: o.id, pushed, targetId });
    }
    if (picks.length === 0) {
      // every alive player could only sabotage with no target: pick their first non-sabotage option
      const p = state.players.find((x) => x.alive)!;
      const o = optionsFor(tree, state, p.id).find((x) => !x.sabotage)!;
      picks.push({ playerId: p.id, optionId: o.id, pushed: false, targetId: null });
    }
    const locked = new Set(picks.map((k) => k.playerId));
    const input = { tree, slug: "t", code: "ABCDEFGH", status: "playing" as const, phase: "choosing" as const, state, roster: [], locked };
    assertNoLeaks(tree, state, JSON.stringify(hostView(input)), null);
    for (const p of state.players) assertNoLeaks(tree, state, JSON.stringify(playerView(input, { id: p.id, name: p.name }, null)), p.id);
    state = resolveRound(tree, state, picks, rng);
    for (const p of state.players) {
      assert.ok(p.luck >= 0 && p.luck <= 5);
      assert.ok(statOf(tree, state, p) <= 5);
    }
  }
  if (state.voting) {
    const votes: Record<string, number> = {};
    for (const p of state.players.filter((x) => x.alive)) {
      const choices = candidatesFor(tree, state, p.id);
      votes[p.id] = choices[Math.floor(rng() * choices.length)];
      assert.equal(validateVote(tree, state, p.id, votes[p.id]), null);
    }
    const input = { tree, slug: "t", code: "ABCDEFGH", status: "playing" as const, phase: "voting" as const, state, roster: [], locked: new Set<string>() };
    assertNoLeaks(tree, state, JSON.stringify(hostView(input)), null);
    for (const p of state.players) {
      const pv = playerView(input, { id: p.id, name: p.name }, null);
      assertNoLeaks(tree, state, JSON.stringify(pv), p.id);
      assert.equal(!!pv.ballot, p.alive, "only the living get a ballot");
    }
    state = resolveVote(tree, state, votes);
  }
  assert.ok(state.ending, "game must end within 10 rounds and a vote");
  const end = { tree, slug: "t", code: "ABCDEFGH", status: "ended" as const, phase: "finale" as const, state, roster: [], locked: new Set<string>() };
  const v = hostView(end);
  assert.ok(v.ending && v.ending.title && v.ending.epilogue);
  assert.ok(!/\{(player|target|party|victim|killer|survivors|accused)\}/.test(JSON.stringify(v)), "unfilled placeholder");
  assert.equal(v.history.length, state.history.length);
  return state.ending!.key;
}

const mysteriesDir = join(here, "../../mysteries");
const shipped = (() => {
  try {
    return readdirSync(mysteriesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => [d.name, load(join(mysteriesDir, d.name, "tree.json"))] as const);
  } catch {
    return [];
  }
})();

for (const [name, tree] of [["skeleton-2p-suspects", suspects2p], ["skeleton-4p-investigators", investigators4p], ...shipped] as const) {
  test(`fuzz: 500 random games on ${name} always end cleanly with no leaks`, () => {
    const endings = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) endings.add(playRandom(tree, seed));
    assert.ok(endings.size >= 2, `expected varied endings, got ${[...endings]}`);
  });
}
