import "server-only";
import type { CaseFile, Solution } from "./types";

// Every case is a folder written by the murder-mystery-story-tree skill: case.json, solution.json,
// lexicon.json, art.ts. Solutions are imported server-only. Words/art/card data: ./catalog.ts.
// ponytail: static maps; move to a table if cases must be added without a deploy.

const CASES: Record<string, CaseFile> = {};
const SOLUTIONS: Record<string, Solution> = {};

export function getCase(slug: string): CaseFile | undefined {
  return CASES[slug];
}

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS[slug];
}
