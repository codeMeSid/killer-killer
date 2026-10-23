// Suspect portraits, hollis-brandt-lighthouse-4s. Index = suspect order in case.json. Same face/light/expression for all; no hint of guilt.
import { portrait, P } from "../kit.mjs";
export const specs = [
  { file: "wren-doyle", seed: 101, tilt: -4, age: 0.5, skin: 0.2, hair: P.orange, hairStyle: "long", cloth: P.blue, collar: "high", accessory: "none", accent: P.orange },
  { file: "iris-venn", seed: 102, tilt: 2, age: 0.3, skin: 0.55, hair: P.blue, hairStyle: "swept", cloth: P.white, collar: "open", accessory: "glasses", accent: P.green },
  { file: "callum-pryce", seed: 103, tilt: 5, age: 0.6, skin: 0.5, hair: P.orange, hairStyle: "cap", cloth: P.orange, collar: "round", accessory: "beard", accent: P.blue },
  { file: "marta-quill", seed: 104, tilt: -2, age: 0.8, skin: 0.1, hair: P.white, hairStyle: "bun", cloth: P.green, collar: "suit", accessory: "glasses", accent: P.blue },
];
export default async function paint(brush, ctx) { portrait(brush, ctx, specs[window.__spec]); }
