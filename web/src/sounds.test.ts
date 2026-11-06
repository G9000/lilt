// node --test src/sounds.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mayPlay, readSounds } from "./sounds.ts";

test("sounds are off until you turn them on", () => {
  for (const raw of [null, "", "off", "true", "1", "ON"]) assert.equal(readSounds(raw), false);
  assert.equal(readSounds("on"), true);
});

test("a sound never plays while the microphone listens, or in a tab you can't see", () => {
  assert.equal(mayPlay(true, false, false), true);
  assert.equal(mayPlay(true, true, false), false);
  assert.equal(mayPlay(true, false, true), false);
  assert.equal(mayPlay(false, false, false), false);
});
