// node --test src/insight.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeTake, endDropSt, placePitch } from "./insight.ts";

const line = (hz: (i: number) => number, n = 100) => Array.from({ length: n }, (_, i) => ({ t: i / 50, hz: hz(i) }));

test("comfort comes first: above the range wins over everything", () => {
  const r = describeTake({ median: 260, spanSt: 2, band: [180, 230], pts: line((i) => (i < 80 ? 260 : 200)) });
  assert.match(r!.note, /above your comfortable range/);
});

test("an end drop is noticed", () => {
  const pts = line((i) => (i < 80 ? 200 : 160));
  assert.ok(endDropSt(pts)! > 3);
  assert.match(describeTake({ median: 200, spanSt: 5, band: [180, 230], pts })!.note, /lower towards the end/);
});

test("below the range, level, lively and steady", () => {
  assert.match(describeTake({ median: 150, spanSt: 5, band: [180, 230], pts: line(() => 150) })!.note, /below/);
  assert.match(describeTake({ median: 200, spanSt: 2, band: [180, 230], pts: line(() => 200) })!.note, /level/);
  assert.match(describeTake({ median: 200, spanSt: 12, band: [180, 230], pts: line(() => 200) })!.note, /movement/);
  assert.match(describeTake({ median: 200, spanSt: 5, band: [180, 230], pts: line(() => 200) })!.note, /comfortable range/);
  assert.match(describeTake({ median: 200, spanSt: 5, band: null, pts: line(() => 200) })!.note, /steady take/);
});

test("nothing to say without a pitch, or with too little voice", () => {
  assert.equal(describeTake({ median: null, spanSt: null, band: null, pts: [] }), null);
  assert.equal(endDropSt(line(() => 200, 10)), null);
});

const REF = { men_mean: 115, men_sd: 21, women_mean: 199, women_sd: 28, overlap_low: 145, overlap_high: 165 };

test("a pitch is placed in words and semitones, never a percentage", () => {
  assert.equal(placePitch(199, REF), "199 Hz sits within the average woman's range, right at the average woman's pitch.");
  assert.match(placePitch(172, REF), /^172 Hz sits within the average woman's range, about 2\.5 semitones below the average woman's pitch \(199 Hz\)/);
  assert.match(placePitch(155, REF), /in the overlap/);
  assert.match(placePitch(140, REF), /between the average man's and woman's ranges/);
  assert.match(placePitch(115, REF), /within the average man's range, about 9\.5 semitones below/);
  assert.match(placePitch(240, REF), /above the average woman's range, about 3 semitones above/);
  assert.doesNotMatch(placePitch(172, REF), /%/);
});
