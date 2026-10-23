#!/usr/bin/env node
// node scripts/art/render-suspects.mjs <slug> [index]   -> public/cases/<slug>/suspects/<name-slug>.webp (512x512), all suspects in parallel
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const [slug, only] = process.argv.slice(2);
const { specs } = await import(`./paintings/suspects-${slug}.mjs`);
const root = resolve(import.meta.dirname, "../..");
await Promise.all(specs.map((sp, i) => only != null && +only !== i ? 0 : new Promise((ok, no) => {
  const out = `public/cases/${slug}/suspects/${sp.file}.webp`;
  spawn("node", ["scripts/art/render.mjs", `scripts/art/paintings/suspects-${slug}.mjs`, out, "512", "512"], { cwd: root, stdio: "inherit", env: { ...process.env, KK_SPEC: String(i) } })
    .on("exit", (c) => (c ? no(new Error(out)) : ok()));
})));
