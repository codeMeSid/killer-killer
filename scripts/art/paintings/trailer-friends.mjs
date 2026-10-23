// Trailer plate: eight silhouettes around a table in the dark, faces lit from below by phone glow. Anonymous; no hint of any case.
import { begin, wash, blob, glow, grain, vignette, P } from "../kit.mjs";

export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 4242);
  const { r } = c;
  const box = (y0, y1) => [[0, y0], [W, y0], [W, y1], [0, y1]];
  wash(c, box(0, H), P.blue, 10, 0.9);
  wash(c, box(0, H), P.obsidian, 75, 0.6);
  // back wall window light, faint
  wash(c, [[W * 0.42, H * 0.05], [W * 0.58, H * 0.05], [W * 0.57, H * 0.4], [W * 0.43, H * 0.4]], P.blue, 18, 0.6);
  const ty = H * 0.68;
  // eight figures, back row of 8 across, varied heights
  const cols = [P.green, P.blue, P.blue, P.green, P.blue, P.green, P.blue, P.blue];
  for (let i = 0; i < 8; i++) {
    const cx = W * (0.09 + i * 0.118) + (r() - 0.5) * 20, hr = H * (0.075 + r() * 0.012), hy = H * (0.36 + r() * 0.05 + (i % 2) * 0.03);
    const col = cols[i];
    // glow from phone on chest
    glow(c, cx, ty - H * 0.02, W * 0.15, col, 8, 8);
    // shoulders + torso: dark mass with blue rim
    const sh = [[cx - W * 0.062, ty + 20], [cx - W * 0.055, hy + hr * 1.7], [cx - hr * 0.5, hy + hr * 1.35], [cx + hr * 0.5, hy + hr * 1.35], [cx + W * 0.055, hy + hr * 1.7], [cx + W * 0.062, ty + 20]];
    wash(c, sh.map(([x, y]) => [x - 3, y - 3]), col, 28, 0.25);
    wash(c, sh, P.obsidian, 255, 0.1);
    // head
    wash(c, blob(c, cx, hy, hr * 0.78, hr, 0.07, 14).map(([x, y]) => [x - 3, y - 3]), col, 40, 0.2);
    wash(c, blob(c, cx, hy, hr * 0.78, hr, 0.07, 14), P.obsidian, 255, 0.1);
    // lit lower face (chin/cheek), no features
    wash(c, [[cx - hr * 0.55, hy + hr * 0.25], [cx + hr * 0.55, hy + hr * 0.25], [cx + hr * 0.4, hy + hr * 0.9], [cx - hr * 0.4, hy + hr * 0.9]], col, 70, 0.35);
    wash(c, [[cx - hr * 0.4, hy + hr * 0.5], [cx + hr * 0.4, hy + hr * 0.5], [cx + hr * 0.3, hy + hr * 0.75], [cx - hr * 0.3, hy + hr * 0.75]], P.white, 60, 0.3);
    // phone slab on table
    wash(c, [[cx - 38, ty + 14], [cx + 38, ty + 14], [cx + 30, ty + 52], [cx - 30, ty + 52]], col, 200, 0.1);
    glow(c, cx, ty + 30, 150, col, 6, 22);
  }
  // table top: dark with edge light and reflections
  wash(c, box(ty + 50, H), P.obsidian, 255, 0.1);
  wash(c, [[0, ty + 52], [W, ty + 52], [W, ty + 60], [0, ty + 60]], P.blue, 90, 0.3);
  for (let i = 0; i < 40; i++) { const x = r() * W, y = ty + 70 + r() * (H - ty - 80); brush.set("HB", r() < 0.5 ? P.blue : P.green, 0.2 + r() * 0.3); brush.line(x, y, x + 60 + r() * 120, y + (r() - 0.5) * 6); }
  // centre case-file folder, dim
  wash(c, [[W * 0.43, ty + 110], [W * 0.57, ty + 110], [W * 0.59, ty + 190], [W * 0.41, ty + 190]], P.orange, 40, 0.3);
  grain(c, 1500);
  vignette(c);
}
