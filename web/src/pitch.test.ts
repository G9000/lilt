// node --test src/pitch.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { yin, noteName, steadinessSt, recentMedian } from "./pitch.ts";

const SR = 48000;
function tone(hz: number, n = 2048, harmonics = 1, amp = 0.3): Float32Array {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let h = 1; h <= harmonics; h++) s += Math.sin((2 * Math.PI * hz * h * i) / SR) / h;
    b[i] = amp * s;
  }
  return b;
}

// Tolerance declared before running: 1% for clean tones in the live range.
for (const hz of [90, 140, 200, 240, 330, 500]) {
  test(`YIN tracks a ${hz} Hz harmonic tone within 1%`, () => {
    const f = yin(tone(hz, 2048, 8), SR);
    assert.ok(f.hz !== null);
    assert.ok(Math.abs(f.hz! - hz) / hz < 0.01, `got ${f.hz}`);
  });
}

test("silence and quiet noise give no pitch", () => {
  assert.equal(yin(new Float32Array(2048), SR).hz, null);
  const noise = new Float32Array(2048).map(() => (Math.random() - 0.5) * 0.004);
  assert.equal(yin(noise, SR).hz, null);
});

test("white noise at speaking level is mostly unvoiced", () => {
  let voiced = 0;
  for (let k = 0; k < 40; k++) {
    const noise = new Float32Array(2048).map(() => (Math.random() - 0.5) * 0.6);
    if (yin(noise, SR).hz !== null) voiced++;
  }
  assert.ok(voiced <= 4, `voiced ${voiced}/40`);
});

test("note names and helpers", () => {
  assert.equal(noteName(440), "A4");
  assert.equal(noteName(261.63), "C4");
  assert.equal(steadinessSt(Array(20).fill(200)), 0);
  assert.equal(recentMedian([null, null, null]), null);
  assert.equal(recentMedian([200, 210, 190, 205, 195]), 200);
});
