# Case art (p5.brush, rendered once)

Every image is a p5.brush painting rendered once in headless Chromium and committed as a static file. Never generated at runtime; shown via `<img>`. Palette only (`palette.mjs`).

```
node scripts/art/render.mjs scripts/art/paintings/<name>.mjs public/cases/<slug>/<out>.webp [w h]
```

Default size 1280x720 (16:9, what `<Cover>` shows). Takes 1-7 minutes with many large washes (software GL); run in background. Needs `playwright-core` (devDependency) and a cached Chromium (`npx playwright-core install chromium` if missing).

## New painting

Create `scripts/art/paintings/<name>.mjs`:

```js
import { begin, wash, bust, frame, P } from "../kit.mjs";
export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 42); // seed: same seed, same image
  wash(c, [[0, 0], [W, 0], [W, H], [0, H]], P.blue, 20);
  bust(c, { cx: W / 2, cy: H * 0.4, s: H * 0.4, hairStyle: "short", hair: P.orange, cloth: P.blue, accessory: "glasses", accent: P.green });
  frame(c);
}
```

Look at the output (open the image), iterate. Reference: `paintings/lighthouse-cover.mjs`.

- Kit: `begin wash blob ink hatchRect stars sea glow beam bust frame grain vignette rng`. Prefer filled `wash` masses over outlines (painterly look). Add helpers there, not in paintings.
- `bust` uses one face for everyone; vary hair, clothes, collar, accessory, age, tilt, accent only. Never hint the killer. Suspects: `scripts/art/paintings/suspects-<slug>.mjs` (specs list) + `node scripts/art/render-suspects.mjs <slug> [index]` -> `suspects/<name-slug>.webp` 512x512.
- Wash alpha is scaled x2.6 in `wash`; glow x3 (p5.brush fills read faint).
- Portraits: `suspects/<name-slug>.webp`. Evidence: `evidence/<item-id>.webp`. Cover: `cover.webp`. Register in `src/mysteries/catalog.ts`.
