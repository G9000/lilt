/**
 * One plain-language observation about a take, and one thing to try next. It describes the
 * recording, never grades it: comfort comes first, then where the pitch went, then how it moved.
 */

export interface InsightInput {
  median: number | null;
  /** 10th–90th percentile span, in semitones. */
  spanSt: number | null;
  /** The comfortable range from the profile, in Hz. */
  band: [number, number] | null;
  /** The measured pitch over time (null where unvoiced). */
  pts: { t: number; hz: number | null }[];
  /** What the card asked for (`takeStyle`); unset when the take isn't from a card. */
  style?: TakeStyle;
  /** The analysis's quality flags (clipping, low signal, ...): any of them and there's no suggestion. */
  flags?: string[];
}

export interface Insight { note: string; cue: string }

/**
 * What a card asks of the voice: "steady" for hums and counting, where a level pitch is the point;
 * "speech" for phrases, sentences, passages and your own words, where pitch should move. Null: unknown.
 */
export type TakeStyle = "steady" | "speech" | null;
/** What `takeStyle` reads from a card (a deck card, or a chapter text described the same way). */
export interface CardKind { kind: string; text_kind: string; front: string }
export function takeStyle(card: CardKind | null | undefined): TakeStyle {
  if (!card) return null;
  if (card.kind === "exercise") return /^hum\b/i.test(card.front) ? "steady" : "speech";
  if (card.text_kind === "hum" || card.text_kind === "automatic") return "steady";
  return ["phrases", "sentences", "passage", "prompt"].includes(card.text_kind) ? "speech" : null;
}

/**
 * Under this many seconds of clear pitch the contour is too patchy to describe. Seconds, not a share of
 * the take: speech is only 25–60% voiced (pauses, consonants), so a share would silence ordinary takes.
 */
const MIN_VOICED_S = 1;

/** Seconds of the take with a pitch, from the frames' own spacing. */
function voicedSeconds(pts: InsightInput["pts"]): number {
  if (pts.length < 2) return 0;
  const step = (pts[pts.length - 1].t - pts[0].t) / (pts.length - 1);
  return pts.filter((p) => p.hz).length * step;
}

const st = (a: number, b: number) => 12 * Math.log2(a / b);
const mid = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };

/** How far the last fifth of the voiced take sits below the rest, in semitones (positive = lower). */
export function endDropSt(pts: InsightInput["pts"]): number | null {
  const voiced = pts.filter((p) => p.hz).map((p) => p.hz as number);
  if (voiced.length < 20) return null;
  const cut = Math.floor(voiced.length * 0.8);
  const head = mid(voiced.slice(0, cut)), tail = mid(voiced.slice(cut));
  return head && tail ? st(head, tail) : null;
}

export function describeTake({ median, spanSt, band, pts, style = null, flags = [] }: InsightInput): Insight | null {
  if (!median || flags.length > 0 || voicedSeconds(pts) < MIN_VOICED_S) return null;
  if (band && median > band[1] * 1.03) return {
    note: "This take sat above your comfortable range.",
    cue: "If it felt easy and this is the note you've been working towards, move your range up to match it. If there was any strain, ease back down a little next time.",
  };
  const drop = endDropSt(pts);
  if (drop !== null && drop >= 2) return {
    note: "Your voice settled lower towards the end.",
    cue: "Keep the last few words as light and bright as the first ones.",
  };
  if (band && median < band[0] * 0.97) return {
    note: "This take sat a little below your comfortable range.",
    cue: "If it felt natural, that's fine. To lift it, start with a short hum on your comfortable note.",
  };
  if (style === "steady") {
    if (spanSt !== null && spanSt > 10) return {
      note: "Your pitch moved around quite a bit for a steady exercise.",
      cue: "Settle on one comfortable note and stay there, gently.",
    };
    if (spanSt !== null && spanSt < 3) return {
      note: "Nice and steady, which is what this one asks for.",
      cue: "Keep the note easy and light, and notice how it feels so you can find it again.",
    };
  }
  if (spanSt !== null && spanSt < 3) return style === "speech" ? {
    note: "Your pitch stayed quite level the whole way through.",
    cue: "Let it rise and fall a little more, the way it would if you were telling a friend.",
  } : {
    note: "Your pitch stayed quite level the whole way through.",
    cue: "For a hum or a held note, that's just right. If it was something you'd say out loud, let it rise and fall a little more.",
  };
  if (style !== "steady" && spanSt !== null && spanSt > 10) return {
    note: "There's a lot of movement in this one.",
    cue: "Lovely and expressive. If it felt effortful anywhere, smooth out the biggest jumps.",
  };
  return {
    note: band ? "Steady, and right in your comfortable range." : "A steady take, with a natural amount of movement.",
    cue: "Keep it just like this. Notice how it feels, so you can find it again.",
  };
}

/** Where a speaking pitch sits against the average man's and woman's voices, in words and semitones. Never a score. */
export interface PitchRef { men_mean: number; men_sd: number; women_mean: number; women_sd: number; overlap_low: number; overlap_high: number }

export function placePitch(hz: number, r: PitchRef): string {
  const womenLow = r.women_mean - r.women_sd, womenHigh = r.women_mean + r.women_sd, menHigh = r.men_mean + r.men_sd;
  const zone = hz > womenHigh ? "above the average woman's range"
    : hz >= womenLow ? "within the average woman's range"
    : hz >= r.overlap_low && hz <= r.overlap_high ? "in the overlap, where pitch alone can be heard either way"
    : hz > menHigh ? "between the average man's and woman's ranges"
    : hz >= r.men_mean - r.men_sd ? "within the average man's range"
    : "below the average man's range";
  // Measured from the overlap, not from the average woman: the middle is a real place to aim for too.
  const above = Math.round(st(hz, r.overlap_high) * 2) / 2, below = Math.round(st(r.overlap_low, hz) * 2) / 2;
  const semis = (n: number) => `about ${n} semitone${n === 1 ? "" : "s"}`;
  const relation = hz >= r.overlap_low && hz <= r.overlap_high ? null
    : hz > r.overlap_high ? (above === 0 ? "just above the overlap" : `${semis(above)} above the overlap (${r.overlap_high} Hz)`)
    : (below === 0 ? "just below the overlap" : `${semis(below)} below the overlap (${r.overlap_low} Hz)`);
  return relation ? `${Math.round(hz)} Hz sits ${zone}, ${relation}.` : `${Math.round(hz)} Hz sits ${zone}.`;
}

/**
 * A resonance change in words: `st` is how far F2/F3 moved since `than` (a take of the same text), in
 * semitones, positive brighter. Under 0.5 st is about the same; 0.5–1 st is "a little", because
 * synthetic vowels were misread by up to ~1 st at the extremes (analysis/EVALUATION.md). Never a score.
 */
export function describeResonance(st: number, than: string): string {
  const a = Math.abs(st), way = st > 0 ? "brighter" : "darker";
  if (a < 0.5) return `About the same as ${than}.`;
  if (a < 1) return `A little ${way} than ${than}.`;
  const n = a < 1.75 ? "about a semitone" : `about ${Math.round(a)} semitones`;
  return `${way[0].toUpperCase()}${way.slice(1)} than ${than}, by ${n}.`;
}
