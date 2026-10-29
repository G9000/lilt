// Live pitch estimate for on-screen feedback while recording (YIN, de Cheveigné &
// Kawahara 2002). This is a preview only: saved takes are measured afterwards by the
// Praat helper, and only that result is stored or used anywhere else.
import { claimMic } from "./micuse.ts";

export interface PitchFrame {
  hz: number | null;
  /** 1 - YIN aperiodicity at the chosen lag (0..1); not a calibrated probability. */
  clarity: number;
  rms: number;
}

export const LIVE_MIN_HZ = 60;
export const LIVE_MAX_HZ = 700;

export function yin(buf: Float32Array, sampleRate: number, threshold = 0.15, minRms = 0.008): PitchFrame {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / buf.length);
  if (rms < minRms) return { hz: null, clarity: 0, rms };

  const maxLag = Math.min(Math.floor(sampleRate / LIVE_MIN_HZ), Math.floor(buf.length / 2));
  const minLag = Math.floor(sampleRate / LIVE_MAX_HZ);
  const W = buf.length - maxLag;
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // Cumulative mean normalised difference.
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return { hz: null, clarity: 0, rms };
  // Parabolic interpolation around the minimum.
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau < maxLag ? cmnd[tau + 1] : cmnd[tau];
  const denom = 2 * (2 * cmnd[tau] - x2 - x0);
  const better = denom !== 0 ? tau + (x2 - x0) / denom : tau;
  const hz = sampleRate / better;
  if (hz < LIVE_MIN_HZ || hz > LIVE_MAX_HZ) return { hz: null, clarity: 0, rms };
  return { hz, clarity: Math.max(0, 1 - cmnd[tau]), rms };
}

const NOTES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

export function noteName(hz: number): string {
  const m = Math.round(hzToMidi(hz));
  return `${NOTES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** Median of the last `n` voiced values, to steady the readout without hiding change. */
export function recentMedian(values: (number | null)[], n = 7): number | null {
  const v = values.slice(-n).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length < Math.ceil(n / 2)) return null;
  return v[Math.floor(v.length / 2)];
}

/** Standard deviation in semitones of voiced values, around their median. */
export function steadinessSt(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 8) return null;
  const sorted = [...v].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const st = v.map((x) => 12 * Math.log2(x / med));
  const mean = st.reduce((a, b) => a + b, 0) / st.length;
  return Math.sqrt(st.reduce((a, b) => a + (b - mean) ** 2, 0) / st.length);
}

export interface LiveTracker {
  stop: () => void;
}

/** Run YIN on the live stream about every 25 ms. `onFrame` receives each estimate with its time. */
/**
 * How loud a frame must be to count as voice, learned from the room: a few times the background
 * level (the quiet end of the last few seconds), never above the old fixed 0.008 and never below
 * 0.0025. A quiet built-in mic in a quiet room then still hears soft syllables, and a noisy room
 * still ignores its own hum. YIN's periodicity check rejects whatever noise gets through.
 */
export function noiseFloor(seconds = 3, frameS = 0.025) {
  const keep = Math.round(seconds / frameS);
  const recent: number[] = [];
  return {
    gate(rms: number): number {
      recent.push(rms);
      if (recent.length > keep) recent.shift();
      if (recent.length < 12) return 0.008;
      const quiet = [...recent].sort((a, b) => a - b)[Math.floor(recent.length * 0.1)];
      return Math.min(0.008, Math.max(0.0025, quiet * 3));
    },
  };
}

export function trackLive(stream: MediaStream, onFrame: (t: number, f: PitchFrame) => void): LiveTracker {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  const t0 = performance.now();
  const releaseMic = claimMic();
  let stopped = false;
  const floor = noiseFloor();
  const id = setInterval(() => {
    if (stopped) return;
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const f = yin(buf, ctx.sampleRate, 0.15, floor.gate(Math.sqrt(sum / buf.length)));
    onFrame((performance.now() - t0) / 1000, f);
  }, 25);
  return {
    stop: () => {
      stopped = true;
      releaseMic();
      clearInterval(id);
      src.disconnect();
      void ctx.close();
    },
  };
}

/**
 * Denser live pitch for the on-screen chart: the raw audio (through an AudioWorklet), averaged
 * down to about 16 kHz, read with YIN every 10 ms over a 40 ms window, with the room-aware voice
 * gate. Falls back to `trackLive` where AudioWorklet isn't available. (ReadAlong keeps
 * `trackLive`: its smoothing is tuned to that rate.)
 */
export function trackLiveFine(stream: MediaStream, onFrame: (t: number, f: PitchFrame) => void): LiveTracker {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx || typeof AudioWorkletNode === "undefined") return trackLive(stream, onFrame);
  const ctx: AudioContext = new Ctx();
  const releaseMic = claimMic();
  let stopped = false, fallback: LiveTracker | null = null, node: AudioWorkletNode | null = null;
  const src = ctx.createMediaStreamSource(stream);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  const tap = `class Tap extends AudioWorkletProcessor {
    constructor() { super(); this.buf = new Float32Array(512); this.n = 0; }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (ch) for (let i = 0; i < ch.length; i++) { this.buf[this.n++] = ch[i]; if (this.n === 512) { this.port.postMessage(this.buf.slice(0)); this.n = 0; } }
      return true;
    }
  }
  registerProcessor("lilt-tap", Tap);`;
  const url = URL.createObjectURL(new Blob([tap], { type: "application/javascript" }));
  const D = Math.max(1, Math.round(ctx.sampleRate / 16000)), sr = ctx.sampleRate / D;
  const win = Math.max(Math.round(0.04 * sr), Math.ceil((2 * sr) / LIVE_MIN_HZ) + 8), hop = Math.round(0.01 * sr);
  const ring = new Float32Array(win), frame = new Float32Array(win);
  let w = 0, filled = 0, sinceHop = 0, seen = 0, acc = 0, accN = 0;
  const floor = noiseFloor(3, 0.01);
  const take = (x: number) => {
    acc += x; accN++;
    if (accN < D) return;
    ring[w] = acc / D; w = (w + 1) % win; acc = 0; accN = 0;
    seen++; filled = Math.min(win, filled + 1); sinceHop++;
    if (filled < win || sinceHop < hop) return;
    sinceHop = 0;
    let sum = 0;
    for (let i = 0; i < win; i++) { const v = ring[(w + i) % win]; frame[i] = v; sum += v * v; }
    onFrame(seen / sr, yin(frame, sr, 0.15, floor.gate(Math.sqrt(sum / win))));
  };
  void ctx.audioWorklet.addModule(url).then(() => {
    URL.revokeObjectURL(url);
    if (stopped) return;
    node = new AudioWorkletNode(ctx, "lilt-tap");
    node.port.onmessage = (e: MessageEvent<Float32Array>) => { if (!stopped) for (const x of e.data) take(x); };
    src.connect(node).connect(mute).connect(ctx.destination);
    if (ctx.state === "suspended") void ctx.resume();
  }, () => {
    URL.revokeObjectURL(url);
    if (!stopped) { void ctx.close(); fallback = trackLive(stream, onFrame); }
  });
  return {
    stop: () => {
      stopped = true;
      releaseMic();
      fallback?.stop();
      node?.port.close();
      try { src.disconnect(); } catch { /* already */ }
      if (ctx.state !== "closed") void ctx.close();
    },
  };
}

export interface CleanPoint { t: number; hz: number | null; line: number | null }

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

/**
 * A reading's pitch, plus what the live tracker knows about it: `c`, its clarity (YIN, 0..1), and
 * `v`, its loudness (RMS). Praat's contour has neither, so those steps are skipped for it.
 */
export interface ContourPoint { t: number; hz: number | null; c?: number; v?: number }

/** Below this clarity a reading is unsure. Across 40 real takes, 77% of wild readings fell under it, and 26% of good ones. */
export const UNSURE = 0.92;

/**
 * Display cleanup only. Clear readings and sustained register changes are protected; uncertain
 * glitches need agreeing context, and quiet steady tones need weak pitch evidence as well as
 * energy contrast. Each pass uses a snapshot, and context stops at pauses/time gaps.
 * The original contour and saved Praat measurements are never modified.
 */
export function cleanContour(pts: ContourPoint[], minRun = 6): CleanPoint[] {
  const n = pts.length, hz = pts.map((p) => p.hz);
  const rawSt = hz.map((v) => v === null ? null : hzToMidi(v));
  const fixed = hz.slice();
  const uncertain = (i: number) => pts[i].c === undefined || pts[i].c! < UNSURE;
  const starts = new Array<number>(n), ends = new Array<number>(n);
  for (let i = 0; i < n;) {
    if (hz[i] === null) { starts[i] = i; ends[i] = i + 1; i++; continue; }
    let end = i + 1;
    while (end < n && hz[end] !== null && pts[end].t - pts[end - 1].t < 0.15) end++;
    for (let j = i; j < end; j++) { starts[j] = i; ends[j] = end; }
    i = end;
  }
  const context = (values: (number | null)[], i: number, radius: number) => {
    const left: number[] = [], right: number[] = [];
    for (let j = i - 1; j >= starts[i] && pts[i].t - pts[j].t <= radius; j--) if (values[j] !== null) left.push(values[j]!);
    for (let j = i + 1; j < ends[i] && pts[j].t - pts[i].t <= radius; j++) if (values[j] !== null) right.push(values[j]!);
    return { left, right };
  };
  const sustained = (i: number) => {
    let first = i, last = i;
    while (first > starts[i] && Math.abs(rawSt[first - 1]! - rawSt[i]!) < 1.5) first--;
    while (last + 1 < ends[i] && Math.abs(rawSt[last + 1]! - rawSt[i]!) < 1.5) last++;
    return pts[last].t - pts[first].t > 0.06;
  };
  // Only short candidate runs are changed. A long coherent change is not a glitch, even if
  // the tracker is uncertain. The duration limit works at both 10 ms and 25 ms tracker rates.
  const applyBrief = (candidates: boolean[], apply: (i: number) => void) => {
    for (let i = 0; i < n;) {
      if (!candidates[i]) { i++; continue; }
      let end = i + 1;
      while (end < ends[i] && candidates[end]) end++;
      const step = end - i > 1 ? (pts[end - 1].t - pts[i].t) / (end - i - 1) : 0.01;
      if (pts[end - 1].t - pts[i].t + step <= 0.06 + 1e-9) for (let j = i; j < end; j++) if (!sustained(j)) apply(j);
      i = end;
    }
  };

  const octave = new Array<number | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const x = rawSt[i];
    if (x === null || !uncertain(i)) continue;
    const { left, right } = context(rawSt, i, 0.12);
    if (left.length < 3 || right.length < 3 || Math.abs(med(left) - med(right)) > 3) continue;
    const centre = med([...left, ...right]);
    const shift = Math.round((centre - x) / 12);
    if (Math.abs(shift) < 1 || Math.abs(shift) > 2) continue;
    const candidate = x + 12 * shift;
    if (Math.abs(candidate - centre) <= 2 && Math.abs(x - centre) - Math.abs(candidate - centre) >= 5) octave[i] = shift;
  }
  applyBrief(octave.map((v) => v !== null), (i) => { fixed[i] = hz[i]! * 2 ** octave[i]!; });

  const st = fixed.map((v) => v === null ? null : hzToMidi(v));
  const candidates = new Array<boolean>(n).fill(false);
  const voiced = st.filter((v): v is number => v !== null);
  const centre = voiced.length ? med(voiced) : 0;
  const globalSpread = voiced.length ? med(voiced.map((v) => Math.abs(v - centre))) : 0;
  for (let i = 0; i < n; i++) {
    const x = st[i];
    if (x === null || !uncertain(i)) continue;
    const { left, right } = context(st, i, 0.15);
    if (left.length >= 3 && right.length >= 3 && Math.abs(med(left) - med(right)) <= 3.5) {
      const near = [...left, ...right], m = med(near);
      const spread = med(near.map((y) => Math.abs(y - m)));
      candidates[i] = Math.abs(x - m) > Math.max(3, 3 * 1.4826 * spread);
    }
  }
  const drop = new Array<boolean>(n).fill(false);
  applyBrief(candidates, (i) => { drop[i] = true; });
  // With context on only one side, measure the entire extreme run before considering its
  // edges. Otherwise the first few frames of a sustained phrase could look like a short glitch.
  const extreme = st.map((x) => x !== null && voiced.length >= 12 && Math.abs(x - centre) > Math.max(6, 4 * 1.4826 * globalSpread));
  applyBrief(extreme, (i) => {
    const byPause = i - starts[i] < 3 || ends[i] - i <= 3;
    if (byPause && uncertain(i)) drop[i] = true;
  });

  const loud = pts.filter((p, i) => st[i] !== null && Number.isFinite(p.v)).map((p) => p.v!).sort((a, b) => a - b);
  if (loud.length >= 50) {
    const speech = loud[Math.floor(loud.length * 0.8)];
    for (let i = 0; i < n; i++) {
      // Quietness alone cannot distinguish a fan from a softly held practice note.
      if (st[i] === null || !Number.isFinite(pts[i].v) || pts[i].v! >= 0.2 * speech || pts[i].c === undefined || !uncertain(i)) continue;
      const ys: number[] = [], vs: number[] = [], times: number[] = [];
      let nearVoice = false;
      for (let j = i; j >= starts[i] && pts[i].t - pts[j].t <= 0.25; j--) collect(j);
      for (let j = i + 1; j < ends[i] && pts[j].t - pts[i].t <= 0.25; j++) collect(j);
      function collect(j: number) {
        if (st[j] === null || !Number.isFinite(pts[j].v)) return;
        const distance = Math.abs(st[j]! - st[i]!);
        if (Math.abs(pts[j].t - pts[i].t) <= 0.12 && distance < 3 && pts[j].v! >= speech * 0.65 && !uncertain(j)) nearVoice = true;
        if (distance < 1) { ys.push(st[j]!); vs.push(pts[j].v!); times.push(pts[j].t); }
      }
      if (nearVoice || ys.length < 8 || Math.max(...times) - Math.min(...times) < 0.18) continue;
      ys.sort((a, b) => a - b);
      const steady = ys[Math.floor(ys.length * 0.8)] - ys[Math.floor(ys.length * 0.2)] < 0.4;
      if (steady && med(vs) < 0.2 * speech) drop[i] = true;
    }
  }
  for (let i = 0; i < n; i++) if (drop[i]) fixed[i] = null;
  const smooth: (number | null)[] = fixed.map((v, i) => {
    if (v === null) return null;
    const near: number[] = [v];
    for (const direction of [-1, 1]) {
      for (let offset = 1; offset <= 2; offset++) {
        const j = i + direction * offset;
        if (j < starts[i] || j >= ends[i] || fixed[j] === null) break;
        near.push(fixed[j]!);
      }
    }
    return med(near);
  });
  // Drop bursts shorter than minRun * 10 ms, including on the slower fallback tracker.
  for (let i = 0; i < n; ) {
    if (smooth[i] === null) { i++; continue; }
    let j = i;
    while (j < n && smooth[j] !== null && (j === i || pts[j].t - pts[j - 1].t < 0.15)) j++;
    const step = j - i > 1 ? (pts[j - 1].t - pts[i].t) / (j - i - 1) : 0.01;
    if (pts[j - 1].t - pts[i].t + step < minRun * 0.01 - 1e-9) for (let k = i; k < j; k++) smooth[k] = null;
    i = j;
  }
  const out: CleanPoint[] = [];
  let ema: number | null = null, lastT = -1;
  for (let i = 0; i < n; i++) {
    const v = smooth[i], t = pts[i].t;
    if (v === null) { out.push({ t, hz: null, line: null }); continue; }
    const st = 12 * Math.log2(v / 440);
    if (ema === null || t - lastT > 0.15) ema = st;
    else ema += (1 - Math.exp(-(t - lastT) / 0.05)) * (st - ema);
    lastT = t;
    out.push({ t, hz: v, line: 440 * 2 ** (ema / 12) });
  }
  return out;
}
