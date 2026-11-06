// Flashcards: a chapter dealt out as cards, gone through at your own pace, apart from Today.
import type { TextItem, TextLevel } from "./api";
import { chapterSteps, howTo, isCare } from "./chapters.ts";

export type Flashcard =
  /** The chapter's opening paragraph (or its whole intro, when that isn't written as steps). */
  | { kind: "lede"; id: string; markdown: string }
  /** One **Label.** step of the intro; `n` counts the steps that aren't voice care. */
  | { kind: "step"; id: string; label: string; body: string; care: boolean; n: number; of: number }
  | { kind: "video"; id: string; video: NonNullable<TextLevel["video"]> }
  /** A text to say: it needs a take before it can be swiped away. */
  | { kind: "text"; id: string; item: TextItem };

/** A chapter as cards: its opening, each step, its video, then each text. */
export function chapterCards(level: TextLevel): Flashcard[] {
  const out: Flashcard[] = [];
  const steps = chapterSteps(level.basis);
  const intro = steps ? steps.lede : howTo(level.basis).trim();
  if (intro) out.push({ kind: "lede", id: `${level.id}:intro`, markdown: intro });
  const counted = (steps?.tips ?? []).filter((t) => !isCare(t.label)).length;
  let n = 0;
  (steps?.tips ?? []).forEach((t, i) => {
    const care = isCare(t.label);
    if (!care) n += 1;
    out.push({ kind: "step", id: `${level.id}:step-${i}`, label: t.label, body: t.body, care, n, of: counted });
  });
  if (level.video) out.push({ kind: "video", id: `${level.id}:video`, video: level.video });
  for (const item of level.items) out.push({ kind: "text", id: `${level.id}:text-${item.id}`, item });
  return out;
}

/** Where you are in one chapter: the cards you've swiped away, and the order of the rest. */
export interface Run { got: string[]; order: string[] }
export const EMPTY: Run = { got: [], order: [] };

/** The cards still to go, top first: in the run's order, then any the chapter gained since. */
export function pile(cards: Flashcard[], run: Run): Flashcard[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const got = new Set(run.got);
  const first = run.order.filter((id) => byId.has(id) && !got.has(id));
  const placed = new Set(first);
  return [...first.map((id) => byId.get(id)!), ...cards.filter((c) => !got.has(c.id) && !placed.has(c.id))];
}

/** Swipe the top card: right, got it (it leaves this run); left, see it again (it goes to the back). */
export function swipe(cards: Flashcard[], run: Run, dir: "got" | "again"): Run {
  const [top, ...rest] = pile(cards, run);
  if (!top) return run;
  // Cards the chapter no longer has drop out of the run.
  const known = new Set(cards.map((c) => c.id));
  const got = run.got.filter((id) => known.has(id));
  return dir === "got"
    ? { got: [...got, top.id], order: rest.map((c) => c.id) }
    : { got, order: [...rest, top].map((c) => c.id) };
}

/** How many of a chapter's cards you've swiped away, of all of them. */
export const progress = (cards: Flashcard[], run: Run) => ({ got: cards.filter((c) => run.got.includes(c.id)).length, total: cards.length });

/* Runs are kept in this browser, one per chapter, with the chapter you were last on. */
const KEY = "lilt.flashcards.v1";
type Saved = { last?: string; runs: Record<string, Run> };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const cardIds = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];

export function loadRuns(): Saved {
  // Chapter ids come from editable courses, so none should inherit Object's properties.
  const saved: Saved = { runs: Object.create(null) };
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!record(value)) return saved;
    if (typeof value.last === "string" && value.last) saved.last = value.last;
    if (record(value.runs)) {
      for (const [chapter, run] of Object.entries(value.runs)) {
        if (record(run)) saved.runs[chapter] = { got: cardIds(run.got), order: cardIds(run.order) };
      }
    }
  } catch { /* Unavailable storage or broken JSON starts a fresh run. */ }
  return saved;
}
export function saveRun(chapter: string, run: Run) {
  const s = loadRuns();
  s.runs[chapter] = run;
  s.last = chapter;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: the run lasts until you leave */ }
}
