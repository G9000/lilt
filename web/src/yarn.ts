// Ball of yarn: the voice game's rules, apart from any drawing, so they can be tested.
// Your pitch lifts a ball of yarn; loops of yarn drift towards it, to thread it through if you like.
// Nothing here is scored: a loop the yarn misses simply drifts by.
import { cleanContour, type ContourPoint, hzToMidi, midiToHz, noteName, recentMedian } from "./pitch.ts";

export type Mode = "hum" | "speak";

/** Decorative poses use game time, so a breathing break freezes them along with the yarn. */
export function catReaction(now: number, threadedAt: number, y: number, reduced: boolean) {
  if (reduced) return { hop: 0, reach: 0, blink: false };
  const age = now - threadedAt;
  const hop = age > 0 && age < 1.1 ? Math.sin(age / 1.1 * Math.PI) ** 2 : 0;
  const reach = Math.min(1, Math.max(0, (y - .78) / .16));
  return { hop, reach, blink: now % 5.7 > 5.5 };
}

/** A comfortable range narrower than this (semitones) is widened around its middle, so the yarn isn't twitchy. */
export const MIN_SPAN_ST = 5;
/** Room above the top of your range and below the bottom, as a fraction of the field: both ends are reachable without straining. */
export const MARGIN = 0.14;
/** Where the yarn rests on the floor when you're quiet (field fraction from the top; 1 is the floor). */
export const REST_Y = 0.97;
/** A gentle pause every couple of minutes of play. */
export const BREAK_EVERY_S = 120;

/** How each way of playing feels: speech moves fast and pauses between words, so it's followed more slowly and held longer. */
export const FEEL: Record<Mode, { tau: number; hold: number; ring: number; low: number; high: number; every: number }> = {
  // tau: how quickly the yarn follows (s); hold: how long it stays put through a gap (s);
  // ring: a loop's half-height (field fraction); low/high: where loops sit in your range (0..1); every: seconds between loops
  hum: { tau: 0.09, hold: 0.35, ring: 0.085, low: 0.1, high: 0.9, every: 4.6 },
  speak: { tau: 0.22, hold: 0.9, ring: 0.15, low: 0.25, high: 0.7, every: 5.6 },
};

/** The range the game plays in: your comfortable range, widened to at least MIN_SPAN_ST around its middle. */
export function playRange(band: [number, number]): [number, number] {
  let [lo, hi] = band[0] <= band[1] ? band : [band[1], band[0]];
  const a = hzToMidi(lo), b = hzToMidi(hi);
  if (b - a < MIN_SPAN_ST) { const mid = (a + b) / 2; lo = midiToHz(mid - MIN_SPAN_ST / 2); hi = midiToHz(mid + MIN_SPAN_ST / 2); }
  return [lo, hi];
}

/** Where a pitch sits in the range: 0 at the bottom, 1 at the top, in semitones (so it's even to the ear). Not clamped. */
export const pitchToU = (hz: number, range: [number, number]) => (hzToMidi(hz) - hzToMidi(range[0])) / (hzToMidi(range[1]) - hzToMidi(range[0]));
export const uToHz = (u: number, range: [number, number]) => midiToHz(hzToMidi(range[0]) + u * (hzToMidi(range[1]) - hzToMidi(range[0])));
/** Height in the field (0 top, 1 floor) for a place in the range, with MARGIN either end; far outside it stays just on screen. */
export const uToY = (u: number) => Math.min(REST_Y, Math.max(0.03, 1 - MARGIN - u * (1 - 2 * MARGIN)));
export const yToU = (y: number) => (1 - MARGIN - y) / (1 - 2 * MARGIN);
export const pitchToY = (hz: number, range: [number, number]) => uToY(pitchToU(hz, range));

/** A one-reading leap bigger than this (semitones) is held back until a few readings agree: the tracker jumping an octave, not you. */
export const LEAP_ST = 7;
const AGREE = 4;

/**
 * Follows the voice: readings in, a smooth height out. A median of the last few readings steadies
 * it, a sudden octave leap waits for agreement, and through a brief unvoiced gap (a consonant, a
 * breath between words) the yarn holds where it was. After a longer quiet it drifts gently down to
 * rest on the floor. Times are seconds on any one clock.
 */
export function follower(range: [number, number], mode: Mode) {
  const feel = FEEL[mode];
  const recent: (number | null)[] = [];
  let pending: number[] = [];
  let target: number | null = null; // semitones
  let lastVoiced = -Infinity, mutedUntil = -Infinity;
  let y = REST_Y;
  const lo = hzToMidi(range[0]), span = hzToMidi(range[1]) - lo;
  return {
    /** One reading from the tracker (hz null when it heard no voice). */
    push(t: number, hz: number | null) {
      if (t < mutedUntil) return;
      if (hz === null || !Number.isFinite(hz) || hz <= 0) return;
      const st = hzToMidi(hz);
      if (target !== null && Math.abs(st - target) > LEAP_ST) {
        pending = pending.length && Math.abs(pending[pending.length - 1] - st) <= 2 ? [...pending, st] : [st];
        if (pending.length < AGREE) return;
        // a real leap: start over from there
        recent.length = 0;
        pending.forEach((p) => recent.push(p));
        pending = [];
      } else {
        pending = [];
        recent.push(st);
      }
      if (recent.length > 7) recent.splice(0, recent.length - 7);
      target = recentMedian(recent, Math.min(7, Math.max(1, recent.length))) ?? st;
      lastVoiced = t;
    },
    /** Ignore what the mic hears until `t` (Lilt is playing a loop's note out loud). */
    mute(until: number) { mutedUntil = until; },
    /** Moves the yarn on by `dt` seconds; returns its height and whether your voice is holding it up. */
    step(t: number, dt: number): { y: number; afloat: boolean } {
      const afloat = target !== null && t - lastVoiced <= feel.hold;
      if (afloat) {
        const goal = uToY((target! - lo) / span);
        y += (1 - Math.exp(-dt / feel.tau)) * (goal - y);
      } else {
        // settle slowly, like yarn drifting down; it lifts off again the moment you make a sound
        y += (1 - Math.exp(-dt / 1.1)) * (REST_Y - y);
        if (t - lastVoiced > 1.5) target = null;
      }
      return { y, afloat };
    },
    get y() { return y; },
    /** Seconds since the last voiced reading. */
    quietFor: (t: number) => t - lastVoiced,
  };
}

/** A small, seedable random source, so a run of loops can be replayed in tests. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A loop of yarn. `at` is when (game seconds) it reaches the yarn; `u` where it hangs in your range. */
export interface Loop { id: number; at: number; u: number; r: number; hue: number; state: "ahead" | "through" | "by" }

/**
 * Deals loops ahead of time. Gentle by design: the first ones go middle, high, low (so you hear and
 * feel the difference), no loop is more than about a third of your range from the last, and now and
 * then three come close together on a slow slope, a path to glide along.
 */
export function loopMaker(mode: Mode, seed = 1) {
  const feel = FEEL[mode], rand = rng(seed);
  const opening = mode === "hum" ? [0.5, 0.8, 0.2] : [0.45, 0.65, 0.3];
  let id = 0, at = 3.5, u = 0.5;
  const clampU = (x: number) => Math.min(feel.high, Math.max(feel.low, x));
  const loop = (a: number, uu: number): Loop => ({ id: ++id, at: a, u: uu, r: feel.ring, hue: id % 4, state: "ahead" });
  return {
    /** The next few loops (one, or a slope of three). */
    next(): Loop[] {
      if (id < opening.length) { u = opening[id]; const l = loop(at, u); at += feel.every; return [l]; }
      if (rand() < 0.25) {
        const dir = u > (feel.low + feel.high) / 2 ? -1 : 1, stepU = 0.08 + rand() * 0.05, gap = feel.every * 0.42;
        const out = [0, 1, 2].map((k) => loop(at + k * gap, clampU(u + dir * stepU * k)));
        u = out[2].u; at += 2 * gap + feel.every;
        return out;
      }
      const reach = 0.34;
      u = clampU(u + (rand() * 2 - 1) * reach);
      const l = loop(at, u);
      at += feel.every * (0.85 + rand() * 0.3);
      return [l];
    },
  };
}

/** Does the yarn (at height `y`, radius `ball`, both field fractions) pass through this loop's opening? */
export const threads = (y: number, loop: Loop, ball = 0) => Math.abs(y - uToY(loop.u)) <= Math.max(0.01, loop.r - ball * 0.5);

/**
 * Moves time on for the loops: each one reaching the yarn is threaded or drifts by; ones well past
 * are dropped. Returns the loops still in play and those threaded just now (for a little sparkle).
 */
export function passLoops(loops: Loop[], now: number, y: number, ball = 0, keepBehind = 8): { loops: Loop[]; threaded: Loop[] } {
  const threaded: Loop[] = [];
  const out = loops.filter((l) => l.at > now - keepBehind).map((l) => {
    if (l.state !== "ahead" || l.at > now) return l;
    const through = threads(y, l, ball);
    const done: Loop = { ...l, state: through ? "through" : "by" };
    if (through) threaded.push(done);
    return done;
  });
  return { loops: out, threaded };
}

/** When to play a loop's note out loud: once, as it comes into view, and only while you're quiet (so you can hear it). */
export const cueDue = (loop: Loop, now: number, lead: number, quietFor: number) => loop.state === "ahead" && loop.at - now <= lead && loop.at - now > lead - 1.5 && quietFor > 0.4;

/** Time for a breath? */
export const breakDue = (playedS: number, lastBreakS: number) => playedS - lastBreakS >= BREAK_EVERY_S;

/** In speak mode, a sentence counts as said after a bit of voice followed by a pause. */
export const saidIt = (voicedS: number, quietS: number) => voicedS >= 0.8 && quietS >= 1.2;

/**
 * Whether the room sounds noisy: between your sounds (readings with no voice in them), the
 * background is well above a quiet room's. A long unbroken hum has no gaps to judge by, so it's
 * never called noisy. Frames are 10 ms; `v` is loudness (RMS).
 */
export function noisyRoom(frames: { hz: number | null; v: number }[], window = 400): boolean {
  const last = frames.slice(-window);
  if (last.length < 200) return false;
  const gaps = last.filter((f) => f.hz === null && Number.isFinite(f.v)).map((f) => f.v).sort((a, b) => a - b);
  if (gaps.length < last.length * 0.25) return false;
  return gaps[Math.floor(gaps.length * 0.3)] >= 0.012;
}

/** Enough of a hum to measure (readings at 10 ms): about a second and a half. */
export const HUM_READINGS = 150;

/**
 * A comfortable range from two hums: the middle of the low one and of the high one, in either
 * order, widened to at least MIN_SPAN_ST. Forgiving: null only when either hum had too little voice.
 */
export function rangeFromHums(low: (number | null)[], high: (number | null)[]): [number, number] | null {
  const mid = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
    return v.length >= 30 ? v[Math.floor(v.length / 2)] : null;
  };
  const a = mid(low), b = mid(high);
  if (a === null || b === null) return null;
  const [lo, hi] = playRange([Math.min(a, b), Math.max(a, b)]);
  return [Math.round(lo), Math.round(hi)];
}

/** "D3 to A3 (147–220 Hz)" */
export const rangeWords = (r: [number, number]) => `${noteName(r[0])} to ${noteName(r[1])} (${Math.round(r[0])}–${Math.round(r[1])} Hz)`;

/** "40 seconds", "about a minute", "2 minutes", "2 and a half minutes" */
export function duration(s: number): string {
  if (s < 8) return "a few seconds";
  if (s < 55) return `${Math.round(s / 5) * 5} seconds`;
  if (s < 75) return "about a minute";
  const halves = Math.round(s / 30);
  const m = Math.floor(halves / 2), half = halves % 2 === 1;
  return half ? `${m} and a half minutes` : `${m} minute${m === 1 ? "" : "s"}`;
}

/**
 * A few plain sentences about how it went: how long your voice kept the yarn up, and where in
 * your range it mostly was (from the cleaned pitch line, so a glitch can't tip it). Never a grade.
 */
export function describePlay(frames: ContourPoint[], range: [number, number], afloatS: number, mode: Mode, sentences = 0): string[] {
  const out: string[] = [];
  if (afloatS < 3) return ["The yarn mostly rested this time. Whenever you like, hum or speak and it lifts again."];
  out.push(`You kept the yarn afloat for ${duration(afloatS)}.`);
  const us = cleanContour(frames).map((p) => p.line ?? p.hz).filter((h): h is number => h !== null).map((h) => pitchToU(h, range));
  if (us.length >= 50) {
    const upper = us.filter((u) => u >= 0.5).length / us.length;
    const above = us.filter((u) => u > 1.05).length / us.length, below = us.filter((u) => u < -0.05).length / us.length;
    let where = upper >= 0.65 ? "mostly in the upper half of your range" : upper <= 0.35 ? "mostly in the lower half of your range" : "across the middle of your range";
    if (above >= 0.15 && below >= 0.15) where += ", and sometimes beyond both ends";
    else if (above >= 0.15) where += ", and sometimes above it";
    else if (below >= 0.15) where += ", and sometimes below it";
    out.push(`Your voice was ${where}.`);
  }
  if (mode === "speak" && sentences > 0) out.push(`You said ${sentences === 1 ? "one sentence" : `${sentences} sentences`} along the way.`);
  return out;
}

/** Everyday lines for speak mode when the course has none to offer. */
export const SENTENCES = [
  "Hi, could I get a coffee, please?",
  "Good morning. How are you today?",
  "Thank you so much, that's lovely.",
  "Is this seat free?",
  "Could you say that again, please?",
  "I'll be there in about ten minutes.",
  "That sounds really good to me.",
  "Have a lovely evening.",
];

/** Short lines from the course's everyday phrases (any chapter of that kind), else the built-in list. */
export function sentencesFrom(levels: { kind: string; items: { text: string }[] }[]): string[] {
  const lines = levels.filter((l) => l.kind === "phrases").flatMap((l) => l.items.map((i) => i.text.trim()))
    .filter((t) => t.length >= 6 && t.length <= 70 && !/[↗↘]/.test(t));
  return lines.length >= 4 ? lines : SENTENCES;
}
