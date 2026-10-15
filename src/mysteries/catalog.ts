import type { FigureDefine } from "@/lib/hairline";
import { capitalize, inWords } from "@/lib/words";
import type { Lexicon } from "./types";
import brijmohanValentineLexicon from "./brijmohan-valentine-monster-4p/lexicon.json";

// Client-safe story data: each story's words and its Hairline figure. Never import a tree here;
// trees hold the killer and live behind `server-only` in ./index.ts. Register a new story in both.

export const LEXICON: Record<string, Lexicon> = {
  "brijmohan-valentine-monster-4p": brijmohanValentineLexicon as Lexicon,
};

/** Code-split: a figure loads only on the screen that shows it. */
export const ART: Record<string, () => Promise<{ default: FigureDefine }>> = {
  "brijmohan-valentine-monster-4p": () => import("./brijmohan-valentine-monster-4p/art"),
};

export function lexiconFor(slug: string): Lexicon {
  const lexicon = LEXICON[slug];
  if (!lexicon) throw new Error(`No lexicon for mystery "${slug}"`);
  return lexicon;
}

/** Fills `{n}` (count in words), `{N}` (capitalised) and `{victim}`. */
export function fill(text: string, vars: { n?: number; victim?: string } = {}) {
  return text
    .replaceAll("{N}", vars.n == null ? "{N}" : capitalize(inWords(vars.n)))
    .replaceAll("{n}", vars.n == null ? "{n}" : inWords(vars.n))
    .replaceAll("{victim}", vars.victim ?? "{victim}");
}
