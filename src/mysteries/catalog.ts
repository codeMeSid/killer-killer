import type { FigureDefine } from "@/lib/hairline";
import { capitalize, inWords } from "@/lib/words";
import type { Difficulty, Lexicon } from "./types";
import hollisLexicon from "./hollis-brandt-lighthouse-4s/lexicon.json";
import anselLexicon from "./ansel-corbin-night-train-5s/lexicon.json";

// Client-safe story data: words, art and card facts. Never import a solution here; solutions live
// behind `server-only` in ./index.ts. Register a new case in both. Folder `src/mysteries/<slug>/`.

export type CatalogEntry = { slug: string; title: string; difficulty: Difficulty; setting: string; victim: string };

export const CATALOG: CatalogEntry[] = [
  { slug: "hollis-brandt-lighthouse-4s", title: "The Dark Panel", difficulty: "easy", setting: "A lighthouse on a rock, one night before the inspection is signed", victim: "Hollis Brandt" },
  { slug: "ansel-corbin-night-train-5s", title: "Harrow Viaduct", difficulty: "medium", setting: "A night sleeper from Gram to Lorne, crossing a viaduct at two in the morning", victim: "Ansel Corbin" },
];

export const LEXICON: Record<string, Lexicon> = { "hollis-brandt-lighthouse-4s": hollisLexicon as Lexicon,
  "ansel-corbin-night-train-5s": anselLexicon as Lexicon,
};

/** Code-split: a figure loads only on the screen that shows it. */
export const ART: Record<string, () => Promise<{ default: FigureDefine }>> = {
  "hollis-brandt-lighthouse-4s": () => import("./hollis-brandt-lighthouse-4s/art"),
};

/** Teaser file per slug under public/cases/<slug>/ (silent loop for the picker card). Register by hand; must equal case.json media.teaser. */
export const TEASERS: Record<string, string> = {};

/** Cover SVG per slug under public/cases/<slug>/ (card art). Register by hand; must equal case.json media.cover. */
export const COVERS: Record<string, string> = { "hollis-brandt-lighthouse-4s": "cover.svg", "ansel-corbin-night-train-5s": "cover.svg" };

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
