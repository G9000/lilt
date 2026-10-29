// Read-along: a local, approximate estimate of which word you're on, from the beats
// of your syllables (loudness peaks while you speak). No speech recognition and
// nothing leaves the browser. It's a reading guide, not a transcript.

export interface Token { text: string; word: boolean; syllables: number; index: number }

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let wi = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    const letters = part.toLowerCase().replace(/[^a-z0-9']/g, "");
    const isWord = letters.length > 0;
    out.push({ text: part, word: isWord, syllables: isWord ? estimateSyllables(letters) : 0, index: isWord ? wi++ : -1 });
  }
  return out;
}

export function estimateSyllables(w: string): number {
  if (/^\d+$/.test(w)) return Math.max(1, Math.min(4, w.length + 1));
  if (/^m+$|^n+$/.test(w)) return 1; // "mmmmmmm"
  const groups = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Tuned by grid search on three macOS synthetic voices (Samantha, Daniel, Karen).
// Connected speech merges some syllables, so detected beats undercount by about a
// third; BEAT_GAIN compensates. Approximate for real voices; tapping a word corrects it.
const RISE_SMOOTH = 0.3;
const RISE_RATIO = 1.12;
const DIP_RATIO = 0.86;
const MIN_GAP_S = 0.1;
const BEAT_GAIN = 1.35;

export interface Follower {
  /** Feed one live frame (time in s, rms). Returns the current word index. */
  push: (t: number, rms: number, voiced: boolean) => number;
  /** Jump to a word (when the reader taps it). */
  jumpTo: (wordIndex: number, t: number) => void;
  /** Time each word first became current (s since tracking started), or null. */
  starts: () => (number | null)[];
  current: () => number;
}

export interface FollowerTuning { riseSmooth: number; riseRatio: number; dipRatio: number; minGapS: number; gain: number }
export const DEFAULT_TUNING: FollowerTuning = { riseSmooth: RISE_SMOOTH, riseRatio: RISE_RATIO, dipRatio: DIP_RATIO, minGapS: MIN_GAP_S, gain: BEAT_GAIN };

export function createFollower(tokens: Token[], tune: FollowerTuning = DEFAULT_TUNING): Follower {
  const words = tokens.filter((t) => t.word);
  const cum: number[] = [];
  let acc = 0;
  for (const w of words) { cum.push(acc); acc += w.syllables; }
  const total = acc;
  const starts: (number | null)[] = words.map(() => null);
  let count = 0, cur = -1;
  // Peak/dip detector on the loudness envelope: a syllable is a rise from a local dip,
  // re-armed once loudness falls back from its local peak. Connected speech rarely goes
  // quiet between syllables, so this looks for modulation rather than silence.
  let env = 0, peak = 0.02, armed = true, lastOnset = -1, localMin = 1, localMax = 0;

  const indexFor = (c: number) => {
    let i = 0;
    while (i + 1 < cum.length && cum[i + 1] <= c) i++;
    return i;
  };
  const setCur = (i: number, t: number) => {
    if (i !== cur) {
      cur = i;
      if (starts[i] === null) starts[i] = t;
    }
  };

  return {
    push(t, rms, voiced) {
      env = env * tune.riseSmooth + rms * (1 - tune.riseSmooth);
      peak = Math.max(peak * 0.997, env);
      const floor = Math.max(0.01, peak * 0.1);
      if (armed) {
        localMin = Math.min(localMin, env);
        if (env > floor && env > localMin * tune.riseRatio + 0.003 && voiced && t - lastOnset > tune.minGapS) {
          armed = false;
          lastOnset = t;
          localMax = env;
          if (cur === -1) setCur(0, t);
          else count = Math.min(total - 0.5, count + tune.gain);
          setCur(indexFor(count), t);
        }
      } else {
        localMax = Math.max(localMax, env);
        if (env < localMax * tune.dipRatio || env < floor) { armed = true; localMin = env; }
      }
      return cur;
    },
    jumpTo(i, t) {
      count = cum[Math.max(0, Math.min(i, cum.length - 1))] ?? 0;
      cur = -2; // force setCur to record
      setCur(Math.max(0, Math.min(i, words.length - 1)), t);
    },
    starts: () => starts,
    current: () => cur,
  };
}

export interface MarginNote { word: number | null; text: string; source: string }

/** Up to three margin notes: the text's own hint (general), plus sourced cues anchored to words. */
export function notesFor(levelId: string, hint: string, tokens: Token[]): MarginNote[] {
  const words = tokens.filter((t) => t.word);
  const notes: MarginNote[] = [];
  const h = hint.toLowerCase();
  const firstWhere = (re: RegExp) => words.find((w) => re.test(w.text.toLowerCase()))?.index;
  if (hint) notes.push({ word: null, text: hint, source: "This text's hint" });
  if ((levelId === "resonance" || levelId === "warmup" || levelId === "m-words") && !/hold the m/.test(h)) {
    const m = firstWhere(/^[mn]/);
    if (m !== undefined) notes.push({ word: m, text: "Hold the m a little longer at first.", source: "NHS Fife, Activity 1" });
  }
  if ((levelId === "reading" || levelId === "sentences") && !/\bm\b|buzz|m's/.test(h)) {
    const m = firstWhere(/^[mnl]/);
    if (m !== undefined) notes.push({ word: m, text: "Feel the buzz of the m, n or l up front.", source: "Lilt reading cue, from the forward hum activity" });
  }
  if (levelId === "reading" || levelId === "sentences" || levelId === "passages" || levelId === "phrases" || levelId === "real-life") {
    const c = words.find((w, i) => i < words.length - 1 && /[,;:]$/.test(w.text))?.index;
    if (c !== undefined && !/comma/.test(h)) notes.push({ word: c, text: "A comma: breathe here if you need to.", source: "Lilt reading cue" });
  }
  return notes.slice(0, 3);
}
