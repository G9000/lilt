// node --test src/nextUp.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextUp, type ChapterProgress } from "./nextUp.ts";

const ch = (id: string, total: number, done = 0): ChapterProgress => ({ id, total, done });

test("nothing practised: the first chapter is up", () => {
  assert.equal(nextUp([ch("start", 4), ch("warmup", 10)]), "start");
  assert.equal(nextUp([]), null);
});

test("a skipped text never pins a chapter as next up", () => {
  // Three of Start here's four texts, one left out on purpose: Warm-ups is next.
  assert.equal(nextUp([ch("start", 4, 3), ch("warmup", 10), ch("pitch", 8)]), "warmup");
});

test("until about half is practised, you're still in that chapter", () => {
  assert.equal(nextUp([ch("start", 4, 4), ch("warmup", 10, 4), ch("pitch", 8)]), "warmup");
  assert.equal(nextUp([ch("start", 4, 4), ch("warmup", 10, 5), ch("pitch", 8)]), "pitch");
});

test("it follows where you left off, even after jumping ahead", () => {
  assert.equal(nextUp([ch("start", 4), ch("warmup", 10), ch("pitch", 8, 1)]), "pitch");
  assert.equal(nextUp([ch("start", 4), ch("warmup", 10), ch("pitch", 8, 6), ch("resonance", 13)]), "resonance");
});

test("past the last chapter there's nothing next", () => {
  assert.equal(nextUp([ch("start", 4, 4), ch("warmup", 10, 9)]), null);
});
