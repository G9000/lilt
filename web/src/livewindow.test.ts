import assert from "node:assert/strict";
import { test } from "node:test";
import { hzToMidi } from "./pitch.ts";
import { slide, START, startWindow, STEP_ST, type Window } from "./livewindow.ts";

const held = (hz: number, n = 30) => Array<number | null>(n).fill(hz);
const span = (w: Window) => hzToMidi(w[1]) - hzToMidi(w[0]);

test("a voice in the middle leaves the window alone", () => {
  assert.equal(slide(START, held(180)), START);
  assert.equal(slide(START, held(110)), START);
});

test("a voice settled near the top slides it up half an octave, keeping its size", () => {
  const w = slide(START, held(398));
  assert.ok(Math.abs(hzToMidi(w[1]) - hzToMidi(START[1]) - STEP_ST) < 1e-9);
  assert.ok(Math.abs(span(w) - span(START)) < 1e-9);
  assert.ok(w[1] > 398 * 1.3, "with room above the voice");
  assert.equal(slide(w, held(398)), w, "and it stays put once the voice is clear of the edge");
});

test("above the old ceiling it keeps sliding until the voice is inside", () => {
  let w = START;
  for (let i = 0; i < 6; i++) w = slide(w, held(520));
  assert.ok(w[0] < 520 && w[1] > 520 * 1.18);
});

test("a low voice slides it down, and it stops at the lowest the tracker hears", () => {
  let w = START;
  for (let i = 0; i < 6; i++) w = slide(w, held(62));
  assert.ok(w[0] >= 54.5 && w[0] < START[0]);
});

test("a blip, an octave slip or silence doesn't move it", () => {
  assert.equal(slide(START, [...held(180, 26), 390, 392, 395, 398]), START);
  assert.equal(slide(START, held(398, 5)), START);
  assert.equal(slide(START, Array<number | null>(40).fill(null)), START);
});

test("it comes back when the voice settles lower again", () => {
  const up = slide(START, held(398));
  const back = slide(up, held(120));
  assert.ok(Math.abs(back[0] - START[0]) < 0.01);
});

test("it opens around your comfortable range", () => {
  assert.equal(startWindow(null), START);
  assert.equal(startWindow([110, 220]), START);
  const high = startWindow([300, 480]);
  assert.ok(high[1] > 480 && high[0] < 300 && high[0] > START[0]);
});
