// Trailer plate: top-down case-file desk, scattered cards/photos/map under a warm lamp. Fictional, no killer hint.
import { begin, wash, blob, glow, grain, vignette, hatchRect, P } from "../kit.mjs";

export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 7731);
  const { r } = c;
  const box = [[0, 0], [W, 0], [W, H], [0, H]];
  wash(c, box, P.blue, 10, 0.9);
  wash(c, box, P.obsidian, 70, 0.6);
  // wood grain
  for (let i = 0; i < 70; i++) { const y = r() * H; brush.set("HB", r() < 0.5 ? P.orange : P.blue, 0.2 + r() * 0.4); brush.line(r() * W * 0.3, y, W * (0.4 + r() * 0.6), y + (r() - 0.5) * 30); }
  glow(c, W * 0.34, H * 0.3, W * 0.9, P.orange, 12, 9);
  const card = (cx, cy, w, h, a, col, al) => {
    const ca = Math.cos(a), sa = Math.sin(a), pt = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
    const hw = w / 2, hh = h / 2;
    wash(c, [pt(-hw + 10, -hh + 12), pt(hw + 10, -hh + 12), pt(hw + 10, hh + 12), pt(-hw + 10, hh + 12)], P.obsidian, 200, 0.1); // shadow
    wash(c, [pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)], col, al, 0.2);
    brush.set("2B", P.white, 0.5);
    for (let k = 0; k < Math.floor(h / 30); k++) { const a0 = pt(-hw + 20, -hh + 24 + k * 22), a1 = pt(-hw + 20 + (w - 60) * (0.5 + r() * 0.5), -hh + 24 + k * 22); brush.line(a0[0], a0[1], a1[0], a1[1]); }
  };
  for (let i = 0; i < 16; i++) {
    const cx = W * (0.08 + r() * 0.84), cy = H * (0.1 + r() * 0.8), a = (r() - 0.5) * 1.1;
    const lit = Math.hypot(cx - W * 0.34, cy - H * 0.3) / W;
    card(cx, cy, 260 + r() * 220, 170 + r() * 150, a, i % 5 === 0 ? P.orange : P.white, 38 - lit * 20);
  }
  // photographs: dark with a pale figure silhouette
  for (let i = 0; i < 4; i++) {
    const cx = W * (0.15 + r() * 0.7), cy = H * (0.2 + r() * 0.6), a = (r() - 0.5) * 0.8;
    card(cx, cy, 230, 270, a, P.white, 30);
    wash(c, blob(c, cx, cy, 70, 90, 0.2, 10), P.blue, 70, 0.4);
  }
  // evidence tags, red
  for (let i = 0; i < 4; i++) wash(c, blob(c, W * (0.1 + r() * 0.8), H * (0.1 + r() * 0.8), 28, 18, 0.2, 8), P.red, 120, 0.2);
  // coffee ring + pins
  brush.noFill(); brush.set("rotring", P.orange, 1.2); brush.circle(W * 0.72, H * 0.76, 120);
  for (let i = 0; i < 6; i++) glow(c, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), 26, P.red, 4, 40);
  grain(c, 1500);
  vignette(c);
  wash(c, [[0, 0], [W * 0.2, 0], [0, H * 0.3]], P.obsidian, 90, 0.5);
  wash(c, [[W, H], [W * 0.75, H], [W, H * 0.6]], P.obsidian, 90, 0.5);
}
