import "server-only";
import type { Tree } from "@/lib/engine/types";
import brijmohanValentine from "./brijmohan-valentine-monster-4p/tree.json";

// Every mystery is a folder written by the murder-mystery-story-tree skill: tree.json (validated by
// validate_tree.py), lexicon.json and art.ts (its Hairline figure). Trees are imported server-only: they
// hold the killer and every clue's target. Words and art are client-safe and registered in ./catalog.ts.
// ponytail: a static list; move to a `mysteries` table if they ever need adding without a deploy.

export type Mystery = { slug: string; tree: Tree };

export const MYSTERIES: Mystery[] = [
  { slug: "brijmohan-valentine-monster-4p", tree: brijmohanValentine as unknown as Tree },
];

export function getMystery(slug: string): Mystery | undefined {
  return MYSTERIES.find((m) => m.slug === slug);
}

/** Public card data for the case picker. No killer, no clues. */
export type MysteryCard = {
  slug: string;
  title: string;
  victim: string;
  difficulty: string;
  playerCount: number;
};

export function mysteryCards(): MysteryCard[] {
  return MYSTERIES.map(({ slug, tree }) => ({
    slug,
    title: tree.meta.title,
    victim: tree.meta.victim.name,
    difficulty: tree.meta.difficulty,
    playerCount: tree.meta.player_count,
  }));
}
