import { test } from "node:test";
import assert from "node:assert/strict";
import { judge, validateGuess } from "./judge.ts";
import { score } from "./score.ts";
import { ApiError } from "../api-error.ts";
import type { CaseFile, Solution } from "../../mysteries/types.ts";

const sol = (killers: number[]): Solution => ({
  schema: "mm-case-solution/1", killers, motive: "m1", method: "h1", story: [], deductions: [], herrings: [],
});
const g = (who: number[], motive = "m1", method = "h1") => ({ who, motive, method });

test("judge", () => {
  assert.equal(judge(sol([1, 2]), g([1, 2])), true);
  assert.equal(judge(sol([1, 2]), g([1])), false);
  assert.equal(judge(sol([1, 2]), g([2, 1])), true);
  assert.equal(judge(sol([]), g([])), true);
  assert.equal(judge(sol([]), g([0])), false);
  assert.equal(judge(sol([1]), g([1], "m2")), false);
  assert.equal(judge(sol([1]), g([1], "m1", "h2")), false);
});

test("score", () => {
  assert.equal(score("easy", 1, 0), 200);
  assert.equal(score("hard", 2, 7200), 180);
  assert.equal(score("medium", 1, 10000), 200);
});

const c = {
  suspects: [{}, {}, {}], motives: [{ id: "m1" }, { id: "m2" }], methods: [{ id: "h1" }, { id: "h2" }],
} as unknown as CaseFile;

function rejects(raw: unknown, msg: string) {
  assert.throws(() => validateGuess(c, raw), (e) => e instanceof ApiError && e.status === 400 && e.message === msg);
}

test("validateGuess", () => {
  assert.deepEqual(validateGuess(c, { who: [2, 0], nobody: false, motive: "m1", method: "h2" }), g([2, 0], "m1", "h2"));
  assert.deepEqual(validateGuess(c, { who: [], nobody: true, motive: "m2", method: "h1" }), g([], "m2", "h1"));
  rejects({ who: [], nobody: false, motive: "m1", method: "h1" }, "Pick who did it");
  rejects({ who: [0], nobody: false, motive: "", method: "h1" }, "Pick why");
  rejects({ who: [0], nobody: false, motive: "m1" }, "Pick how");
  rejects({ who: [3], nobody: false, motive: "m1", method: "h1" }, "That isn't in the file");
  rejects({ who: [-1], nobody: false, motive: "m1", method: "h1" }, "That isn't in the file");
  rejects({ who: [0], nobody: false, motive: "m9", method: "h1" }, "That isn't in the file");
  rejects({ who: [0], nobody: false, motive: "m1", method: "h9" }, "That isn't in the file");
  rejects({ who: [0], nobody: true, motive: "m1", method: "h1" }, "That isn't in the file");
});
