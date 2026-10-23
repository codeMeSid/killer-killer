import "server-only";
import { ApiError } from "@/lib/api";
import { adminClient } from "@/lib/supabase/admin";
import { judge, validateGuess } from "@/lib/case/judge";
import { score } from "@/lib/case/score";
import { lexiconFor } from "@/mysteries/catalog";
import { getCase, getSolution } from "@/mysteries";
import type { CaseFile, Solution } from "@/mysteries/types";

// Co-op case file. Every mutation: authorize by user id → conditional write (racing requests can't
// double-apply) → ring the Realtime doorbell. Clients then refetch their view.

type RoomStatus = "playing" | "solved" | "defeated";
type RoomRow = {
  id: string;
  code: string;
  case_slug: string;
  team: string;
  host_id: string;
  status: RoomStatus;
  guesses_used: 0 | 1 | 2;
  started_at: string;
  ended_at: string | null;
};
const ROOM_COLS = "id, code, case_slug, team, host_id, status, guesses_used, started_at, ended_at";

export type RoomView = {
  code: string;
  slug: string;
  team: string;
  isHost: boolean;
  me: number;
  agents: number[];
  pins: { itemId: string; agent: number }[];
  status: RoomStatus;
  guessesUsed: 0 | 1 | 2;
  lastWrong: boolean;
  startedAt: string;
  endedAt: string | null;
  case: CaseFile;
  ending: null | { solution: Solution; seconds: number; rank: number | null };
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: read off a screen across a room
const UNIQUE_VIOLATION = "23505";
const MAX_AGENTS = 8;

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(raw: string): string {
  const code = raw.toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new ApiError("No case with that code.", 404);
  return code;
}

function caseOf(room: RoomRow): CaseFile {
  const c = getCase(room.case_slug);
  if (!c) throw new ApiError("That case file is gone.", 404); // removed from the repo
  return c;
}

async function load(code: string): Promise<RoomRow> {
  const { data, error } = await adminClient().from("rooms").select(ROOM_COLS).eq("code", code).maybeSingle<RoomRow>();
  if (error) throw error;
  if (!data) throw new ApiError("No case with that code.", 404);
  return data;
}

async function agentOf(room: RoomRow, userId: string): Promise<number> {
  const { data, error } = await adminClient()
    .from("members")
    .select("agent")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle<{ agent: number }>();
  if (error) throw error;
  if (!data) throw new ApiError("You're not on this case.", 403);
  return data.agent;
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

export async function createRoom(userId: string, slug: string, rawTeam: unknown): Promise<{ code: string }> {
  if (!getCase(slug)) throw new ApiError("That case file doesn't exist.", 404);
  const team = typeof rawTeam === "string" ? rawTeam.trim().replace(/\s+/g, " ") : "";
  if (!team || team.length > 24) throw new ApiError("Name your team, 24 characters at most.", 400);
  const db = adminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { data, error } = await db
      .from("rooms")
      .insert({ code, case_slug: slug, team, host_id: userId })
      .select("id")
      .single<{ id: string }>();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) continue;
      throw error;
    }
    const { error: mErr } = await db.from("members").insert({ room_id: data.id, user_id: userId, agent: 1 });
    if (mErr) throw mErr;
    return { code };
  }
  throw new Error("Could not find a free room code");
}

export async function preview(rawCode: string) {
  const room = await load(normalizeCode(rawCode));
  const c = caseOf(room);
  return { title: c.title, difficulty: c.difficulty, team: room.team, status: room.status, slug: room.case_slug };
}

/** Idempotent: a rejoin keeps its agent number. Next free number, up to eight. */
export async function joinRoom(rawCode: string, userId: string): Promise<{ code: string }> {
  const room = await load(normalizeCode(rawCode));
  caseOf(room);
  const db = adminClient();
  const { data: rows, error } = await db
    .from("members")
    .select("user_id, agent")
    .eq("room_id", room.id)
    .returns<{ user_id: string; agent: number }[]>();
  if (error) throw error;
  const members = rows ?? [];
  if (members.some((m) => m.user_id === userId)) return { code: room.code };
  if (room.status !== "playing") throw new ApiError("That case is closed.", 409);
  if (members.length >= MAX_AGENTS) throw new ApiError(lexiconFor(room.case_slug).full, 409);

  const taken = new Set(members.map((m) => m.agent));
  const agent = Array.from({ length: MAX_AGENTS }, (_, i) => i + 1).find((a) => !taken.has(a))!;
  const { error: iErr } = await db.from("members").insert({ room_id: room.id, user_id: userId, agent });
  if (iErr?.code === UNIQUE_VIOLATION) throw new ApiError("Someone took that seat a moment ago. Try again.", 409);
  if (iErr) throw iErr;
  await ring(room.code);
  return { code: room.code };
}

/** Results older than this are 2026-10-23 test runs, kept in the table but hidden from the board and ranks (user: don't delete, just don't show). */
const BOARD_SINCE = "2026-10-24T00:00:00Z";

/** Place on the one board: higher score first, then faster. Rank = 1 + rows strictly ahead (same order as `leaderboard()`). */
async function rankOf(r: { score: number; seconds: number }) {
  const { count, error } = await adminClient()
    .from("results")
    .select("room_id", { count: "exact", head: true })
    .gte("created_at", BOARD_SINCE)
    .or(`score.gt.${r.score},and(score.eq.${r.score},seconds.lt.${r.seconds})`);
  if (error) throw error;
  return (count ?? 0) + 1;
}

export async function roomView(rawCode: string, userId: string | null): Promise<RoomView> {
  if (!userId) throw new ApiError("You're not on this case.", 401);
  const room = await load(normalizeCode(rawCode));
  const me = await agentOf(room, userId);
  const c = caseOf(room);
  const db = adminClient();
  const [{ data: members, error: mErr }, { data: pins, error: pErr }, { data: guesses, error: gErr }] = await Promise.all([
    db.from("members").select("agent").eq("room_id", room.id).order("agent").returns<{ agent: number }[]>(),
    db.from("pins").select("item_id, agent").eq("room_id", room.id).order("created_at").returns<{ item_id: string; agent: number }[]>(),
    db.from("guesses").select("n, correct").eq("room_id", room.id).returns<{ n: number; correct: boolean }[]>(),
  ]);
  if (mErr || pErr || gErr) throw mErr ?? pErr ?? gErr;

  let ending: RoomView["ending"] = null;
  if (room.status !== "playing") {
    const solution = getSolution(room.case_slug);
    if (!solution) throw new ApiError("That case file is gone.", 404);
    const seconds = Math.round((Date.parse(room.ended_at ?? room.started_at) - Date.parse(room.started_at)) / 1000);
    let rank: number | null = null;
    if (room.status === "solved") {
      const { data: r, error } = await db
        .from("results")
        .select("seconds, score")
        .eq("room_id", room.id)
        .maybeSingle<{ seconds: number; score: number }>();
      if (error) throw error;
      if (r) rank = await rankOf(r);
    }
    ending = { solution, seconds, rank };
  }

  return {
    code: room.code,
    slug: room.case_slug,
    team: room.team,
    isHost: room.host_id === userId,
    me,
    agents: (members ?? []).map((m) => m.agent),
    pins: (pins ?? []).map((p) => ({ itemId: p.item_id, agent: p.agent })),
    status: room.status,
    guessesUsed: room.guesses_used,
    lastWrong: room.status === "playing" && (guesses ?? []).some((g) => !g.correct),
    startedAt: room.started_at,
    endedAt: room.ended_at,
    case: c,
    ending,
  };
}

/** Pin an item for the team; pinning a pinned item un-pins it. */
export async function togglePin(rawCode: string, userId: string, itemId: unknown) {
  const room = await load(normalizeCode(rawCode));
  const agent = await agentOf(room, userId);
  const c = caseOf(room);
  if (typeof itemId !== "string" || !c.folders.some((f) => f.items.some((i) => i.id === itemId))) {
    throw new ApiError("That isn't in the file", 400);
  }
  const db = adminClient();
  const { data: removed, error } = await db
    .from("pins")
    .delete()
    .eq("room_id", room.id)
    .eq("item_id", itemId)
    .select("item_id");
  if (error) throw error;
  if (!removed?.length) {
    const { error: iErr } = await db.from("pins").insert({ room_id: room.id, item_id: itemId, agent });
    if (iErr && iErr.code !== UNIQUE_VIOLATION) throw iErr; // a racing pin already did the job
  }
  await ring(room.code);
  return { pinned: !removed?.length };
}

/** Host only. One request wins each guess slot by conditional update; the loser gets 409. */
export async function submitGuess(rawCode: string, userId: string, raw: unknown) {
  const room = await load(normalizeCode(rawCode));
  await agentOf(room, userId);
  if (room.host_id !== userId) throw new ApiError("Only the host can make the accusation.", 403);
  const c = caseOf(room);
  const solution = getSolution(room.case_slug);
  if (!solution) throw new ApiError("That case file is gone.", 404);
  if (room.status !== "playing") throw new ApiError("That case is closed.", 409);

  const guess = validateGuess(c, raw);
  const correct = judge(solution, guess);
  const n = room.guesses_used + 1;
  const db = adminClient();
  const { data: claimed, error } = await db
    .from("rooms")
    .update({ guesses_used: n })
    .eq("id", room.id)
    .eq("status", "playing")
    .eq("guesses_used", n - 1)
    .select(ROOM_COLS);
  if (error) throw error;
  if (!claimed?.length) throw new ApiError("Already answered", 409);

  const { error: gErr } = await db.from("guesses").insert({ room_id: room.id, n, ...guess, correct });
  if (gErr) throw gErr;

  const ended = correct || n === 2;
  if (ended) {
    const endedAt = new Date();
    const { error: uErr } = await db
      .from("rooms")
      .update({ status: correct ? "solved" : "defeated", ended_at: endedAt.toISOString() })
      .eq("id", room.id);
    if (uErr) throw uErr;
    if (correct) {
      const seconds = Math.round((endedAt.getTime() - Date.parse(room.started_at)) / 1000);
      const { error: rErr } = await db.from("results").insert({
        room_id: room.id,
        case_slug: room.case_slug,
        team: room.team,
        guesses: n,
        seconds,
        score: score(c.difficulty, n as 1 | 2, seconds),
      });
      if (rErr) throw rErr;
    }
  }
  await ring(room.code);
  return { correct, guessesUsed: n };
}

type Row = { team: string; case_slug: string; guesses: number; seconds: number; score: number };

/** Top 50 results across all cases: highest score, then fastest. */
export async function leaderboard() {
  const { data, error } = await adminClient()
    .from("results")
    .select("team, case_slug, guesses, seconds, score")
    .gte("created_at", BOARD_SINCE)
    .order("score", { ascending: false })
    .order("seconds")
    .limit(50)
    .returns<Row[]>();
  if (error) throw error;
  return { board: data ?? [] };
}
