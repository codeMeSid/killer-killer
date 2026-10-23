// Square portrait test for the shared bust kit. Not a case asset.
import { begin, wash, bust, grain, vignette, blob, P } from "../kit.mjs";
export default async function paint(brush, { W, H }) {
  const c = begin(brush, W, H, 7);
  for (let i = 0; i < 4; i++) wash(c, [[0, 0], [W, 0], [W, H], [0, H]], P.blue, 10, 0.8);
  bust(c, { cx: W / 2, cy: H * 0.38, s: H * 0.5, skin: P.white, hair: P.orange, hairStyle: "bun", cloth: P.red, accessory: "glasses", accent: P.green });
  grain(c, 120);
  vignette(c);
}
