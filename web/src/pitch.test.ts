// node --test src/pitch.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { yin, noteName, steadinessSt, recentMedian, noiseFloor, cleanContour } from "./pitch.ts";

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

test("the voice gate follows the room: a quiet mic in a quiet room still hears a soft voice", () => {
  const sr = 48000;
  const tone = (hz: number, amp: number) => Float32Array.from({ length: 2048 }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / sr));
  const soft = tone(180, 0.006); // rms about 0.004, a quiet syllable on a built-in mic
  assert.equal(yin(soft, sr).hz, null, "the old fixed gate drops it");
  const room = noiseFloor();
  let gate = 0.008;
  for (let i = 0; i < 80; i++) gate = room.gate(0.0008); // a quiet room
  assert.ok(gate < 0.004 && gate >= 0.0025, `gate ${gate}`);
  const f = yin(soft, sr, 0.15, gate);
  assert.ok(f.hz !== null && Math.abs(f.hz - 180) < 3, `heard ${f.hz}`);
  const loud = noiseFloor();
  for (let i = 0; i < 80; i++) gate = loud.gate(0.02); // a noisy room: never above the old gate
  assert.equal(gate, 0.008);
});

const frames = (hz: (i: number) => number | null, n = 60, dt = 0.01) => Array.from({ length: n }, (_, i) => ({ t: i * dt, hz: hz(i) }));

test("cleaning: a one-frame octave slip goes back to its neighbours' octave, then the median smooths", () => {
  const out = cleanContour(frames((i) => (i === 30 ? 360 : 180)));
  assert.ok(out.every((p) => p.hz === null || Math.abs(p.hz - 180) < 1), JSON.stringify(out[30]));
  const low = cleanContour(frames((i) => (i === 20 ? 92 : 185)));
  assert.ok(Math.abs((low[20].hz as number) - 185) < 3);
});

test("cleaning: a real, sustained change is kept", () => {
  const out = cleanContour(frames((i) => (i < 30 ? 180 : 240)));
  assert.ok(Math.abs((out[10].hz as number) - 180) < 1 && Math.abs((out[50].hz as number) - 240) < 1);
  assert.ok((out[55].line as number) > 235, "the line arrives at the new pitch");
});

test("cleaning: bursts shorter than 60 ms (clicks, breaths) are dropped; speech isn't", () => {
  const out = cleanContour(frames((i) => (i >= 10 && i < 14 ? 300 : i >= 30 && i < 50 ? 200 : null)));
  assert.ok(out.slice(10, 14).every((p) => p.hz === null), "4-frame click dropped");
  assert.ok(out.slice(32, 48).every((p) => p.hz !== null), "20-frame phrase kept");
});

test("cleaning: the smooth line eases in semitones and restarts after a pause", () => {
  const out = cleanContour(frames((i) => (i < 20 ? 150 : i < 40 ? null : 220)));
  assert.equal(out[40].line, 220, "after a pause the line starts at the new pitch, not sliding from the old one");
  const jump = cleanContour(frames((i) => (i < 20 ? 150 : 200)));
  assert.ok((jump[21].line as number) > 150 && (jump[21].line as number) < 200, "a jump without a pause eases");
});

test("cleaning: an unsure brief spike goes; clear pitch movement stays", () => {
  const at = (c: number) => frames((i) => (i >= 30 && i < 33 ? 300 : 180)).map((p) => ({ ...p, c: p.hz === 300 ? c : 0.97 }));
  assert.ok(cleanContour(at(0.88)).slice(30, 33).every((p) => p.hz === null || Math.abs(p.hz - 180) < 1), "unsure burst dropped");
  assert.ok(Math.abs((cleanContour(at(0.97))[31].hz as number) - 300) < 1, "clear burst mid-speech kept");
  const byPause = frames((i) => (i < 20 ? 180 : i < 24 ? null : i < 27 ? 300 : 180)).map((p) => ({ ...p, c: p.hz === 300 ? 0.88 : 0.97 }));
  assert.ok(cleanContour(byPause).slice(24, 27).every((p) => p.hz === null || Math.abs(p.hz - 180) < 1), "burst beside a pause dropped");
});

test("cleaning: quiet steady hum goes; a note held as loud as speech stays", () => {
  const pts = frames((i) => (i < 100 ? 200 * 2 ** (Math.sin(i / 6) / 12) : i < 160 ? 120 : 220), 220).map((p, i) => ({
    ...p, c: i >= 100 && i < 160 ? 0.88 : 0.97, v: i >= 100 && i < 160 ? 0.004 : 0.05,
  }));
  const out = cleanContour(pts);
  assert.ok(out.slice(110, 150).every((p) => p.hz === null), "hum dropped");
  assert.ok(out.slice(170, 210).every((p) => p.hz !== null), "held note kept");
  assert.ok(out.slice(10, 90).every((p) => p.hz !== null), "speech kept");
  const noLoudness = cleanContour(frames((i) => (i < 60 ? 120 : null)));
  assert.ok(noLoudness.slice(5, 55).every((p) => p.hz !== null), "Praat contours (no loudness) are left alone");
});

test("cleaning: a clear quiet held note survives beside louder speech", () => {
  const pts = frames((i) => i < 350 ? 105 + (i % 43) * 0.8 : 220 + Math.sin(i / 30) * 0.3, 600)
    .map((p, i) => ({ ...p, c: 0.94, v: i < 350 ? 0.02 : 0.003 }));
  const out = cleanContour(pts);
  assert.ok(out.slice(400, 550).every((p) => p.hz !== null && Math.abs(p.hz - 220) < 1));
});

test("cleaning: quiet expressive speech and repeated phrase endings survive gain changes", () => {
  const pts = frames((i) => i % 100 < 90 ? 160 + (i % 37) * 0.7 : 180, 800)
    .map((p, i) => ({ ...p, c: i % 100 < 90 ? 0.97 : 0.88, v: i % 100 < 90 ? 0.02 : 0.002 }));
  const out = cleanContour(pts);
  const quieter = cleanContour(pts.map((p) => ({ ...p, v: p.v * 0.1 })));
  assert.deepEqual(out, quieter, "relative energy rules must be independent of microphone gain");
  for (let i = 0; i < 8; i++) assert.ok(out.slice(i * 100 + 90, i * 100 + 100).every((p) => p.hz !== null));
});

test("cleaning: loud voice at the background pitch is kept", () => {
  const pts = frames((i) => i < 120 ? 200 + (i % 37) : 120, 400)
    .map((p, i) => ({ ...p, c: i >= 230 && i < 260 ? 0.97 : 0.88, v: i < 120 || (i >= 230 && i < 260) ? 0.03 : 0.003 }));
  const out = cleanContour(pts);
  assert.ok(out.slice(150, 200).every((p) => p.hz === null), "quiet uncertain hum removed");
  assert.ok(out.slice(235, 255).every((p) => p.hz !== null), "loud voice at the same pitch kept");
});

test("cleaning: an isolated clear phrase beside pauses survives", () => {
  const pts = frames((i) => i < 60 ? 180 : i >= 64 && i < 72 ? 300 : null, 90)
    .map((p) => ({ ...p, c: 0.97 }));
  assert.ok(cleanContour(pts).slice(64, 72).every((p) => p.hz === 300));
});

test("cleaning: a coherent lower register is kept even with uncertain readings", () => {
  const pts = frames((i) => i < 60 || i >= 80 ? 180 : 123, 140).map((p, i) => ({ ...p, c: i >= 60 && i < 80 ? 0.88 : 0.97 }));
  assert.ok(cleanContour(pts).slice(60, 80).every((p) => p.hz !== null && Math.abs(p.hz - 123) < 1));
});

test("cleaning: octave mistakes use unchanged, agreeing context on both sides", () => {
  const pts = frames((i) => i >= 40 && i < 43 ? 720 : 180, 110);
  const original = structuredClone(pts);
  const out = cleanContour(pts);
  assert.ok(out.slice(40, 43).every((p) => p.hz === 180), "short two-octave error corrected");
  assert.ok(out.slice(43).every((p) => p.hz === 180), "error cannot pull following speech up");
  assert.deepEqual(pts, original, "source contour remains unchanged");
  const step = cleanContour(frames((i) => i < 40 ? 180 : 360, 80));
  assert.equal(step[39].hz, 180, "last frame before a genuine octave change stays put");
  assert.equal(step[40].hz, 360, "first frame after a genuine octave change stays put");
});

test("cleaning: a clear short octave phrase is not folded into its neighbours", () => {
  const pts = frames((i) => i >= 40 && i < 48 ? 360 : 180, 100).map((p) => ({ ...p, c: 0.97 }));
  assert.ok(cleanContour(pts).slice(40, 48).every((p) => p.hz === 360));
});

test("cleaning: context and median smoothing do not cross a time gap", () => {
  const pts = frames((i) => i < 20 ? 180 : 360, 40).map((p, i) => ({ ...p, t: p.t + (i < 20 ? 0 : 1) }));
  const out = cleanContour(pts);
  assert.equal(out[19].hz, 180);
  assert.equal(out[20].hz, 360);
  assert.equal(out[20].line, 360);
});

test("cleaning: a long uncertain register change is not trimmed as an outlier", () => {
  const pts = frames((i) => i >= 60 && i < 80 ? 300 : 180, 140).map((p) => ({ ...p, c: 0.88 }));
  assert.ok(cleanContour(pts).slice(60, 80).every((p) => p.hz !== null && Math.abs(p.hz - 300) < 1));
});

test("cleaning: a sustained uncertain phrase beside pauses keeps its edges", () => {
  const pts = frames((i) => i < 60 ? 180 : i >= 64 && i < 84 ? 123 : null, 100)
    .map((p) => ({ ...p, c: p.hz === 123 ? 0.88 : 0.97 }));
  assert.ok(cleanContour(pts).slice(64, 84).every((p) => p.hz !== null && Math.abs(p.hz - 123) < 1));
});

test("cleaning: duration safeguards also protect the slower live tracker", () => {
  const pts = frames((i) => i >= 30 && i < 35 ? 300 : 180, 80, 0.025).map((p) => ({ ...p, c: 0.88 }));
  assert.ok(cleanContour(pts).slice(30, 35).every((p) => p.hz !== null && Math.abs(p.hz - 300) < 1));
  const isolated = frames((i) => i >= 30 && i < 35 ? 300 : null, 80, 0.025);
  assert.ok(cleanContour(isolated).slice(30, 35).every((p) => p.hz === 300));
});
