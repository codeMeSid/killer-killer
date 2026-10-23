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

/** Mix two hex colours (blend of palette pigments only). t = share of b. */
export function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Opaque-ish paint mass: high alpha, low texture. */
export function solid({ brush }, pts, color, alpha = 255, bleed = 0.1, layers = 3) {
  // p5.brush fills are translucent and mix with the dark ground (greying); stacking layers builds true pigment.
  brush.noStroke(); brush.fill(color, alpha); brush.fillBleed(bleed, "out"); brush.fillTexture(0.15, 0.2);
  for (let i = 0; i < layers; i++) brush.polygon(pts);
}

/** Stroke polyline [[x,y],...] with a brush. */
export function stroke({ brush }, pts, color, weight = 1, name = "2B") {
  brush.set(name, color, weight * 1.8);
  for (let i = 0; i < pts.length - 1; i++) brush.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
}

/**
 * Painted bust. ONE face construction for every suspect (same proportions, features, light, expression: neutral, wary).
 * Light: warm key from viewer-left, blue rim from right. Variation only through:
 * o = { cx, cy, s (head height px), tilt (deg), age 0..1, skin (0 pale .. 1 deep, mix white->orange), hair (colour), hairStyle: "short|long|bun|bald|swept|cap",
 *       cloth (colour), collar: "round|high|open|suit", accessory: "none|glasses|scarf|earring|beard|moustache", accent (colour) }
 */
export function bust(ctx, o) {
  const { cx, cy, s } = o;
  const age = o.age ?? 0.4, tilt = ((o.tilt ?? 0) * Math.PI) / 180;
  const skin = mix(P.white, P.orange, 0.45 + (o.skin ?? 0.3) * 0.45);
  const skinLit = mix(skin, P.white, 0.3), skinShade = mix(mix(skin, P.blue, 0.12), P.obsidian, 0.42), skinDeep = mix(mix(skin, P.blue, 0.05), P.obsidian, 0.6);
  const hairBase = o.hair ?? P.blue;
  const hairGrey = mix(hairBase, P.white, Math.max(0, age - 0.55) * 1.4);
  const hair = mix(hairGrey, P.obsidian, 0.62), hairLit = mix(hairGrey, P.white, 0.15);
  const cloth = mix(o.cloth ?? P.blue, P.obsidian, 0.45), clothLit = mix(o.cloth ?? P.blue, P.obsidian, 0.15), clothShade = mix(cloth, P.obsidian, 0.5);
  const accent = o.accent ?? P.orange, ink0 = mix(P.obsidian, P.blue, 0.1);
  // local units (head height = 1, origin head centre) -> canvas; head+neck tilt about neck base
  const pv = [0, 0.95];
  const T = (x, y) => { const dx = x - pv[0], dy = y - pv[1], c = Math.cos(tilt), n = Math.sin(tilt); return [cx + (pv[0] + dx * c - dy * n) * s, cy + (pv[1] + dx * n + dy * c) * s]; };
  const F = (x, y) => [cx + x * s, cy + y * s]; // untilted (body)
  const poly = (f, pts) => pts.map(([x, y]) => f(x, y));
  const head = []; // jaw-tapered oval
  for (let a = 0; a < 360; a += 8) { const r = (a * Math.PI) / 180, sy = Math.sin(r), k = 1 - 0.2 * Math.pow(Math.max(0, sy), 1.6); head.push([Math.cos(r) * 0.36 * k, sy * 0.5]); }

  // shoulders + clothing (solid mass), key-lit left, shade right
  const sh = [[-1.15, 1.9], [-1.1, 1.0], [-0.85, 0.74], [-0.45, 0.66], [-0.2, 0.62], [0.2, 0.62], [0.45, 0.66], [0.85, 0.74], [1.1, 1.0], [1.15, 1.9]];
  solid(ctx, poly(F, sh), cloth);
  solid(ctx, poly(F, [[-1.1, 1.0], [-0.85, 0.74], [-0.45, 0.66], [-0.3, 0.64], [-0.5, 1.9], [-1.15, 1.9]]), clothLit, 150);
  solid(ctx, poly(F, [[0.45, 0.66], [0.85, 0.74], [1.1, 1.0], [1.15, 1.9], [0.75, 1.9]]), clothShade, 170);
  stroke(ctx, poly(F, [[-1.08, 1.0], [-0.85, 0.76], [-0.45, 0.68], [-0.2, 0.64]]), mix(P.white, o.cloth ?? P.blue, 0.5), 1.4); // key edge light
  stroke(ctx, poly(F, [[0.2, 0.64], [0.45, 0.68], [0.85, 0.76], [1.08, 1.0]]), mix(P.blue, P.white, 0.4), 1.2); // blue rim
  // neck
  solid(ctx, poly(T, [[-0.18, 0.3], [0.18, 0.3], [0.21, 0.85], [-0.21, 0.85]]), skin);
  solid(ctx, poly(T, [[0.07, 0.3], [0.18, 0.3], [0.21, 0.85], [0.1, 0.85]]), skinShade, 150);
  solid(ctx, poly(T, [[-0.17, 0.48], [0, 0.52], [0.18, 0.46], [0.2, 0.62], [-0.18, 0.62]]), skinDeep, 200); // chin cast shadow
  // collar
  const col = o.collar ?? "round";
  if (col === "high") { solid(ctx, poly(F, [[-0.26, 0.5], [0.26, 0.5], [0.3, 0.9], [-0.3, 0.9]]), cloth); solid(ctx, poly(F, [[0.02, 0.5], [0.26, 0.5], [0.3, 0.9], [0.02, 0.9]]), clothShade, 200); stroke(ctx, poly(F, [[-0.26, 0.5], [-0.3, 0.9]]), clothLit, 1.2); }
  if (col === "round") solid(ctx, poly(F, [[-0.2, 0.74], [0.2, 0.74], [0.17, 0.84], [0, 0.9], [-0.17, 0.84]]), skin);
  if (col === "open" || col === "suit") {
    const sk = poly(F, [[-0.2, 0.74], [0.2, 0.74], [0, 1.12]]);
    solid(ctx, sk, col === "suit" ? mix(P.white, P.blue, 0.2) : skin);
    stroke(ctx, poly(F, [[-0.2, 0.74], [0, 1.14], [0.2, 0.74]]), col === "suit" ? clothLit : skinShade, 1.6);
    if (col === "suit") { stroke(ctx, poly(F, [[-0.22, 0.74], [-0.1, 1.2], [-0.02, 1.3]]), clothLit, 1.2); stroke(ctx, poly(F, [[0.22, 0.74], [0.1, 1.2], [0.02, 1.3]]), clothShade, 1.2); }
  }
  if (o.accessory === "scarf") { solid(ctx, poly(F, [[-0.34, 0.66], [0.34, 0.66], [0.42, 0.98], [0, 1.08], [-0.42, 0.98]]), mix(accent, P.obsidian, 0.3)); solid(ctx, poly(F, [[0.0, 0.7], [0.34, 0.66], [0.42, 0.98], [0, 1.08]]), mix(accent, P.obsidian, 0.62), 200); stroke(ctx, poly(F, [[-0.3, 0.8], [0.1, 0.9], [0.38, 0.84]]), mix(accent, P.white, 0.3), 1.2); }

  // hair behind head
  const st = o.hairStyle ?? "short";
  if (st === "long") { solid(ctx, poly(T, [[-0.42, -0.1], [-0.46, 0.5], [-0.4, 0.95], [0.4, 0.95], [0.46, 0.5], [0.42, -0.1], [0, -0.62]]), hair); solid(ctx, poly(T, [[0.1, -0.1], [0.46, 0.5], [0.4, 0.95], [0.1, 0.95]]), mix(hair, P.obsidian, 0.5), 180); }
  if (st === "bun") { const pts = []; for (let a = 0; a < 360; a += 30) pts.push(T(-0.02 + Math.cos((a * Math.PI) / 180) * 0.17, -0.66 + Math.sin((a * Math.PI) / 180) * 0.15)); solid(ctx, pts, hair); stroke(ctx, [T(-0.12, -0.7), T(0, -0.76), T(0.1, -0.7)], hairLit, 1.2); }

  // head: base, key-lit left, shade right
  solid(ctx, poly(T, head), skin);
  const term = (x0, k) => { const t = []; for (let y = 0.5; y >= -0.5; y -= 0.1) t.push([x0 + k * Math.pow(y / 0.5, 2), y]); return t; };
  solid(ctx, poly(T, head.filter(([x]) => x > 0.1).concat(term(0.1, 0.16))), skinShade, 200);
  solid(ctx, poly(T, head.filter(([x]) => x > 0.22).concat([[0.22, 0.45], [0.22, -0.4]])), skinDeep, 170);
  solid(ctx, poly(T, [[-0.3, -0.1], [-0.1, -0.2], [-0.02, 0.1], [-0.2, 0.3], [-0.3, 0.2]]), skinLit, 70, 0.1, 1); // lit cheek
  stroke(ctx, poly(T, head.filter(([x, y]) => x > 0.12 && y > -0.35 && y < 0.35)), mix(P.blue, P.white, 0.45), 1.3); // blue rim, right
  // ear
  const ear = (sx) => solid(ctx, poly(T, [[sx * 0.35, -0.05], [sx * 0.41, -0.02], [sx * 0.41, 0.13], [sx * 0.35, 0.16]]), sx < 0 ? skin : skinShade);
  ear(-1); ear(1);

  // features
  const brow = mix(hairBase, P.obsidian, 0.55), lid = mix(skinShade, P.obsidian, 0.3);
  for (const sx of [-1, 1]) {
    const ex = sx * 0.14, ey = -0.04;
    solid(ctx, poly(T, [[ex - 0.07, ey], [ex, ey - 0.03], [ex + 0.07, ey], [ex, ey + 0.025]]), mix(P.white, skinShade, 0.5), 230, 0.05); // eye white
    solid(ctx, poly(T, [[ex - 0.026, ey], [ex - 0.012, ey - 0.026], [ex + 0.012, ey - 0.026], [ex + 0.026, ey], [ex + 0.012, ey + 0.024], [ex - 0.012, ey + 0.024]]), ink0, 255, 0.05); // iris
    stroke(ctx, poly(T, [[ex - 0.08, ey + 0.002], [ex - 0.03, ey - 0.032], [ex + 0.03, ey - 0.032], [ex + 0.08, ey + 0.004]]), lid, 1.3); // upper lid
    stroke(ctx, poly(T, [[ex - 0.07, ey + 0.045], [ex, ey + 0.055], [ex + 0.07, ey + 0.04]]), skinShade, 0.8); // bag
    stroke(ctx, poly(T, [[ex - 0.09, ey - 0.08 + (sx > 0 ? 0 : 0.008)], [ex, ey - 0.105], [ex + 0.09, ey - 0.075 - (sx > 0 ? 0.008 : 0)]]), brow, 2.2); // wary, level brows slightly lowered
  }
  stroke(ctx, poly(T, [[0.035, -0.02], [0.05, 0.1], [0.02, 0.14]]), skinDeep, 1.4); // nose shadow side
  stroke(ctx, poly(T, [[-0.045, 0.145], [0, 0.16], [0.05, 0.145]]), skinDeep, 1.3); // nostrils
  stroke(ctx, poly(T, [[-0.02, -0.02], [-0.03, 0.09]]), skinLit, 1.2); // bridge light
  stroke(ctx, poly(T, [[-0.1, 0.27], [-0.03, 0.285], [0.03, 0.285], [0.1, 0.268]]), mix(P.red, skinDeep, 0.45), 1.8); // mouth, flat line
  stroke(ctx, poly(T, [[-0.06, 0.32], [0, 0.335], [0.06, 0.32]]), skinLit, 1.1); // lower lip light
  if (age > 0.45) { const a2 = (age - 0.4) * 2.2; for (const sx of [-1, 1]) { stroke(ctx, poly(T, [[sx * 0.08, 0.14], [sx * 0.12, 0.24], [sx * 0.13, 0.28]]), skinShade, 0.8 + a2 * 0.5); stroke(ctx, poly(T, [[sx * 0.12, -0.2], [sx * 0.04, -0.215]]), skinShade, 0.6 + a2 * 0.4); } }

  // hair front
  const hl = (pts) => poly(T, pts);
  if (st === "short") { solid(ctx, hl([[-0.38, 0.0], [-0.4, -0.3], [-0.2, -0.54], [0.1, -0.56], [0.34, -0.42], [0.39, -0.05], [0.32, -0.2], [0.1, -0.3], [-0.12, -0.32], [-0.3, -0.18]]), hair); }
  if (st === "swept") { solid(ctx, hl([[-0.38, 0.0], [-0.42, -0.32], [-0.2, -0.57], [0.15, -0.6], [0.37, -0.4], [0.39, -0.04], [0.3, -0.24], [0.0, -0.3], [-0.3, -0.12]]), hair); stroke(ctx, hl([[-0.3, -0.4], [-0.05, -0.5], [0.25, -0.46]]), hairLit, 1.6); }
  if (st === "long") { solid(ctx, hl([[-0.4, 0.4], [-0.42, -0.3], [-0.2, -0.55], [0.12, -0.57], [0.36, -0.4], [0.4, 0.4], [0.33, 0.1], [0.3, -0.2], [0.06, -0.3], [-0.08, -0.26], [-0.28, -0.1], [-0.32, 0.2]]), hair); stroke(ctx, hl([[-0.33, -0.35], [-0.38, 0.0], [-0.38, 0.3]]), hairLit, 1.5); }
  if (st === "bun") { solid(ctx, hl([[-0.38, 0.0], [-0.4, -0.3], [-0.2, -0.52], [0.1, -0.54], [0.34, -0.4], [0.39, -0.05], [0.3, -0.22], [0.0, -0.31], [-0.3, -0.18]]), hair); }
  if (st === "bald") { solid(ctx, hl([[-0.37, 0.02], [-0.39, -0.12], [-0.34, -0.2], [-0.35, 0.05]]), hair, 220); solid(ctx, hl([[0.37, 0.02], [0.39, -0.12], [0.34, -0.2], [0.35, 0.05]]), mix(hair, P.obsidian, 0.4), 220); solid(ctx, hl([[-0.2, -0.46], [0.1, -0.48], [0.0, -0.36], [-0.22, -0.36]]), skinLit, 120); }
  if (st === "cap") { solid(ctx, hl([[-0.4, -0.12], [-0.38, -0.4], [-0.2, -0.58], [0.15, -0.6], [0.37, -0.42], [0.4, -0.12]]), mix(accent, P.obsidian, 0.55)); solid(ctx, hl([[0.08, -0.12], [0.4, -0.12], [0.37, -0.42], [0.15, -0.6], [0.08, -0.58]]), mix(accent, P.obsidian, 0.78), 200); solid(ctx, hl([[-0.44, -0.13], [0.46, -0.13], [0.5, -0.07], [-0.34, -0.07]]), mix(accent, P.obsidian, 0.7)); stroke(ctx, hl([[-0.3, -0.5], [0, -0.58], [0.2, -0.56]]), mix(accent, P.white, 0.3), 1.3); solid(ctx, hl([[-0.36, -0.07], [-0.34, 0.05], [-0.38, 0.0]]), hair, 200); solid(ctx, hl([[0.36, -0.07], [0.34, 0.05], [0.38, 0.0]]), hair, 200); }
  if (st !== "bald" && st !== "cap") { stroke(ctx, hl([[-0.3, -0.3], [-0.1, -0.46], [0.15, -0.5]]), hairLit, 1.5); stroke(ctx, hl([[-0.2, -0.2], [0, -0.38]]), hairLit, 1); }

  // accessories
  const acc = o.accessory ?? "none";
  if (acc === "glasses") { for (const sx of [-1, 1]) { const g = []; for (let a = 0; a < 360; a += 30) g.push(T(sx * 0.14 + Math.cos((a * Math.PI) / 180) * 0.095, -0.035 + Math.sin((a * Math.PI) / 180) * 0.075)); g.push(g[0]); stroke(ctx, g, mix(accent, P.obsidian, 0.15), 1.6); } stroke(ctx, [T(-0.045, -0.04), T(0.045, -0.04)], mix(accent, P.white, 0.2), 1.4); stroke(ctx, [T(-0.235, -0.04), T(-0.37, -0.05)], mix(accent, P.white, 0.2), 1.2); stroke(ctx, [T(0.235, -0.04), T(0.37, -0.05)], mix(accent, P.obsidian, 0.3), 1.2); }
  if (acc === "earring") { solid(ctx, poly(T, [[-0.405, 0.16], [-0.375, 0.16], [-0.39, 0.25]]), mix(accent, P.white, 0.2), 255, 0.05); }
  if (acc === "beard") { solid(ctx, poly(T, [[-0.3, 0.12], [-0.28, 0.4], [-0.1, 0.54], [0.1, 0.54], [0.26, 0.4], [0.3, 0.12], [0.2, 0.3], [0.1, 0.35], [0, 0.32], [-0.1, 0.35], [-0.2, 0.3]]), mix(hairGrey, P.obsidian, 0.35)); stroke(ctx, poly(T, [[-0.2, 0.4], [-0.05, 0.5]]), hairLit, 1); stroke(ctx, poly(T, [[-0.1, 0.285], [0, 0.29], [0.1, 0.28]]), mix(P.red, skinDeep, 0.6), 1.6); }
  if (acc === "moustache") { solid(ctx, poly(T, [[-0.12, 0.22], [0, 0.2], [0.12, 0.22], [0.09, 0.26], [0, 0.245], [-0.09, 0.26]]), mix(hairGrey, P.obsidian, 0.35)); }
}
/** Portrait backdrop: dark blue ground, accent light raking from the left, painterly strokes. */
export function backdrop(ctx, accent) {
  const { brush, W, H, r } = ctx;
  for (let i = 0; i < 2; i++) wash(ctx, [[0, 0], [W, 0], [W, H], [0, H]], P.blue, 9, 0.8);
  wash(ctx, [[0, 0], [W * 0.6, 0], [W * 0.35, H], [0, H]], mix(accent, P.blue, 0.3), 30, 0.6);
  wash(ctx, [[W * 0.62, 0], [W, 0], [W, H], [W * 0.78, H]], P.obsidian, 60, 0.5);
  for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * H * 0.8; brush.set("charcoal", mix(r() < 0.5 ? P.blue : accent, P.obsidian, 0.75), 0.8 + r() * 1.5); brush.line(x, y, x + 40 + r() * 80, y + (r() - 0.5) * 20); }
  for (const pts of [[[0, 0], [W * 0.35, 0], [0, H * 0.35]], [[W, 0], [W * 0.65, 0], [W, H * 0.35]], [[0, H], [W * 0.25, H], [0, H * 0.7]], [[W, H], [W * 0.75, H], [W, H * 0.7]]]) wash(ctx, pts, P.obsidian, 45, 0.9); // soft corner vignette
}

/** Whole suspect portrait from a spec: same lighting, framing and face every time. spec = { seed, ...bust options }. */
export function portrait(brush, { W, H }, spec) {
  const { seed, ...o } = spec, c = begin(brush, W, H, seed);
  backdrop(c, o.accent ?? P.orange);
  bust(c, { cx: W / 2, cy: H * 0.4, s: H * 0.42, ...o });
  grain(c, 100);
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
