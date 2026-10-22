import type { Difficulty } from "../../mysteries/types.ts";

const BASE: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 300 };

/** Base by difficulty x (1.0 first guess, 0.6 second) + up to 100 time bonus over two hours. */
export function score(difficulty: Difficulty, guessN: 1 | 2, seconds: number): number {
  const mult = guessN === 1 ? 1 : 0.6;
  return Math.round(BASE[difficulty] * mult + Math.max(0, 100 * (1 - seconds / 7200)));
}
