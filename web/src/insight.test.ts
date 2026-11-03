// node --test src/insight.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeRangeShare, describeResonance, describeTake, endDropSt, placePitch, shareInRange, takeStyle } from "./insight.ts";

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

test("no suggestion when the measurement is shaky", () => {
  const ok = { median: 200, spanSt: 5, band: [180, 230] as [number, number], pts: line(() => 200) };
  // 0.6 s of pitch in a 2 s take (every third frame): too little to describe
  assert.equal(describeTake({ ...ok, pts: line((i) => (i % 3 === 0 ? 200 : null) as number) }), null);
  assert.equal(describeTake({ ...ok, flags: ["clipping"] }), null);
  assert.ok(describeTake({ ...ok, flags: [] }));
});

test("a level pitch is praised on a hum, nudged in speech, and hedged when unknown", () => {
  const level = { median: 200, spanSt: 1.6, band: [180, 230] as [number, number], pts: line(() => 200) };
  assert.match(describeTake({ ...level, style: "steady" })!.note, /what this one asks for/);
  assert.match(describeTake({ ...level, style: "speech" })!.cue, /^Let it rise and fall/);
  assert.match(describeTake({ ...level })!.cue, /hum or a held note/);
  assert.match(describeTake({ ...level, spanSt: 12, style: "steady" })!.note, /steady exercise/);
});

test("the card says what it asks for", () => {
  const card = (kind: string, text_kind: string, front = "") => ({ kind, text_kind, front });
  assert.equal(takeStyle(card("text", "hum", "mmmmmmm")), "steady");
  assert.equal(takeStyle(card("reference", "automatic")), "speech");
  assert.equal(takeStyle(card("text", "passage")), "speech");
  assert.equal(takeStyle(card("exercise", "phrases", "Hum forward, then say: mmmee")), "explore");
  assert.equal(takeStyle(card("exercise", "phrases", "Black coffee, please.")), "speech");
  assert.equal(takeStyle(null), null);
});

test("glides and mixed hum-to-speech tasks do not ask for a level pitch", () => {
  for (const front of ["mmm ↗ ↘", "ooo ↗ ↘", "haaah ↘", "mmm… hello, how are you?", "One, two, three, four, five."]) {
    const style = takeStyle({ kind: "text", text_kind: "hum", front });
    assert.equal(style, "explore", front);
    const result = describeTake({ median: 200, spanSt: 12, band: [180, 230], pts: line((i) => i < 80 ? 220 : 150), style });
    assert.doesNotMatch(result!.cue, /stay there|last few words|smooth out|rise and fall/);
  }
});

test("a falling ending does not diagnose lost brightness or vocal weight", () => {
  const result = describeTake({ median: 200, spanSt: 5, band: null, pts: line((i) => i < 80 ? 200 : 160), style: "speech" });
  assert.match(result!.cue, /natural/);
  assert.doesNotMatch(result!.cue, /light and bright/);
});

const REF = { men_mean: 115, men_sd: 21, women_mean: 199, women_sd: 28, overlap_low: 145, overlap_high: 165 };

test("a pitch is placed in words and semitones, never a percentage", () => {
  assert.match(placePitch(199, REF), /^199 Hz sits within the average woman's range, about 3 semitones above the overlap \(165 Hz\)\.$/);
  assert.match(placePitch(172, REF), /^172 Hz sits within the average woman's range, about 0\.5 semitones above the overlap/);
  assert.equal(placePitch(155, REF), "155 Hz sits in the overlap, where pitch alone can be heard either way.");
  assert.match(placePitch(140, REF), /between the average man's and woman's ranges, about 0\.5 semitones below the overlap \(145 Hz\)/);
  assert.match(placePitch(115, REF), /within the average man's range, about 4 semitones below the overlap/);
  assert.match(placePitch(240, REF), /above the average woman's range, about 6\.5 semitones above the overlap/);
  assert.doesNotMatch(placePitch(172, REF), /%/);
});

test("resonance in words: about the same, a little, or plainly, never a score", () => {
  assert.equal(describeResonance(0.3, "your first take"), "About the same as your first take.");
  assert.equal(describeResonance(-0.7, "last time"), "A little darker than last time.");
  assert.equal(describeResonance(1.2, "your first take"), "Brighter than your first take, by about a semitone.");
  assert.equal(describeResonance(-2.6, "your first take"), "Darker than your first take, by about 3 semitones.");
});

test("time in your range counts voiced frames only", () => {
  const band: [number, number] = [150, 200];
  // 2 s take: a third of it unvoiced, and of the voiced part, half at 170 Hz and half at 230 Hz
  const pts = line((i) => (i % 3 === 0 ? null : i % 3 === 1 ? 170 : 230) as number);
  assert.equal(shareInRange(pts, band), 0.5);
  assert.equal(shareInRange(line(() => 175), band), 1);
  assert.equal(shareInRange(line(() => 150), band), 1); // the edges count as in
});

test("no share without a range or with too little voice", () => {
  assert.equal(shareInRange(line(() => 175), null), null);
  assert.equal(shareInRange(line((i) => (i % 3 === 0 ? 175 : null) as number), [150, 200]), null);
  assert.equal(describeRangeShare(line(() => 175), null), null);
  assert.equal(describeRangeShare([], [150, 200]), null);
});

test("time in your range in words, with where the rest went", () => {
  const band: [number, number] = [150, 200];
  const mix = (inside: number, hzOut: number | ((i: number) => number)) => line((i) => (i < inside ? 175 : typeof hzOut === "number" ? hzOut : hzOut(i)));
  assert.equal(describeRangeShare(line(() => 175), band), "Nearly all of what you voiced sat in your range (150–200 Hz).");
  assert.equal(describeRangeShare(mix(67, 230), band), "About two thirds of what you voiced sat in your range (150–200 Hz); the rest was mostly higher.");
  assert.equal(describeRangeShare(mix(50, 120), band), "About half of what you voiced sat in your range (150–200 Hz); the rest was mostly lower.");
  assert.match(describeRangeShare(mix(30, (i) => (i % 2 ? 120 : 230)), band)!, /^About a third .*; the rest was a mix of higher and lower\.$/);
  assert.equal(describeRangeShare(line(() => 260), band), "Hardly any of what you voiced sat in your range (150–200 Hz); it was mostly higher.");
});

test("time in your range is a description, never a grade", () => {
  for (let inside = 0; inside <= 100; inside += 5) {
    const said = describeRangeShare(line((i) => (i < inside ? 175 : 230)), [150, 200])!;
    assert.doesNotMatch(said, /%|only|great|good|well done|should|score/i, said);
  }
});
