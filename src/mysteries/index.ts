import "server-only";
import type { CaseFile, Solution } from "./types";
import hollisCase from "./hollis-brandt-lighthouse-4s/case.json";
import hollisSolution from "./hollis-brandt-lighthouse-4s/solution.json";
import anselCase from "./ansel-corbin-night-train-5s/case.json";
import anselSolution from "./ansel-corbin-night-train-5s/solution.json";

// Every case is a folder written by the murder-mystery-story-tree skill: case.json, solution.json,
// lexicon.json. Solutions are imported server-only. Words/card data: ./catalog.ts.
// ponytail: static maps; move to a table if cases must be added without a deploy.

const CASES: Record<string, CaseFile> = { "hollis-brandt-lighthouse-4s": hollisCase as CaseFile,
  "ansel-corbin-night-train-5s": anselCase as CaseFile,
};
const SOLUTIONS: Record<string, Solution> = { "hollis-brandt-lighthouse-4s": hollisSolution as Solution,
  "ansel-corbin-night-train-5s": anselSolution as Solution,
};

export function getCase(slug: string): CaseFile | undefined {
  return CASES[slug];
}

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS[slug];
}
