import "server-only";
import { ApiError } from "@/lib/api";
import { adminClient } from "@/lib/supabase/admin";
import { optionsFor, resolveRound, resolveVote, startGame, validatePick, validateVote } from "@/lib/engine/engine";
import type { GameState, Pick, Slot } from "@/lib/engine/types";
import { hostView, playerView, type HostView, type PlayerView, type RoomPhase, type RoomStatus, type ViewInput } from "@/lib/engine/view";
import { fill, lexiconFor } from "@/mysteries/catalog";
import { getMystery, type Mystery } from "@/mysteries";

// The server-authoritative game loop. Every mutation: authorize by user id → conditional update
// (so racing requests can't double-apply) → ring the Realtime doorbell. Clients then refetch their view.

type RoomRow = {
  id: string;
  code: string;
  mystery_slug: string;
  host_id: string;
  status: RoomStatus;
  phase: RoomPhase;
  round: number;
  state: GameState | null;
};
type PlayerRow = { id: string; user_id: string; name: string; seat: number };
type PickRow = { player_id: string; option_id: string; pushed: boolean; target_player_id: string | null };
type VoteRow = { player_id: string; suspect_index: number };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: read off a TV across a room
const UNIQUE_VIOLATION = "23505";

const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(raw: string): string {
  const code = raw.toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new ApiError("No mystery with that code.", 404);
  return code;
}

function mysteryOf(room: RoomRow): Mystery {
  const m = getMystery(room.mystery_slug);
  if (!m) throw new ApiError("That case file is gone.", 404); // a story removed from the repo
  return m;
}

async function load(code: string): Promise<{ room: RoomRow; players: PlayerRow[] }> {
  const db = adminClient();
  const { data: room, error } = await db
    .from("rooms")
    .select("id, code, mystery_slug, host_id, status, phase, round, state")
    .eq("code", code)
    .maybeSingle<RoomRow>();
  if (error) throw error;
  if (!room) throw new ApiError("No mystery with that code.", 404);
  const { data: players, error: pErr } = await db
    .from("players")
    .select("id, user_id, name, seat")
    .eq("room_id", room.id)
    .order("seat")
    .returns<PlayerRow[]>();
  if (pErr) throw pErr;
  return { room, players: players ?? [] };
}

async function roundPicks(room: RoomRow): Promise<PickRow[]> {
  const { data, error } = await adminClient()
    .from("picks")
    .select("player_id, option_id, pushed, target_player_id")
    .eq("room_id", room.id)
    .eq("round", room.round)
    .returns<PickRow[]>();
  if (error) throw error;
  return data ?? [];
}

async function roomVotes(room: RoomRow): Promise<VoteRow[]> {
  const { data, error } = await adminClient()
    .from("votes")
    .select("player_id, suspect_index")
    .eq("room_id", room.id)
    .returns<VoteRow[]>();
  if (error) throw error;
  return data ?? [];
}

/**
 * Doorbell only: an empty broadcast on the private `room:<CODE>` channel, sent over HTTP with the
 * secret key. Nothing secret can ride it; a failed ping just means clients refetch on reconnect.
 */
async function ring(code: string) {
  const db = adminClient();
  const channel = db.channel(`room:${code}`, { config: { private: true } });
  try {
    const res = await channel.httpSend("state", {});
    if (!res.success) console.error("Realtime broadcast failed", res.status, res.error);
  } catch (error) {
    console.error("Realtime broadcast failed", error);
  } finally {
    await db.removeChannel(channel);
  }
}

function requireHost(room: RoomRow, userId: string) {
  if (room.host_id !== userId) throw new ApiError("Only the host screen can do that.", 403);
}

// ---------------------------------------------------------------- reads

export async function preview(rawCode: string) {
  const { room, players } = await load(normalizeCode(rawCode));
  const { tree } = mysteryOf(room);
  return {
    title: tree.meta.title,
    difficulty: tree.meta.difficulty,
    playerCount: tree.meta.player_count,
    seatsLeft: Math.max(0, tree.meta.player_count - players.length),
    status: room.status,
    slug: room.mystery_slug,
  };
}

export async function viewFor(rawCode: string, userId: string | null): Promise<HostView | PlayerView> {
  if (!userId) throw new ApiError("You're not in this mystery.", 401);
  const { room, players } = await load(normalizeCode(rawCode));
  const { tree } = mysteryOf(room);
  const voting = room.status === "playing" && room.phase === "voting";
  const picks = room.status === "playing" && !voting ? await roundPicks(room) : [];
  const votes = voting ? await roomVotes(room) : [];
  const input: ViewInput = {
    tree,
    slug: room.mystery_slug,
    code: room.code,
    status: room.status,
    phase: room.phase,
    state: room.state,
    roster: players.map((p) => ({ id: p.id, name: p.name })),
    locked: new Set((voting ? votes : picks).map((p) => p.player_id)),
  };
  if (room.host_id === userId) return hostView(input);
  const me = players.find((p) => p.user_id === userId);
  if (!me) throw new ApiError("You're not in this mystery.", 403);
  const mine = picks.find((p) => p.player_id === me.id);
  const slot = mine && room.state ? optionsFor(tree, room.state, me.id).find((o) => o.id === mine.option_id)?.slot : undefined;
  const myVote = votes.find((v) => v.player_id === me.id)?.suspect_index ?? null;
  return playerView(input, { id: me.id, name: me.name }, slot ? { slot } : null, myVote);
}

// ---------------------------------------------------------------- mutations

export async function createRoom(userId: string, slug: string): Promise<{ code: string }> {
  if (!getMystery(slug)) throw new ApiError("That case file doesn't exist.", 404);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { error } = await adminClient().from("rooms").insert({ code, mystery_slug: slug, host_id: userId });
    if (!error) return { code };
    if (error.code !== UNIQUE_VIOLATION) throw error;
  }
  throw new Error("Could not find a free room code");
}

export async function joinRoom(rawCode: string, userId: string, rawName: string): Promise<{ code: string }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name || name.length > 24) throw new ApiError("Give yourself a name, 24 characters at most.", 400);
  const { room, players } = await load(normalizeCode(rawCode));
  const db = adminClient();

  const existing = players.find((p) => p.user_id === userId);
  if (existing) return { code: room.code }; // rejoin: same seat, same name
  if (room.host_id === userId) throw new ApiError("This screen is hosting. Join from your phone.", 409);
  const words = lexiconFor(room.mystery_slug).join;
  if (room.status !== "lobby") throw new ApiError(words.started, 409);
  const capacity = mysteryOf(room).tree.meta.player_count;
  if (players.length >= capacity) throw new ApiError(words.full, 409);
  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(words.nameTaken, 409);
  }

  const taken = new Set(players.map((p) => p.seat));
  const seat = Array.from({ length: capacity }, (_, i) => i + 1).find((s) => !taken.has(s))!;
  const { error } = await db.from("players").insert({ room_id: room.id, user_id: userId, name, seat });
  if (error?.code === UNIQUE_VIOLATION) throw new ApiError("Someone took that place or name a moment ago. Try again.", 409);
  if (error) throw error;
  await ring(room.code);
  return { code: room.code };
}

export async function startRoom(rawCode: string, userId: string) {
  const { room, players } = await load(normalizeCode(rawCode));
  requireHost(room, userId);
  if (room.status !== "lobby") return { code: room.code };
  const { tree } = mysteryOf(room);
  const missing = tree.meta.player_count - players.length;
  if (missing > 0) throw new ApiError(`${fill(lexiconFor(room.mystery_slug).lobby.waiting, { n: missing })}.`, 409);

  const state = startGame(tree, players.map((p) => ({ id: p.id, name: p.name })), rng);
  const { error } = await adminClient()
    .from("rooms")
    .update({ status: "playing", phase: "narrating", round: state.round, state })
    .eq("id", room.id)
    .eq("status", "lobby");
  if (error) throw error;
  await ring(room.code);
  return { code: room.code };
}

/** Narration finished: open the round for choices, the vote (after round 10), or (story over) the ending. */
export async function advance(rawCode: string, userId: string) {
  const { room } = await load(normalizeCode(rawCode));
  requireHost(room, userId);
  if (room.phase !== "narrating") return { phase: room.phase }; // a double call is harmless
  const phase: RoomPhase = room.status === "ended" ? "finale" : room.state?.voting ? "voting" : "choosing";
  const { error } = await adminClient()
    .from("rooms")
    .update({ phase })
    .eq("id", room.id)
    .eq("phase", "narrating")
    .eq("round", room.round);
  if (error) throw error;
  await ring(room.code);
  return { phase };
}

export async function lockIn(
  rawCode: string,
  userId: string,
  body: { slot: Slot; pushed: boolean; targetId: string | null },
) {
  const { room, players } = await load(normalizeCode(rawCode));
  const me = players.find((p) => p.user_id === userId);
  if (!me) throw new ApiError("You're not in this mystery.", 403);
  if (room.status !== "playing" || room.phase !== "choosing" || !room.state) {
    throw new ApiError("Not yet. Eyes on the screen.", 409);
  }
  const { tree } = mysteryOf(room);
  const problem = validatePick(tree, room.state, { playerId: me.id, ...body });
  if (problem) throw new ApiError(problem, 400);
  const option = optionsFor(tree, room.state, me.id).find((o) => o.slot === body.slot)!;

  const { error } = await adminClient().from("picks").insert({
    room_id: room.id,
    round: room.round,
    player_id: me.id,
    option_id: option.id,
    pushed: body.pushed,
    target_player_id: option.sabotage?.scope === "player" ? body.targetId : null,
  });
  if (error?.code === UNIQUE_VIOLATION) throw new ApiError("You've already locked in.", 409);
  if (error) throw error;

  await ring(room.code);
  await resolveIfComplete(room);
  return { locked: true };
}

/** When every alive player has locked in, exactly one request claims the round and resolves it. */
async function resolveIfComplete(room: RoomRow) {
  const state = room.state!;
  const picks = await roundPicks(room);
  const alive = state.players.filter((p) => p.alive).length;
  if (picks.length < alive) return;

  const db = adminClient();
  const { data: claimed, error } = await db
    .from("rooms")
    .update({ phase: "resolving" })
    .eq("id", room.id)
    .eq("round", room.round)
    .eq("phase", "choosing")
    .select("id");
  if (error) throw error;
  if (!claimed?.length) return; // another request won the race

  try {
    const { tree } = mysteryOf(room);
    const next = resolveRound(
      tree,
      state,
      picks.map<Pick>((p) => ({ playerId: p.player_id, optionId: p.option_id, pushed: p.pushed, targetId: p.target_player_id })),
      rng,
    );
    const { error: saveErr } = await db
      .from("rooms")
      .update({ state: next, round: next.round, phase: "narrating", status: next.ending ? "ended" : "playing" })
      .eq("id", room.id)
      .eq("phase", "resolving");
    if (saveErr) throw saveErr;
  } catch (e) {
    await db.from("rooms").update({ phase: "choosing" }).eq("id", room.id).eq("phase", "resolving");
    throw e;
  }
  await ring(room.code);
}

export async function castVote(rawCode: string, userId: string, body: { index: number }) {
  const { room, players } = await load(normalizeCode(rawCode));
  const me = players.find((p) => p.user_id === userId);
  if (!me) throw new ApiError("You're not in this mystery.", 403);
  if (room.status !== "playing" || room.phase !== "voting" || !room.state) {
    throw new ApiError("The vote isn't open.", 409);
  }
  const { tree } = mysteryOf(room);
  const problem = validateVote(tree, room.state, me.id, body.index);
  if (problem) throw new ApiError(problem, 400);

  const { error } = await adminClient().from("votes").insert({ room_id: room.id, player_id: me.id, suspect_index: body.index });
  if (error?.code === UNIQUE_VIOLATION) throw new ApiError("You've already voted.", 409);
  if (error) throw error;

  await ring(room.code);
  await countIfComplete(room);
  return { voted: true };
}

/** When every living player has voted, exactly one request claims the count and ends the story. */
async function countIfComplete(room: RoomRow) {
  const state = room.state!;
  const votes = await roomVotes(room);
  const living = state.players.filter((p) => p.alive);
  if (!living.every((p) => votes.some((v) => v.player_id === p.id))) return;

  const { tree } = mysteryOf(room);
  const next = resolveVote(tree, state, Object.fromEntries(votes.map((v) => [v.player_id, v.suspect_index])));
  const { data: claimed, error } = await adminClient()
    .from("rooms")
    .update({ state: next, status: "ended", phase: "finale" })
    .eq("id", room.id)
    .eq("phase", "voting")
    .select("id");
  if (error) throw error;
  if (claimed?.length) await ring(room.code); // another request may have counted first
}
