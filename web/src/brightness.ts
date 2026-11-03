// The Resonance chapter's live brightness meter. Brightness here is where a sound's energy sits
// across the spectrum (its spectral centroid, 200–5000 Hz). It is only ever read against the start
// of the same take: never as an absolute value, which would say more about the microphone, the
// room and the vowel than about you. It means something on a steady sound on one note (a hum, a
// held vowel, a whisper); speech moves it with every vowel and consonant.
//
// The maths is pure (tested in brightness.test.ts); `trackBrightness` at the end is the browser glue.

export const LOW_HZ = 200, HIGH_HZ = 5000;
/** How much voiced sound sets "where you started". */
export const BASELINE_S = 1;
/** Quieter than this (RMS) is never voice, whatever the room. */
export const MIN_RMS = 0.004;
/** A frame counts as voice when it is at least this share of the recent loudest. */
const GATE_SHARE = 0.25;
/** The recent loudest halves in this long, so the gate follows you getting quieter. */
const PEAK_HALF_LIFE_S = 2;
/** The reading eases over about this long, so it follows the sound, not every frame. */
const SMOOTH_S = 0.35;

/**
 * Spectral centroid in Hz between `lo` and `hi`, from FFT magnitudes in dB (as
 * AnalyserNode.getFloatFrequencyData gives them: bin i is i × sampleRate / fftSize). Null when
 * there's no energy there.
 */
export function spectralCentroid(db: ArrayLike<number>, sampleRate: number, lo = LOW_HZ, hi = HIGH_HZ): number | null {
  const binHz = sampleRate / (2 * db.length);
  const a = Math.max(1, Math.ceil(lo / binHz)), b = Math.min(db.length - 1, Math.floor(hi / binHz));
  let sum = 0, weighted = 0;
  for (let i = a; i <= b; i++) {
    const v = db[i];
    if (!Number.isFinite(v)) continue;
    const m = 10 ** (v / 20);
    sum += m;
    weighted += m * i * binHz;
  }
  return sum > 1e-12 ? weighted / sum : null;
}

export function rmsOf(wave: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < wave.length; i++) s += wave[i] * wave[i];
  return wave.length ? Math.sqrt(s / wave.length) : 0;
}

export interface Brightness {
  /** Recent loudest RMS, decaying; the voice gate is a share of it. */
  peak: number;
  /** log2 centroids from the first voiced second, until the baseline is set. */
  first: number[];
  firstS: number;
  /** Where you started: log2 of the centroid. */
  baseline: number | null;
  /** The eased reading, log2 Hz. */
  smooth: number | null;
  /** Semitones brighter (+) or darker (−) than where you started; null until there's a baseline. */
  rel: number | null;
  /** Whether this frame was voice (loud enough, with energy in the band). */
  voiced: boolean;
}

export const startBrightness = (): Brightness => ({ peak: 0, first: [], firstS: 0, baseline: null, smooth: null, rel: null, voiced: false });

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

/** One analyser frame: `dt` seconds since the last, its loudness and its centroid. */
export function stepBrightness(s: Brightness, f: { dt: number; rms: number; centroid: number | null }): Brightness {
  const peak = Math.max(f.rms, s.peak * 0.5 ** (f.dt / PEAK_HALF_LIFE_S));
  const voiced = f.centroid !== null && f.centroid > 0 && f.rms >= Math.max(MIN_RMS, peak * GATE_SHARE);
  // Silence and breaths hold everything where it was.
  if (!voiced) return { ...s, peak, voiced: false };
  const x = Math.log2(f.centroid!);
  if (s.baseline === null) {
    const first = [...s.first, x], firstS = s.firstS + f.dt;
    if (firstS < BASELINE_S) return { ...s, peak, first, firstS, voiced: true, smooth: x };
    // The median, so a stray consonant or click in the first second doesn't set the start.
    const baseline = median(first);
    return { ...s, peak, first: [], firstS, baseline, smooth: baseline, rel: 0, voiced: true };
  }
  const k = 1 - Math.exp(-f.dt / SMOOTH_S);
  const smooth = s.smooth === null ? x : s.smooth + (x - s.smooth) * k;
  return { ...s, peak, smooth, rel: 12 * (smooth - s.baseline), voiced: true };
}

/** Where the dot sits on the strip, −1 (darker) to 1 (brighter); a few semitones fill most of it. */
export const meterPosition = (rel: number) => Math.tanh(rel / 4);

/** The reading in words, against the start of the take; never better or worse. */
export function brightnessWords(s: Brightness | null): string {
  if (!s || (s.baseline === null && !s.first.length)) return "Make a steady sound: a hum, a vowel or a whisper";
  if (s.rel === null) return "Listening to how you start…";
  const a = Math.abs(s.rel), way = s.rel > 0 ? "brighter" : "darker";
  if (a < 1) return "About where you started";
  return a < 3 ? `A little ${way} than when you started` : `${way === "brighter" ? "Brighter" : "Darker"} than when you started`;
}

/** Read brightness from the microphone every frame until the returned function is called. */
export function trackBrightness(stream: MediaStream, onReading: (s: Brightness) => void): () => void {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  an.smoothingTimeConstant = 0; // easing happens in stepBrightness, in semitones
  src.connect(an);
  if (ctx.state === "suspended") void ctx.resume(); // a suspended context would read as silence
  const spec = new Float32Array(an.frequencyBinCount), wave = new Float32Array(an.fftSize);
  let s = startBrightness(), last = performance.now(), raf = 0;
  const tick = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    an.getFloatFrequencyData(spec);
    an.getFloatTimeDomainData(wave);
    s = stepBrightness(s, { dt, rms: rmsOf(wave), centroid: spectralCentroid(spec, ctx.sampleRate) });
    onReading(s);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); src.disconnect(); void ctx.close(); };
}
