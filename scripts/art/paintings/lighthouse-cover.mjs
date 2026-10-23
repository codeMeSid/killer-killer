// Cover for hollis-brandt-lighthouse-4s: lighthouse on a rock at night, lamp beam sweeping across fog. Title-free; no figure, no hint of the killer.
// Built from washes only (value masses), no outlines.
import { begin, wash, blob, stars, glow, beam, grain, vignette, P } from "../kit.mjs";

export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 1013);
  const { r } = c;
  const hz = H * 0.63, tx = W * 0.667, base = H * 0.69, top = H * 0.22, bw = W * 0.062, tw = W * 0.038, g = top + H * 0.1;
  const lx = tx, ly = top + H * 0.045;
  const box = (y0, y1) => [[0, y0], [W, y0], [W, y1], [0, y1]];

  // Distant sky: deep blue washes stacked, darkest at top.
  for (let i = 0; i < 3; i++) wash(c, box(0, hz * (0.6 + i * 0.2)), P.blue, 18, 0.9);
  wash(c, box(0, hz * 0.45), P.obsidian, 80, 0.6);
  wash(c, box(hz * 0.55, hz), P.orange, 8, 0.8); // faint warm horizon haze
  stars(c, 60, hz * 0.5);
  // Moon: soft disc, upper left third.
  const mx = W * 0.16, my = H * 0.11;
  glow(c, mx, my, W * 0.16, P.white, 9, 6);
  brush.noStroke(); brush.fill(P.white, 235); brush.fillBleed(0.25, "out"); brush.circle(mx, my, W * 0.05);
  wash(c, blob(c, mx + W * 0.012, my - H * 0.005, W * 0.012, W * 0.012, 0.3, 10), P.blue, 40, 0.2); // maria

  // Beam: wide soft cone sweeping left over the fog, plus a short faint back beam.
  beam(c, lx, ly, -W * 0.05, ly + H * 0.12, H * 0.13, P.orange, 60);
  beam(c, lx, ly, -W * 0.05, ly + H * 0.12, H * 0.055, P.white, 45);
  beam(c, lx, ly, W * 1.05, ly + H * 0.08, H * 0.05, P.orange, 22);
  glow(c, lx, ly, W * 0.14, P.orange, 12, 16);
  glow(c, lx, ly, W * 0.04, P.white, 6, 30);

  // Fog: rolling banks in front of the beam, lit orange where the beam crosses them.
  for (let i = 0; i < 9; i++) {
    const y = hz - H * 0.17 + i * H * 0.025, x = r() * W;
    wash(c, blob(c, x, y, W * (0.25 + r() * 0.25), H * 0.035, 0.25, 22), i % 3 === 0 ? P.white : P.blue, 12, 0.7);
    if (x < tx) wash(c, blob(c, x * 0.8, y, W * 0.18, H * 0.02, 0.25, 16), P.orange, 8, 0.7);
  }

  // Sea: dark body, then wave crests that catch the beam.
  wash(c, box(hz, H), P.blue, 12, 0.7);
  wash(c, box(hz, H), P.obsidian, 70, 0.5);
  wash(c, box(hz, hz + H * 0.03), P.white, 16, 0.5); // horizon glow
  for (let i = 0; i < 90; i++) {
    const t = i / 90, y = hz + 4 + (H - hz) * t * t, len = 30 + 200 * t, x = r() * W;
    const lit = Math.abs(x + len / 2 - tx) < W * (0.03 + 0.12 * t);
    brush.set("HB", lit ? P.orange : r() < 0.3 ? P.white : P.blue, 0.2 + 0.5 * t);
    brush.line(x, y + r() * 5, x + len, y + (r() - 0.5) * 5);
  }
  // Lamp reflection: blue-green shimmer column under the lamp.
  for (let i = 0; i < 40; i++) { const y = hz + 6 + i * ((H - hz) / 42), wd = 6 + i * 1.5; wash(c, [[tx - wd, y], [tx + wd, y], [tx + wd * 0.8, y + 4], [tx - wd * 0.8, y + 4]], i % 4 === 0 ? P.green : P.orange, 18, 0.1); }

  // Tower: lit body, shadowed right, red bands, gallery, lamp room.
  const body = [[tx - bw, base], [tx - tw, g], [tx + tw, g], [tx + bw, base]];
  wash(c, body, P.white, 85, 0.12);
  wash(c, [[tx + 0.1 * bw, base], [tx + 0.1 * tw, g], [tx + tw, g], [tx + bw, base]], P.blue, 70, 0.15);
  wash(c, [[tx + 0.5 * bw, base], [tx + 0.5 * tw, g], [tx + tw, g], [tx + bw, base]], P.obsidian, 90, 0.12);
  const y_ = (t) => base - (base - g) * t, hw_ = (t) => bw + (tw - bw) * t;
  for (const [t0, t1] of [[0.12, 0.3], [0.45, 0.62], [0.78, 0.94]]) wash(c, [[tx - hw_(t0), y_(t0)], [tx - hw_(t1), y_(t1)], [tx + hw_(t1), y_(t1)], [tx + hw_(t0), y_(t0)]], P.red, 150, 0.1);
  wash(c, [[tx - bw * 0.25, base], [tx - bw * 0.25, base - H * 0.07], [tx + bw * 0.25, base - H * 0.07], [tx + bw * 0.25, base]], P.obsidian, 100, 0.05);
  wash(c, [[tx - tw * 0.3, y_(0.55) - H * 0.03], [tx + tw * 0.3, y_(0.55) - H * 0.03], [tx + tw * 0.3, y_(0.55) + H * 0.02], [tx - tw * 0.3, y_(0.55) + H * 0.02]], P.obsidian, 100, 0.05);
  wash(c, [[tx - tw * 1.6, g], [tx + tw * 1.6, g], [tx + tw * 1.5, g - H * 0.025], [tx - tw * 1.5, g - H * 0.025]], P.white, 80, 0.1); // gallery
  wash(c, [[tx - tw * 0.85, g - H * 0.025], [tx + tw * 0.85, g - H * 0.025], [tx + tw * 0.85, ly - H * 0.03], [tx - tw * 0.85, ly - H * 0.03]], P.orange, 255, 0.12); // lamp
  wash(c, [[tx - tw * 0.35, g - H * 0.04], [tx + tw * 0.35, g - H * 0.04], [tx + tw * 0.35, ly - H * 0.015], [tx - tw * 0.35, ly - H * 0.015]], P.white, 255, 0.1);
  wash(c, [[tx - tw * 1.1, ly - H * 0.03], [tx, ly - H * 0.085], [tx + tw * 1.1, ly - H * 0.03]], P.obsidian, 120, 0.1); // roof
  wash(c, [[tx - tw * 1.1, ly - H * 0.03], [tx, ly - H * 0.085], [tx + tw * 0.2, ly - H * 0.03]], P.blue, 50, 0.1);

  glow(c, lx, ly, W * 0.05, P.white, 6, 40); // lamp core, over the tower
  // Foreground rock: dark silhouette with orange rim light where the lamp reaches it.
  const rock = [[tx - W * 0.3, H * 1.02], [tx - W * 0.2, base + H * 0.07], [tx - W * 0.1, base + H * 0.015], [tx - W * 0.03, base - H * 0.005], [tx + W * 0.03, base + H * 0.01], [tx + W * 0.12, base - H * 0.01], [tx + W * 0.2, base + H * 0.07], [tx + W * 0.32, H * 1.02]];
  wash(c, rock, P.obsidian, 255, 0.15);
  wash(c, rock.map(([x, y]) => [x, y + H * 0.015]), P.blue, 30, 0.2);
  wash(c, [[tx - W * 0.1, base + H * 0.015], [tx - W * 0.03, base - H * 0.005], [tx + W * 0.03, base + H * 0.01], [tx + W * 0.0, base + H * 0.03], [tx - W * 0.08, base + H * 0.04]], P.orange, 70, 0.2);
  wash(c, [[tx + W * 0.03, base + H * 0.01], [tx + W * 0.12, base - H * 0.01], [tx + W * 0.14, base + H * 0.01], [tx + W * 0.05, base + H * 0.03]], P.blue, 70, 0.2);
  wash(c, [[tx - W * 0.2, base + H * 0.075], [tx - W * 0.1, base + H * 0.02], [tx - W * 0.03, base], [tx + W * 0.03, base + H * 0.015], [tx + W * 0.12, base - H * 0.005], [tx + W * 0.19, base + H * 0.075], [tx + W * 0.1, base + H * 0.05], [tx - W * 0.1, base + H * 0.055]], P.blue, 110, 0.2); // ridge light
  // Spray at the rock foot.
  for (let i = 0; i < 40; i++) { brush.set("rotring", P.white, 0.3 + r() * 0.6); const x = tx + (r() - 0.5) * W * 0.4, y = base + H * (0.06 + r() * 0.05); brush.circle(x, y, 1 + r() * 2); }

  grain(c);
  vignette(c);
}
