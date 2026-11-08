// node --test src/refnotes.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceNotes } from "./refnotes.ts";

const REF = { men_mean: 115, men_sd: 21, women_mean: 199, women_sd: 28, overlap_low: 145, overlap_high: 165 };

test("reference notes follow your direction, low to high, on whole notes", () => {
  assert.deepEqual(referenceNotes(REF, "higher").map((n) => n.name), ["E3", "G3", "A♯3"]);
  assert.deepEqual(referenceNotes(REF, "lower").map((n) => n.name), ["F♯2", "A♯2", "D3"]);
  assert.deepEqual(referenceNotes(REF, "open").map((n) => n.name), ["A♯2", "D♯3", "G3"]);
  for (const d of ["higher", "lower", "open"] as const) {
    const hz = referenceNotes(REF, d).map((n) => n.hz);
    assert.ok(hz[0] < hz[1] && hz[1] < hz[2], d);
    for (const h of hz) assert.ok(Math.abs(12 * Math.log2(h / 440) - Math.round(12 * Math.log2(h / 440))) < 1e-9, "on a note");
  }
});

test("each note says where it comes from, and none calls itself a target", () => {
  for (const d of ["higher", "lower", "open"] as const) for (const n of referenceNotes(REF, d)) {
    assert.match(n.about, /average|overlap/);
    assert.doesNotMatch(n.about, /target|goal|should/);
  }
});
