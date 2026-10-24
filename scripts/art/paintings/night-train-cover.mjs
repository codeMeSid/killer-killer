// Cover for ansel-corbin-night-train-5s: night sleeper crossing a viaduct in rain, lit windows, headlamp. Title-free; no figure, no hint of the killer.
import { begin, wash, blob, stars, glow, grain, vignette, P } from "../kit.mjs";

export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 2207);
  const { r } = c;
  const deck = H * 0.64, top = H * 0.4;
  const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  // Sky: stacked blue washes, dark at top, faint warm haze low; rain cloud banks.
  for (let i = 0; i < 3; i++) wash(c, box(0, 0, W, deck * (0.6 + i * 0.2)), P.blue, 18, 0.9);
  wash(c, box(0, 0, W, deck * 0.5), P.obsidian, 80, 0.6);
  wash(c, box(0, deck * 0.6, W, deck), P.orange, 8, 0.8);
  stars(c, 25, deck * 0.3);
  for (let i = 0; i < 6; i++) wash(c, blob(c, r() * W, H * (0.08 + i * 0.07), W * 0.3, H * 0.03, 0.25, 20), i % 2 ? P.white : P.blue, 10, 0.7);

  // Viaduct: arches below the deck, obsidian piers with blue rim light.
  wash(c, box(0, deck, W, H), P.obsidian, 255, 0.1);
  const n = 6, aw = W / n;
  for (let i = 0; i < n; i++) {
    const x0 = i * aw + aw * 0.12, x1 = (i + 1) * aw - aw * 0.12, ay = deck + H * 0.07;
    const arch = [[x0, H], [x0, ay + H * 0.08], [x0 + aw * 0.1, ay + H * 0.01], [(x0 + x1) / 2, ay - H * 0.03], [x1 - aw * 0.1, ay + H * 0.01], [x1, ay + H * 0.08], [x1, H]];
    wash(c, arch, P.blue, 70, 0.15);
    wash(c, arch.map(([x, y]) => [x + 6, y + 8]), P.obsidian, 255, 0.1);
  }
  wash(c, box(0, deck, W, deck + H * 0.06), P.blue, 25, 0.2); // deck parapet
  wash(c, box(0, deck, W, deck + H * 0.012), P.white, 40, 0.2); // rail edge light
  // Mist rising from the valley.
  for (let i = 0; i < 5; i++) wash(c, blob(c, r() * W, H * (0.82 + r() * 0.12), W * 0.3, H * 0.03, 0.25, 20), P.blue, 5, 0.7);

  // Train, right to left: engine at right, headlamp beam; sleeper cars with lit windows.
  const bt = top + H * 0.08, bb = deck - H * 0.005;
  const car = (x0, x1) => {
    wash(c, box(x0, bt, x1, bb), P.blue, 110, 0.12);
    wash(c, box(x0, bt + (bb - bt) * 0.55, x1, bb), P.obsidian, 140, 0.1);
    wash(c, box(x0, bt, x1, bt + H * 0.012), P.white, 50, 0.15); // roof highlight
    wash(c, box(x0, bt + (bb - bt) * 0.68, x1, bt + (bb - bt) * 0.74), P.red, 100, 0.1); // livery stripe
    const k = 6, ww = (x1 - x0) / k;
    for (let j = 0; j < k; j++) {
      const wx = x0 + j * ww + ww * 0.2, wy = bt + (bb - bt) * 0.2, wh = (bb - bt) * 0.28;
      const dark = r() < 0.3;
      const col = dark ? P.blue : r() < 0.5 ? P.orange : P.white;
      glow(c, wx + ww * 0.3, wy + wh / 2, ww * 0.7, col, 4, dark ? 3 : 8);
      wash(c, box(wx, wy, wx + ww * 0.6, wy + wh), col, dark ? 90 : 230, 0.08);
    }
  };
  const gap = W * 0.01;
  let x = W * 0.02;
  const lens = [0.2, 0.2, 0.2];
  for (const l of lens) { car(x, x + W * l); x += W * l + gap; }
  // Engine
  const ex0 = x, ex1 = W * 0.95;
  wash(c, [[ex0, bb], [ex0, bt + H * 0.03], [ex1 - W * 0.04, bt + H * 0.03], [ex1, bt + H * 0.1], [ex1, bb]], P.blue, 80, 0.12);
  wash(c, [[ex0, bb], [ex0, bt + (bb - bt) * 0.6], [ex1, bt + (bb - bt) * 0.6], [ex1, bb]], P.obsidian, 180, 0.1);
  wash(c, box(ex0 + W * 0.01, bt + H * 0.03, ex0 + W * 0.04, bt + H * 0.075), P.orange, 220, 0.1);
  // Headlamp: hard glow at the nose, beam running ahead into the rain.
  const hx = ex1 - W * 0.005, hy = bt + H * 0.14;
  glow(c, hx, hy, W * 0.16, P.white, 10, 10);
  glow(c, hx, hy, W * 0.04, P.white, 6, 40);
  wash(c, [[hx, hy - H * 0.01], [W * 1.05, hy - H * 0.07], [W * 1.05, hy + H * 0.05], [hx, hy + H * 0.01]], P.white, 28, 0.8);
  // Tail lamp on the last car end.
  glow(c, W * 0.02, bt + H * 0.2, W * 0.04, P.red, 6, 28);

  // Platform-style lamps on posts along the deck, in front of train.
  for (const lx of [W * 0.04, W * 0.38, W * 0.7]) {
    const ly = deck - H * 0.3;
    wash(c, box(lx - 2, ly, lx + 2, deck + H * 0.02), P.obsidian, 255, 0.05);
    glow(c, lx, ly, W * 0.07, P.orange, 10, 12);
    glow(c, lx, ly, W * 0.015, P.white, 5, 45);
  }

  // Rain: slanted streaks, denser and brighter in front of the lamps; light puddle shimmer on the deck.
  for (let i = 0; i < 380; i++) {
    const rx = r() * W * 1.1, ry = r() * H, len = 14 + r() * 26;
    brush.set("HB", r() < 0.25 ? P.white : P.blue, 0.15 + r() * 0.35);
    brush.line(rx, ry, rx - len * 0.3, ry + len);
  }
  for (let i = 0; i < 40; i++) { brush.set("HB", i % 4 === 0 ? P.orange : P.blue, 0.4); const y = deck + H * 0.015 + r() * H * 0.03, px = r() * W; brush.line(px, y, px + 20 + r() * 60, y); }

  grain(c);
  vignette(c);
}
