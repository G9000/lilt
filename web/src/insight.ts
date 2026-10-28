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
}

export interface Insight { note: string; cue: string }

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

export function describeTake({ median, spanSt, band, pts }: InsightInput): Insight | null {
  if (!median) return null;
  if (band && median > band[1] * 1.03) return {
    note: "This take sat above your comfortable range.",
    cue: "Check it felt easy. If there was any strain at all, ease back down a little next time.",
  };
  const drop = endDropSt(pts);
  if (drop !== null && drop >= 2) return {
    note: "Your voice settled lower towards the end.",
    cue: "Try keeping the last few words as light and bright as the first ones.",
  };
  if (band && median < band[0] * 0.97) return {
    note: "This take sat a little below your comfortable range.",
    cue: "If it felt natural, that's fine. To lift it, start with a short hum on your comfortable note.",
  };
  if (spanSt !== null && spanSt < 3) return {
    note: "Your pitch stayed quite level the whole way through.",
    cue: "Let it rise and fall a little more, the way it would if you were telling a friend.",
  };
  if (spanSt !== null && spanSt > 10) return {
    note: "There's a lot of movement in this one.",
    cue: "Lovely and expressive. If it felt effortful anywhere, smooth out the biggest jumps.",
  };
  return {
    note: band ? "Steady, and right in your comfortable range." : "A steady take, with a natural amount of movement.",
    cue: "Keep it just like this. Notice how it feels, so you can find it again.",
  };
}
