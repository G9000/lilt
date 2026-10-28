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
 * A pitch contour made readable, before it's drawn:
 * 1. local octave fix: a reading about twice (or half) the pitch of its neighbours on both sides
 *    is moved back into their octave, so one bad frame can't drag the line;
 * 2. wild readings out: one more than 3 semitones (and 3 spreads) from its neighbours' middle is
 *    dropped when it's unsure (clarity under `UNSURE`) or right beside a pause, where misreads
 *    gather. A clear jump in the middle of speech stays;
 * 3. background hum out: a stretch of quiet, dead-steady pitch, under a fifth of the loudness of
 *    your speech around it (a fan, a fridge, a monitor's whine), is dropped. A note you hold is as loud as
 *    your speech, so it stays;
 * 4. a 5-point median, so single-frame misreads disappear;
 * 5. bursts shorter than `minRun` frames are dropped (clicks and breaths, not speech);
 * 6. `line`: the pitch eased in semitones (about 50 ms), restarting after a pause, to draw as a
 *    smooth line over the dots.
 * Frame times may be uneven; gaps over 150 ms break the line.
 */
export function cleanContour(pts: ContourPoint[], minRun = 6): CleanPoint[] {
  const n = pts.length, hz = pts.map((p) => p.hz);
  const fixed = hz.slice();
  for (let i = 0; i < n; i++) {
    const v = hz[i];
    if (v === null) continue;
    const near: number[] = [];
    for (let j = Math.max(0, i - 12); j <= Math.min(n - 1, i + 12); j++) if (j !== i && hz[j] !== null) near.push(hz[j] as number);
    if (near.length < 6) continue;
    const r = v / med(near);
    if (r > 1.8 && r < 2.25) fixed[i] = v / 2;
    else if (r > 0.44 && r < 0.56) fixed[i] = v * 2;
  }
  const st = fixed.map((v) => (v === null ? null : 12 * Math.log2(v / 440)));
  const drop = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    const x = st[i];
    if (x === null) continue;
    const near: number[] = [];
    for (let j = Math.max(0, i - 15); j <= Math.min(n - 1, i + 15); j++) if (j !== i && st[j] !== null) near.push(st[j] as number);
    if (near.length < 8) continue;
    const m = med(near), spread = med(near.map((y) => Math.abs(y - m)));
    if (Math.abs(x - m) <= Math.max(3, 3 * spread)) continue;
    const unsure = pts[i].c !== undefined && pts[i].c! < UNSURE;
    let byPause = false;
    for (let d = -3; d <= 3 && !byPause; d++) {
      const j = i + d;
      if (d === 0 || j < 0 || j >= n) continue;
      if (hz[j] === null || Math.abs(pts[j].t - pts[i].t) > 0.15) byPause = true;
    }
    if (unsure || byPause) drop[i] = true;
  }
  const loud = pts.filter((p, i) => st[i] !== null && p.v !== undefined).map((p) => p.v as number).sort((a, b) => a - b);
  if (loud.length >= 50) {
    const speech = loud[Math.floor(loud.length * 0.8)];
    for (let i = 0; i < n; i++) {
      if (st[i] === null || pts[i].v === undefined) continue;
      // Its neighbours at the same pitch (within a semitone), so the edge of a hum next to speech counts too.
      const ys: number[] = [], vs: number[] = [];
      for (let j = Math.max(0, i - 25); j <= Math.min(n - 1, i + 25); j++) {
        const y = st[j];
        if (y !== null && pts[j].v !== undefined && Math.abs(y - (st[i] as number)) < 1) { ys.push(y); vs.push(pts[j].v as number); }
      }
      if (ys.length < 20) continue;
      ys.sort((a, b) => a - b);
      const steady = ys[Math.floor(ys.length * 0.8)] - ys[Math.floor(ys.length * 0.2)] < 0.4;
      if (steady && med(vs) < 0.2 * speech) drop[i] = true;
    }
  }
  for (let i = 0; i < n; i++) if (drop[i]) fixed[i] = null;
  const smooth: (number | null)[] = fixed.map((v, i) => {
    if (v === null) return null;
    const near: number[] = [];
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) if (fixed[j] !== null) near.push(fixed[j] as number);
    return med(near);
  });
  // Drop short bursts.
  for (let i = 0; i < n; ) {
    if (smooth[i] === null) { i++; continue; }
    let j = i;
    while (j < n && smooth[j] !== null && (j === i || pts[j].t - pts[j - 1].t < 0.15)) j++;
    if (j - i < minRun) for (let k = i; k < j; k++) smooth[k] = null;
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
