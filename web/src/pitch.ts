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
  const id = setInterval(() => {
    if (stopped) return;
    an.getFloatTimeDomainData(buf);
    const f = yin(buf, ctx.sampleRate);
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
