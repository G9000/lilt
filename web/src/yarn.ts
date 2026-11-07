// Ball of yarn: the voice game's rules, apart from any drawing, so they can be tested.
// Your pitch lifts a ball of yarn; loops of yarn drift towards it, to thread it through if you like.
// Nothing here is scored: a loop the yarn misses simply drifts by.
import { cleanContour, type ContourPoint, hzToMidi, midiToHz, noteName, recentMedian } from "./pitch.ts";

export type Mode = "hum" | "speak";

/** How often the cat pats yarn resting beside it (seconds), and how long a pat lasts. */
export const PAT_EVERY = 2.6, PAT_S = 0.45;

/**
 * Decorative poses use game time, so a breathing break freezes them along with the yarn. The cat
 * reaches for yarn hanging low near it; once the yarn rests on the floor it gives it a pat as it
 * lands (`landedAt`) and every so often after.
 */
export function catReaction(now: number, threadedAt: number, y: number, reduced: boolean, landedAt = -Infinity) {
  if (reduced) return { hop: 0, reach: 0, blink: false };
  const age = now - threadedAt;
  const hop = age > 0 && age < 1.1 ? Math.sin(age / 1.1 * Math.PI) ** 2 : 0;
  let reach = Math.min(1, Math.max(0, (y - .78) / .12));
  if (y >= REST_Y - .02) {
    const since = now - (Number.isFinite(landedAt) && landedAt <= now ? landedAt : 0), k = since % PAT_EVERY;
    reach = k < PAT_S ? Math.sin(k / PAT_S * Math.PI) : 0;
  }
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

/** How firmly the yarn is drawn to your pitch, per second of `tau`: a critically damped spring that settles in about the time a plain lag would. */
const SPRING = 1.6;
/** Falling when you're quiet: a soft pull down, against plenty of air (field fractions per second). */
const FALL = { pull: 1.5, drag: 2.5 };

/**
 * Follows the voice: readings in, a smooth height out. A median of the last few readings steadies
 * it, a sudden octave leap waits for agreement, and through a brief unvoiced gap (a consonant, a
 * breath between words) the yarn holds where it was. The yarn has a little weight: it eases into
 * a rise rather than jumping, and after a longer quiet it floats gently down to rest on the floor.
 * Times are seconds on any one clock.
 */
export function follower(range: [number, number], mode: Mode) {
  const feel = FEEL[mode];
  const recent: (number | null)[] = [];
  let pending: number[] = [];
  let target: number | null = null; // semitones
  let lastVoiced = -Infinity, mutedUntil = -Infinity;
  let y = REST_Y, v = 0;
  const lo = hzToMidi(range[0]), span = hzToMidi(range[1]) - lo;
  const w = SPRING / feel.tau;
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
    /**
     * Ignore what the mic hears until `until` (Lilt is making a sound). If your voice is holding the
     * yarn up at `now`, it stays up through the sound rather than sagging.
     */
    mute(until: number, now = -Infinity) {
      mutedUntil = until;
      if (target !== null && now - lastVoiced <= feel.hold) lastVoiced = Math.max(lastVoiced, until - feel.hold / 2);
    },
    /** Moves the yarn on by `dt` seconds; returns its height and whether your voice is holding it up. */
    step(t: number, dt: number): { y: number; afloat: boolean } {
      const afloat = target !== null && t - lastVoiced <= feel.hold;
      if (afloat) {
        // the exact step of a critically damped spring: smooth from any speed, steady at any frame rate
        const x = y - uToY((target! - lo) / span), k = v + w * x, e = Math.exp(-w * dt);
        y = y - x + (x + k * dt) * e;
        v = (v - w * k * dt) * e;
      } else {
        // float down, like yarn through air; it lifts off again the moment you make a sound
        v += (FALL.pull - FALL.drag * v) * dt;
        y += v * dt;
        if (t - lastVoiced > 1.5) { target = null; recent.length = 0; pending = []; }
      }
      if (y >= REST_Y) { y = REST_Y; v = Math.min(v, 0); }
      return { y, afloat };
    },
    get y() { return y; },
    /** How fast the yarn is moving (field fractions per second, positive is down). */
    get v() { return v; },
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

/** Whether a sentence's tune tends to rise at the end or fall. */
export type Tune = "rise" | "fall";

/**
 * A loop of yarn. `at` is when (game seconds) it reaches the yarn; `u` where it hangs in your range.
 * Loops dealt together (a glide, or the start and end of a sentence) share a `group`; a sentence's
 * pair also carries its `tune`.
 */
export interface Loop { id: number; at: number; u: number; r: number; hue: number; state: "ahead" | "through" | "by"; group?: number; tune?: Tune }

/** Seconds between a sentence's two loops: about as long as an everyday line takes to say. */
export const SAY_S = 2;

/**
 * Deals loops ahead of time. Gentle by design: no two come closer than about two seconds apart, and
 * no loop is more than about a third of your range from the last. Humming opens middle, high, low
 * (so you hear and feel the difference); now and then three come on a slow slope, or five on a
 * longer, eased glide, like a siren. Speaking comes in pairs, the start and end of a sentence: a
 * rising pair for a line whose tune lifts at the end, a falling pair for one that settles.
 */
export function loopMaker(mode: Mode, seed = 1) {
  const feel = FEEL[mode], rand = rng(seed);
  const opening = mode === "hum" ? [0.5, 0.8, 0.2] : [];
  let id = 0, at = 3.5, u = 0.5, groups = 0;
  const clampU = (x: number) => Math.min(feel.high, Math.max(feel.low, x));
  const loop = (a: number, uu: number, extra: Partial<Loop> = {}): Loop => ({ id: ++id, at: a, u: uu, r: feel.ring, hue: id % 4, state: "ahead", ...extra });
  return {
    /** The next few loops (one, a sentence's pair, a slope of three or a glide of five). */
    next(): Loop[] {
      if (id < opening.length) { u = opening[id]; const l = loop(at, u); at += feel.every; return [l]; }
      if (mode === "speak") {
        const tune: Tune = rand() < 0.5 ? "rise" : "fall", group = ++groups, hue = group % 4;
        const [from, to] = tune === "rise" ? [0.28 + rand() * 0.06, 0.6 + rand() * 0.08] : [0.56 + rand() * 0.08, 0.27 + rand() * 0.05];
        const out = [loop(at, clampU(from), { group, tune, hue }), loop(at + SAY_S, clampU(to), { group, tune, hue })];
        u = out[1].u; at += SAY_S + feel.every * (0.9 + rand() * 0.25);
        return out;
      }
      if (rand() < 0.18) {
        // a glide: five loops easing from here across about half your range
        const dir = u > 0.5 ? -1 : 1, total = 0.4 + rand() * 0.12, gap = feel.every * 0.42, group = ++groups, hue = group % 4;
        const out = [0, 1, 2, 3, 4].map((k) => loop(at + k * gap, clampU(u + dir * total * (1 - Math.cos(k / 4 * Math.PI)) / 2), { group, hue }));
        u = out[4].u; at += 4 * gap + feel.every;
        return out;
      }
      if (rand() < 0.25) {
        const dir = u > (feel.low + feel.high) / 2 ? -1 : 1, stepU = 0.08 + rand() * 0.05, gap = feel.every * 0.42, group = ++groups, hue = group % 4;
        const out = [0, 1, 2].map((k) => loop(at + k * gap, clampU(u + dir * stepU * k), { group, hue }));
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

/** How far from a loop's middle the yarn (at height `y`, radius `ball`, both field fractions) can be and still go through. */
const opening = (loop: Loop, ball: number) => Math.max(0.01, loop.r - ball * 0.5);
/** Does the yarn pass through this loop's opening? */
export const threads = (y: number, loop: Loop, ball = 0) => Math.abs(y - uToY(loop.u)) <= opening(loop, ball);

/** The loop the yarn is heading for: the first one still ahead of it. */
export const nextLoop = (loops: Loop[], now: number) => loops.find((l) => l.state === "ahead" && l.at >= now) ?? null;

/**
 * How lined up the yarn is with a loop: 1 near its middle, easing to 0 a little beyond its edge.
 * Only for a soft glow on the loop, so you can feel the height before you get there; never counted.
 */
export function lineUp(y: number, loop: Loop, ball = 0) {
  const room = opening(loop, ball), off = Math.abs(y - uToY(loop.u));
  return Math.min(1, Math.max(0, 1 - (off - room * 0.4) / (room * 1.1)));
}

/** The colours wound onto the ball: each threaded loop adds its own, the newest outermost, a few at a time. */
export const wind = (wound: number[], hue: number, keep = 4) => [...wound, hue].slice(-keep);

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

/** Where a place in your range is, in words: "the top of your range", "the middle", "the bottom". */
export const placeWords = (u: number) => (u >= 0.67 ? "the top of your range" : u <= 0.33 ? "the bottom of your range" : "the middle of your range");

/**
 * What to tell someone who can't see the field as a loop comes near: where it hangs, or where a
 * glide goes. Only the first loop of a glide is described; null for the rest of it.
 */
export function loopNews(loop: Loop, loops: Loop[]): string | null {
  if (!loop.group) return `A loop is coming, near ${placeWords(loop.u)}.`;
  const group = loops.filter((l) => l.group === loop.group);
  if (group[0] !== loop) return null;
  const last = group[group.length - 1];
  if (group.length < 3 || placeWords(loop.u) === placeWords(last.u)) return `A few loops are coming, near ${placeWords(loop.u)}.`;
  return `A glide is coming, from ${placeWords(loop.u).replace(" of your range", "")} ${last.u > loop.u ? "up" : "down"} to ${placeWords(last.u)}.`;
}

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

// Questions that begin like this usually lift at the end; ones with a question word, and statements, settle.
const YES_NO = /^(is|are|am|was|were|do|does|did|can|could|will|would|shall|should|may|might|have|has|had|isn't|aren't|don't|doesn't|didn't|can't|won't)\b/i;

/** The tune a line tends to have: a yes/no question rises at the end, most other lines fall. Gentle guidance, not a rule. */
export const tuneOf = (line: string): Tune => {
  const t = line.trim();
  if (!t.endsWith("?")) return "fall";
  // "Hi, could I…?" and "Sorry, is…?" count by what follows the greeting
  return [t, t.slice(t.indexOf(",") + 1).trim()].some((s) => YES_NO.test(s)) ? "rise" : "fall";
};

/**
 * Picks a line with the given tune, other than `not` where there's a choice; any line if none has that tune.
 * `r` is a random number in [0, 1).
 */
export function lineFor(lines: string[], tune: Tune, r: number, not = -1): number {
  const fits = lines.map((l, i) => i).filter((i) => tuneOf(lines[i]) === tune);
  const pool = (fits.length ? fits : lines.map((_, i) => i)).filter((i) => i !== not);
  return pool.length ? pool[Math.floor(r * pool.length)] : Math.max(0, not);
}

/**
 * The thread you spun, for the end card: where in your range your voice was across the whole game,
 * as `n` even steps of time (the middle reading of each), null where you were quiet. Kept a little
 * either side of the range so a stray note stays on the card. Nothing is saved.
 */
export function spunThread(frames: ContourPoint[], range: [number, number], n = 120): (number | null)[] {
  const pts = cleanContour(frames).filter((p) => (p.line ?? p.hz) !== null);
  if (pts.length < 20) return [];
  const t0 = frames[0].t, span = Math.max(1e-6, frames[frames.length - 1].t - t0);
  const bins: number[][] = Array.from({ length: n }, () => []);
  for (const p of pts) bins[Math.min(n - 1, Math.floor((p.t - t0) / span * n))].push(pitchToU((p.line ?? p.hz)!, range));
  return bins.map((b) => {
    if (b.length < 3) return null;
    const s = [...b].sort((x, y) => x - y)[b.length >> 1];
    return Math.min(1.2, Math.max(-0.2, s));
  });
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
