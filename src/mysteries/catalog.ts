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


/** Teaser file per slug under public/cases/<slug>/ (silent loop for the picker card). Register by hand; must equal case.json media.teaser. */
export const TEASERS: Record<string, string> = { "ansel-corbin-night-train-5s": "teaser.mp4" };

/** Cover SVG per slug under public/cases/<slug>/ (card art). Register by hand; must equal case.json media.cover. */
export const COVERS: Record<string, string> = { "hollis-brandt-lighthouse-4s": "cover.webp", "ansel-corbin-night-train-5s": "cover.svg" };

/** Suspect portrait URL per slug, keyed by suspect index (case.json order) as string. None = monogram tile. */
export const PORTRAITS: Record<string, Record<string, string>> = {
  "hollis-brandt-lighthouse-4s": { "0": "/cases/hollis-brandt-lighthouse-4s/suspects/wren-doyle.webp", "1": "/cases/hollis-brandt-lighthouse-4s/suspects/iris-venn.webp", "2": "/cases/hollis-brandt-lighthouse-4s/suspects/callum-pryce.webp", "3": "/cases/hollis-brandt-lighthouse-4s/suspects/marta-quill.webp" },
  "ansel-corbin-night-train-5s": { "0": "/cases/ansel-corbin-night-train-5s/suspects/tilda-reeve.webp", "1": "/cases/ansel-corbin-night-train-5s/suspects/dr-osric-pell.webp", "2": "/cases/ansel-corbin-night-train-5s/suspects/ivo-sandre.webp", "3": "/cases/ansel-corbin-night-train-5s/suspects/calla-wren.webp", "4": "/cases/ansel-corbin-night-train-5s/suspects/bram-okafor.webp" },
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
