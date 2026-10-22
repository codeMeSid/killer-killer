import { ApiError } from "../api-error.ts";
import type { CaseFile, Solution } from "../../mysteries/types.ts";

export type Guess = { who: number[]; motive: string; method: string };

/** Right only if who (as a set), why and how are all right. */
export function judge(solution: Solution, guess: Guess): boolean {
  const who = new Set(guess.who);
  return (
    who.size === solution.killers.length &&
    solution.killers.every((k) => who.has(k)) &&
    guess.motive === solution.motive &&
    guess.method === solution.method
  );
}

/** Checks a raw accusation body against the public case. `nobody` = suicide/accident. */
export function validateGuess(c: CaseFile, raw: unknown): Guess {
  const r = (raw ?? {}) as Record<string, unknown>;
  const who = Array.isArray(r.who) ? (r.who as unknown[]) : [];
  const nobody = r.nobody === true;
  const bad = () => new ApiError("That isn't in the file", 400);
  if (who.length === 0 && !nobody) throw new ApiError("Pick who did it", 400);
  if (typeof r.motive !== "string" || !r.motive) throw new ApiError("Pick why", 400);
  if (typeof r.method !== "string" || !r.method) throw new ApiError("Pick how", 400);
  if (nobody && who.length > 0) throw bad();
  if (!who.every((i) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < c.suspects.length)) throw bad();
  if (!c.motives.some((m) => m.id === r.motive) || !c.methods.some((m) => m.id === r.method)) throw bad();
  return { who: [...new Set(who as number[])], motive: r.motive, method: r.method };
}
