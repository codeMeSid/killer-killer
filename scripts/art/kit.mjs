// Shared painting kit. Runs in the browser (loaded by render.mjs); `brush` = p5.brush/standalone.
// Coordinates: top-left origin, pixels (begin() translates the centred WEBGL space for you).
import { P } from "./palette.mjs";
export { P };

/** mulberry32: same seed, same painting. */
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.between = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (xs) => xs[Math.floor(r() * xs.length)];
  return r;
}

/** Canvas on obsidian, seeded. Returns ctx every helper takes. */
export function begin(brush, W, H, seed) {
  brush.createCanvas(W, H, { pixelDensity: 1 });
  brush.angleMode(brush.DEGREES);
  brush.scaleBrushes(Math.max(1.5, W / 500));
  brush.seed(seed);
  brush.clear(P.obsidian);
  brush.push();
  brush.translate(-W / 2, -H / 2);
  return { brush, W, H, r: rng(seed) };
}

/** Soft watercolour wash polygon. pts = [[x,y],...]. */
export function wash({ brush }, pts, color, alpha = 40, bleed = 0.4) {
  brush.noStroke(); brush.fill(color, Math.min(255, alpha * 2.6)); // p5.brush fills read faint; x2.6 gives true wash strength
  brush.fillBleed(bleed, "out"); brush.fillTexture(0.55, 0.4);
  brush.polygon(pts);
}

/** Inked outline polygon (optionally filled). */
export function ink({ brush }, pts, color, weight = 1, fillColor, fillAlpha = 80) {
  if (fillColor) { brush.fill(fillColor, fillAlpha); brush.fillBleed(0.3, "out"); } else brush.noFill();
  brush.set("2B", color, weight); brush.polygon(pts);
}

/** Hatched region: parallel strokes. */
export function hatchRect({ brush }, x, y, w, h, color, alpha = 0.6, dist = 8, angle = 0, brushName = "charcoal") {
  brush.noFill(); brush.hatchStyle(brushName, color, alpha); brush.hatch(dist, angle, { rand: 0.15 });
  brush.rect(x, y, w, h, "corner"); brush.noHatch();
}

/** Stars: tiny white dots, some blue. Above ymax only. */
export function stars(ctx, n, ymax) {
  const { brush, W, r } = ctx;
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * ymax;
    brush.set("rotring", r() < 0.25 ? P.blue : P.white, 0.4 + r() * 0.7);
    brush.circle(x, y, 1 + r() * 2.5);
  }
}

/** Horizon sea: stacked wave strokes, darker far, brighter near. */
export function sea(ctx, horizon, color = P.blue, foam = P.white) {
  const { brush, W, H, r } = ctx;
  const rows = 26;
  for (let i = 0; i < rows; i++) {
    const t = i / rows, y = horizon + (H - horizon) * t * t;
    const len = 40 + 220 * t;
    for (let k = 0; k < 4 + 12 * t; k++) {
      const x = r() * W;
      brush.set("HB", r() < 0.12 + 0.2 * t ? foam : color, 0.25 + 0.55 * t);
      brush.line(x, y + r() * 6, x + len * (0.5 + r()), y + (r() - 0.5) * 6);
    }
  }
}

/** Light glow: concentric translucent discs. */
export function glow(ctx, x, y, radius, color, steps = 10, alpha = 14) {
  const { brush } = ctx;
  brush.noStroke();
  for (let i = steps; i >= 1; i--) { brush.fill(color, Math.min(255, alpha * 3)); brush.fillBleed(0.3, "out"); brush.circle(x, y, (radius * i) / steps); }
}

/** Beam: tapering light wedge from (x,y) to far edge. */
export function beam(ctx, x, y, tx, ty, spread, color = P.orange, alpha = 50) {
  const dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  for (let i = 3; i >= 1; i--) {
    const s = (spread * i) / 3;
    wash(ctx, [[x, y], [tx + nx * s, ty + ny * s], [tx - nx * s, ty - ny * s]], color, alpha / i, 0.15);
  }
}

/**
 * Figure bust. ONE face construction for every suspect (same proportions, same features), so the face never hints guilt.
 * Differences come only from: hair (style, colour), clothes (colour, collar), accessory, accent pigment.
 * o = { cx, cy, s (head height px), skin, hair, hairStyle: "short|long|bun|bald|cap", cloth, collar: "round|high|open", accessory: "none|glasses|scarf|hat|earring", accent }
 * Expression is fixed neutral on purpose.
 */
export function bust(ctx, o) {
  const { brush } = ctx, { cx, cy, s } = o;
  const skin = o.skin ?? P.white, hair = o.hair ?? P.blue, cloth = o.cloth ?? P.blue, accent = o.accent ?? P.orange;
  const hw = s * 0.4, hh = s * 0.5;
  // shoulders / clothes
  wash(ctx, [[cx - s * 1.0, cy + s * 1.5], [cx - s * 0.9, cy + s * 0.75], [cx - hw * 0.5, cy + hh * 0.95], [cx + hw * 0.5, cy + hh * 0.95], [cx + s * 0.9, cy + s * 0.75], [cx + s * 1.0, cy + s * 1.5]], cloth, 190, 0.2);
    // neck
  wash(ctx, [[cx - hw * 0.35, cy + hh * 0.6], [cx + hw * 0.35, cy + hh * 0.6], [cx + hw * 0.4, cy + hh * 1.0], [cx - hw * 0.4, cy + hh * 1.0]], skin, 70, 0.2);
  wash(ctx, [[cx - hw * 0.4, cy + hh * 0.7], [cx + hw * 0.4, cy + hh * 0.7], [cx + hw * 0.4, cy + hh * 1.0], [cx - hw * 0.4, cy + hh * 1.0]], P.obsidian, 60, 0.2); // chin shadow
  // hair behind head
  const back = { long: [[cx - hw * 1.25, cy + hh * 0.9], [cx - hw * 1.2, cy - hh * 0.4], [cx, cy - hh * 1.3], [cx + hw * 1.2, cy - hh * 0.4], [cx + hw * 1.25, cy + hh * 0.9]], bun: [[cx - hw * 0.5, cy - hh * 1.35], [cx + hw * 0.5, cy - hh * 1.35], [cx + hw * 0.5, cy - hh * 0.95], [cx - hw * 0.5, cy - hh * 0.95]] }[o.hairStyle];
  if (back) wash(ctx, back, hair, 170, 0.2);
  // head
  const head = [];
  for (let a = 0; a < 360; a += 20) head.push([cx + Math.cos((a * Math.PI) / 180) * hw * (a > 0 && a < 180 ? 0.82 : 1), cy + Math.sin((a * Math.PI) / 180) * hh]);
  wash(ctx, head, skin, 150, 0.2);
  wash(ctx, head.filter(([x]) => x > cx + hw * 0.1).concat([[cx + hw * 0.1, cy + hh], [cx + hw * 0.1, cy - hh]]), P.obsidian, 60, 0.2); // shadow side
  wash(ctx, head.map(([x, y]) => [cx + (x - cx) * 0.5 - hw * 0.2, cy + (y - cy) * 0.6 - hh * 0.05]), P.white, 50, 0.3); // lit cheek
  // fixed face: brows, eyes, nose, mouth
  brush.set("2B", P.obsidian, 0.9);
  for (const sx of [-1, 1]) {
    brush.line(cx + sx * hw * 0.18, cy - hh * 0.2, cx + sx * hw * 0.55, cy - hh * 0.24);
    brush.circle(cx + sx * hw * 0.36, cy - hh * 0.05, hw * 0.12);
  }
  brush.line(cx, cy - hh * 0.05, cx - hw * 0.06, cy + hh * 0.3); brush.line(cx - hw * 0.06, cy + hh * 0.3, cx + hw * 0.1, cy + hh * 0.32);
  brush.line(cx - hw * 0.28, cy + hh * 0.58, cx + hw * 0.28, cy + hh * 0.58);
  // hair front
  const top = { short: [[cx - hw * 1.05, cy - hh * 0.1], [cx - hw * 0.9, cy - hh * 0.9], [cx, cy - hh * 1.15], [cx + hw * 0.9, cy - hh * 0.9], [cx + hw * 1.05, cy - hh * 0.1], [cx + hw * 0.5, cy - hh * 0.55], [cx - hw * 0.5, cy - hh * 0.55]], long: [[cx - hw * 1.05, cy], [cx - hw * 0.9, cy - hh * 0.95], [cx, cy - hh * 1.2], [cx + hw * 0.9, cy - hh * 0.95], [cx + hw * 1.05, cy], [cx + hw * 0.4, cy - hh * 0.6], [cx - hw * 0.4, cy - hh * 0.6]], bun: [[cx - hw * 1.0, cy - hh * 0.1], [cx - hw * 0.85, cy - hh * 0.9], [cx, cy - hh * 1.1], [cx + hw * 0.85, cy - hh * 0.9], [cx + hw * 1.0, cy - hh * 0.1], [cx + hw * 0.4, cy - hh * 0.6], [cx - hw * 0.4, cy - hh * 0.6]], cap: [[cx - hw * 1.1, cy - hh * 0.45], [cx - hw * 0.9, cy - hh * 1.05], [cx + hw * 0.9, cy - hh * 1.05], [cx + hw * 1.1, cy - hh * 0.45]] }[o.hairStyle];
  if (top) wash(ctx, top, hair, 200, 0.15);
  // accessory
  if (o.accessory === "glasses") { brush.set("rotring", accent, 0.6); for (const sx of [-1, 1]) brush.circle(cx + sx * hw * 0.36, cy - hh * 0.05, hw * 0.32); brush.line(cx - hw * 0.16, cy - hh * 0.05, cx + hw * 0.16, cy - hh * 0.05); }
  if (o.accessory === "scarf") wash(ctx, [[cx - hw * 1.1, cy + hh * 0.85], [cx + hw * 1.1, cy + hh * 0.85], [cx + hw * 1.2, cy + hh * 1.25], [cx - hw * 1.2, cy + hh * 1.25]], accent, 200, 0.2);
  if (o.accessory === "hat") wash(ctx, [[cx - hw * 1.5, cy - hh * 0.75], [cx - hw * 0.9, cy - hh * 0.8], [cx - hw * 0.8, cy - hh * 1.5], [cx + hw * 0.8, cy - hh * 1.5], [cx + hw * 0.9, cy - hh * 0.8], [cx + hw * 1.5, cy - hh * 0.75]], accent, 200, 0.2);
  if (o.accessory === "earring") { brush.set("rotring", accent, 1.2); brush.circle(cx + hw * 1.0, cy + hh * 0.25, hw * 0.12); }
}

/** Framed cover: hand-ruled inner border in blue, title-free. */
export function frame(ctx, inset = 24) {
  const { brush, W, H } = ctx;
  brush.noFill(); brush.set("rotring", P.blue, 0.9);
  brush.rect(inset, inset, W - inset * 2, H - inset * 2, "corner");
  brush.set("rotring", P.orange, 0.5);
  brush.rect(inset + 8, inset + 8, W - (inset + 8) * 2, H - (inset + 8) * 2, "corner");
}

/** Vignette: obsidian washes around the edges. */
export function vignette(ctx) {
  const { W, H } = ctx;
  for (const pts of [[[0, 0], [W, 0], [W, H * 0.08], [0, H * 0.1]], [[0, H], [W, H], [W, H * 0.93], [0, H * 0.9]], [[0, 0], [W * 0.06, 0], [W * 0.05, H], [0, H]], [[W, 0], [W * 0.94, 0], [W * 0.95, H], [W, H]]]) wash(ctx, pts, P.obsidian, 45, 0.15);
}

/** Ragged blob polygon (cloud, rock, fog bank): ellipse with seeded jitter. */
export function blob({ r }, cx, cy, rx, ry, jitter = 0.18, n = 18) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * jitter; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}

/** Paper grain: sparse faint specks over everything. Call last before vignette. */
export function grain(ctx, n = 900) {
  const { brush, W, H, r } = ctx;
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H; brush.set("rotring", r() < 0.5 ? P.white : P.blue, 0.15 + r() * 0.2); brush.line(x, y, x + 1 + r() * 2, y + r() * 1.5); }
}
