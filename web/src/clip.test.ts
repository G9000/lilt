// node --test src/clip.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIP_MAX_S, clipBounds, clipTime, clipUrl } from "./clip.ts";

test("a clip stays inside the take, at least half a second long, and at most five minutes", () => {
  assert.deepEqual(clipBounds(0, 12, 12), [0, 12]);
  assert.deepEqual(clipBounds(-3, 99, 12), [0, 12], "clamped to the take");
  assert.deepEqual(clipBounds(5, 5, 12), [5, 5.5], "too short: the end moves past the start");
  assert.deepEqual(clipBounds(11.9, 12, 12), [11.5, 12], "near the end: the start moves back");
  assert.deepEqual(clipBounds(10, 600, 900), [10, 10 + CLIP_MAX_S], "too long: the end comes in");
  assert.deepEqual(clipBounds(2, 4.04, 12), [2, 4], "tenths of a second");
  assert.deepEqual(clipBounds(0, 5, 0), [0, 0], "no length yet");
});

test("the clip address and times read plainly", () => {
  assert.equal(clipUrl("t_1 2", 1.25, 8), "/api/takes/t_1%202/clip?start=1.3&end=8.0");
  assert.equal(clipTime(7.4), "0:07");
  assert.equal(clipTime(65), "1:05");
  assert.equal(clipTime(-1), "0:00");
});
