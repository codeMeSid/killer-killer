import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Every story folder is complete and registered. The lexicon contract lives in the story-tree
// skill's validator (one source of truth), so this test runs it rather than restating it.

const here = dirname(fileURLToPath(import.meta.url));
const validator = join(here, "../../.claude/skills/murder-mystery-story-tree/scripts/validate_tree.py");
const stories = readdirSync(here, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const catalog = readFileSync(join(here, "catalog.ts"), "utf8");
const manifest = readFileSync(join(here, "index.ts"), "utf8");

test("there are shipped stories", () => assert.ok(stories.length > 0));

for (const slug of stories) {
  const dir = join(here, slug);

  test(`${slug}: tree and lexicon pass the skill's validator`, () => {
    execFileSync("python3", [validator, join(dir, "tree.json")], { stdio: "pipe" });
    execFileSync("python3", [validator, "--lexicon", join(dir, "lexicon.json")], { stdio: "pipe" });
  });

  test(`${slug}: art is a wrapped Hairline figure`, () => {
    const art = readFileSync(join(dir, "art.ts"), "utf8");
    assert.match(art, /export default function define\(HL, hairline\)/);
    assert.match(art, /hairline\(\{/);
  });

  test(`${slug}: registered in index.ts and catalog.ts`, () => {
    assert.ok(manifest.includes(`"${slug}"`), "missing from src/mysteries/index.ts");
    assert.ok(catalog.includes(`"${slug}": () => import("./${slug}/art")`), "missing ART entry in catalog.ts");
    assert.ok(catalog.includes(`"${slug}": `), "missing LEXICON entry in catalog.ts");
  });
}
