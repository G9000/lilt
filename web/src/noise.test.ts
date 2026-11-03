// node --test src/noise.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { db, judgeRoom, NOISY_GAP_DB } from "./noise.ts";

const at = (dbfs: number) => 10 ** (dbfs / 20);
const frames = (n: number, level: (i: number) => number) => Array.from({ length: n }, (_, i) => at(level(i)));
// Speech: syllables at −20 dBFS with gaps back down to the room between them.
const speech = (room: number, n = 120) => frames(n, (i) => (i % 10 < 6 ? -20 : room));

test("a quiet room and a clear voice: not noisy", () => {
  const r = judgeRoom(frames(60, () => -60), speech(-60))!;
  assert.equal(r.noisy, false);
  assert.ok(Math.abs(r.floorDb + 60) < 0.01 && Math.abs(r.voiceDb + 20) < 0.01);
  assert.ok(r.gapDb > 35);
});

test("a fan close to your voice: noisy", () => {
  const r = judgeRoom(frames(60, () => -32), speech(-32))!;
  assert.equal(r.noisy, true);
  assert.ok(r.gapDb < NOISY_GAP_DB);
});

test("the line sits at a tenth of your voice's loudness", () => {
  assert.equal(judgeRoom(frames(60, () => -41), speech(-41))!.noisy, false);
  assert.equal(judgeRoom(frames(60, () => -39), speech(-39))!.noisy, true);
});

test("nothing to say until there's been a quiet moment and a voice", () => {
  assert.equal(judgeRoom(frames(10, () => -60), speech(-60)), null);
  assert.equal(judgeRoom(frames(60, () => -60), []), null);
  assert.equal(judgeRoom(frames(60, () => -60), frames(120, () => -60)), null); // a silent, quiet room
  assert.equal(judgeRoom(frames(60, () => -60), frames(5, () => -20)), null); // one blip isn't a voice
});

test("a cough or a word in the quiet moment doesn't make the room noisy", () => {
  const quiet = frames(60, (i) => (i > 48 ? -15 : -58));
  assert.equal(judgeRoom(quiet, speech(-58))!.noisy, false);
});

test("a room as loud as the voice is noisy even when you've said nothing", () => {
  // Over the "heard" level the room passes for a voice; the gap is near nothing, so it reads as noisy.
  assert.equal(judgeRoom(frames(60, () => -30), frames(60, () => -30))!.noisy, true);
});

test("levels in decibels", () => {
  assert.equal(db(1), 0);
  assert.ok(Math.abs(db(0.1) + 20) < 1e-9);
  assert.ok(Number.isFinite(db(0)));
});
