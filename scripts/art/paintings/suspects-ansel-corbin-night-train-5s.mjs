// Suspect portraits, ansel-corbin-night-train-5s. Index = suspect order in case.json. Same face/light/expression for all; no hint of guilt.
import { portrait, P } from "../kit.mjs";
export const specs = [
  { file: "tilda-reeve", seed: 201, tilt: -5, age: 0.45, skin: 0.4, hair: P.blue, hairStyle: "cap", cloth: P.blue, collar: "round", accessory: "none", accent: P.blue },
  { file: "dr-osric-pell", seed: 202, tilt: 1, age: 0.7, skin: 0.1, hair: P.white, hairStyle: "swept", cloth: P.white, collar: "suit", accessory: "glasses", accent: P.green },
  { file: "ivo-sandre", seed: 203, tilt: 3, age: 0.5, skin: 0.6, hair: P.blue, hairStyle: "cap", cloth: P.blue, collar: "suit", accessory: "moustache", accent: P.orange },
  { file: "calla-wren", seed: 204, tilt: -3, age: 0.35, skin: 0.15, hair: P.orange, hairStyle: "long", cloth: P.green, collar: "open", accessory: "earring", accent: P.green },
  { file: "bram-okafor", seed: 205, tilt: 4, age: 0.85, skin: 0.85, hair: P.white, hairStyle: "bald", cloth: P.orange, collar: "round", accessory: "beard", accent: P.orange },
];
export default async function paint(brush, ctx) { portrait(brush, ctx, specs[window.__spec]); }
