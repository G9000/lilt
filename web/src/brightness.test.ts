// node --test src/brightness.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { brightnessWords, meterPosition, rmsOf, spectralCentroid, startBrightness, stepBrightness, type Brightness } from "./brightness.ts";

const SR = 48000, BINS = 1024; // fftSize 2048
const binHz = SR / (2 * BINS);

/** A harmonic spectrum in dB, as an AnalyserNode would give it: `f0` and its harmonics, falling `slope` dB per octave. */
function voice(f0: number, slope: number): Float32Array {
  const db = new Float32Array(BINS).fill(-Infinity);
  for (let h = 1; h * f0 < SR / 2; h++) {
    const i = Math.round((h * f0) / binHz);
    if (i < BINS) db[i] = -20 - slope * Math.log2(h);
  }
  return db;
}

test("the centroid of a single partial is its frequency", () => {
  const db = new Float32Array(BINS).fill(-Infinity);
  const i = Math.round(1000 / binHz);
  db[i] = -10;
  assert.ok(Math.abs(spectralCentroid(db, SR)! - i * binHz) < 1e-6);
});

test("energy outside 200–5000 Hz is ignored", () => {
  const db = new Float32Array(BINS).fill(-Infinity);
  db[Math.round(1000 / binHz)] = -10;
  db[Math.round(100 / binHz)] = 0; // a loud low rumble
  db[Math.round(9000 / binHz)] = 0; // and hiss
  assert.ok(Math.abs(spectralCentroid(db, SR)! - 1000) < binHz);
});

test("silence has no centroid", () => {
  assert.equal(spectralCentroid(new Float32Array(BINS).fill(-Infinity), SR), null);
});

test("on the same note, stronger upper harmonics read brighter", () => {
  const dark = spectralCentroid(voice(180, 12), SR)!, bright = spectralCentroid(voice(180, 6), SR)!;
  assert.ok(bright > dark * 1.2, `dark ${dark.toFixed(0)} Hz, bright ${bright.toFixed(0)} Hz`);
});

test("rms of a full-scale square wave is 1", () => {
  assert.equal(rmsOf([1, -1, 1, -1]), 1);
  assert.equal(rmsOf([]), 0);
});

/** Feed `seconds` of 60 fps frames at one centroid and loudness. */
function run(s: Brightness, seconds: number, centroid: number | null, rms = 0.1): Brightness {
  for (let t = 0; t < seconds; t += 1 / 60) s = stepBrightness(s, { dt: 1 / 60, rms, centroid });
  return s;
}

test("the first voiced second sets where you started; silence before it doesn't count", () => {
  let s = run(startBrightness(), 2, 1200, 0.001); // a quiet room
  assert.equal(s.baseline, null);
  assert.equal(s.voiced, false);
  s = run(s, 0.5, 1000);
  assert.equal(s.rel, null, "half a second isn't enough");
  s = run(s, 0.6, 1000);
  assert.ok(s.baseline !== null && Math.abs(2 ** s.baseline - 1000) < 1e-6);
  assert.equal(s.rel, 0);
});

test("a brighter sound reads as semitones above the start, a darker one below", () => {
  let s = run(startBrightness(), 1.2, 1000);
  s = run(s, 3, 1000 * 2 ** (3 / 12));
  assert.ok(Math.abs(s.rel! - 3) < 0.05, `got ${s.rel}`);
  s = run(s, 3, 1000 * 2 ** (-2 / 12));
  assert.ok(Math.abs(s.rel! + 2) < 0.05, `got ${s.rel}`);
});

test("it eases rather than jumps", () => {
  let s = run(startBrightness(), 1.2, 1000);
  s = stepBrightness(s, { dt: 1 / 60, rms: 0.1, centroid: 2000 });
  assert.ok(s.rel! > 0 && s.rel! < 1, `one frame of an octave up moved it ${s.rel} st`);
});

test("a pause holds the reading, and quiet sounds after a loud one don't move it", () => {
  let s = run(startBrightness(), 1.2, 1000);
  s = run(s, 2, 1300);
  const held = s.rel;
  s = run(s, 1, 3000, 0.0005); // silence (hiss reads bright)
  assert.equal(s.rel, held);
  assert.equal(s.voiced, false);
  s = run(s, 0.3, 3000, 0.015); // a breath, well under the recent loudest
  assert.equal(s.rel, held);
});

test("a stray click in the first second doesn't set the start", () => {
  let s = startBrightness();
  s = run(s, 0.5, 1000);
  s = run(s, 0.05, 4000);
  s = run(s, 0.6, 1000);
  assert.ok(Math.abs(2 ** s.baseline! - 1000) < 1e-6);
});

test("the strip position keeps its sign and stays inside the strip", () => {
  assert.equal(meterPosition(0), 0);
  assert.ok(meterPosition(2) > 0 && meterPosition(-2) < 0);
  assert.ok(meterPosition(40) <= 1 && meterPosition(-40) >= -1);
  assert.ok(meterPosition(4) > 0.7);
});

test("the words compare with the start, never judge", () => {
  const at = (rel: number): Brightness => ({ ...startBrightness(), baseline: 10, smooth: 10, rel, voiced: true });
  assert.match(brightnessWords(null), /steady sound/);
  assert.equal(brightnessWords({ ...startBrightness(), first: [10], firstS: 0.3 }), "Listening to how you start…");
  assert.equal(brightnessWords(at(0.4)), "About where you started");
  assert.equal(brightnessWords(at(1.5)), "A little brighter than when you started");
  assert.equal(brightnessWords(at(-1.5)), "A little darker than when you started");
  assert.equal(brightnessWords(at(4)), "Brighter than when you started");
  assert.equal(brightnessWords(at(-4)), "Darker than when you started");
  for (const r of [-6, -2, 0, 2, 6]) assert.doesNotMatch(brightnessWords(at(r)), /good|bad|better|worse|%|male|female|man|woman/i);
});
