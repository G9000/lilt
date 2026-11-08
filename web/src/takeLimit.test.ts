// node --test src/takeLimit.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cappedNote, limitNote, TAKE_MAX_S } from "./takeLimit.ts";

test("the two-minute stop is said in the last seconds and after, never earlier", () => {
  assert.equal(TAKE_MAX_S, 120);
  assert.equal(limitNote(30), null);
  assert.equal(limitNote(104.5), null);
  assert.equal(limitNote(105.2), "Stops at 2:00 · 15 s left");
  assert.equal(limitNote(119.6), "Stops at 2:00 · 1 s left");
  assert.equal(limitNote(121), "Stops at 2:00 · 0 s left");
  assert.equal(limitNote(80, 90), "Stops at 1:30 · 10 s left");
  assert.equal(cappedNote(), "Stopped at 2:00 and saved. Record again to carry on.");
});
