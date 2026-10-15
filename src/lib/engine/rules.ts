// Port of the skill's scripts/constants.py. Keep in sync with references/engine-rules.md.
import type { Difficulty, Tier } from "./types.ts";

export const ROUNDS = 10;
export const PIVOT_ROUND = 8;
export const START_LUCK = 3;
export const STAT_MAX = 5;
export const LUCK_MAX = 5;
export const PUSH_BONUS = 2;
export const PUSH_COST = 1;
export const RED_HERRING_COMMITS_FOR_WRONG = 2;

export const THRESHOLDS: Record<Tier, number> = { easy: 5, medium: 7, hard: 9 };

export const DIFFICULTY: Record<Difficulty, { keyNeeded: number }> = {
  easy: { keyNeeded: 3 },
  medium: { keyNeeded: 4 },
  hard: { keyNeeded: 5 },
};

export const SLOTS = ["A", "B", "C", "D"] as const;
