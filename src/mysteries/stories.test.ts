import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CaseFile, Item, Solution } from "./types.ts";

// Every registered case folder is complete and consistent. The full contract lives in the skill's
// validate_case.py; this guards the app-side wiring. Zero folders = zero cases, still green.

const here = dirname(fileURLToPath(import.meta.url));
const slugs = readdirSync(here, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const catalog = readFileSync(join(here, "catalog.ts"), "utf8");
const manifest = readFileSync(join(here, "index.ts"), "utf8");
const read = <T>(slug: string, f: string) => JSON.parse(readFileSync(join(here, slug, f), "utf8")) as T;

for (const slug of slugs) {
  test(`${slug}: schema strings, unique ids, solution ids exist`, () => {
    const c = read<CaseFile>(slug, "case.json");
    const s = read<Solution>(slug, "solution.json");
    assert.equal(c.schema, "mm-case-file/1");
    assert.equal(s.schema, "mm-case-solution/1");
    assert.equal(read<{ schema: string }>(slug, "lexicon.json").schema, "mm-lexicon/1");
    assert.equal(c.slug, slug);
    const items: Item[] = c.folders.flatMap((f) => f.items);
    const ids = items.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate item id");
    assert.ok(c.motives.some((m) => m.id === s.motive), "motive not in case");
    assert.ok(c.methods.some((m) => m.id === s.method), "method not in case");
    for (const k of s.killers) assert.ok(k >= 0 && k < c.suspects.length, "killer index");
    const cited = [...s.deductions.flatMap((d) => d.items), ...s.herrings.flatMap((h) => h.ruled_out_by)];
    for (const id of cited) assert.ok(ids.includes(id), `unknown item ${id}`);
  });

  test(`${slug}: registration`, () => {
    assert.ok(manifest.includes(`"${slug}"`), "missing from index.ts");
    assert.ok(catalog.includes(`"${slug}": `), "missing LEXICON entry");
  });
}
