// How the room's sticky note looks: its paper, the washi tape holding it up, and its size.
// Kept in this browser, like the room's appearance; the words on it are saved with your profile.

export const NOTE_PAPERS = {
  butter: { label: 'Butter', top: '#fff7bf', bottom: '#fff0a0', ink: '#4a3f10', faint: '#8a7a2c' },
  peach: { label: 'Peach', top: '#ffeedd', bottom: '#ffdcbf', ink: '#5a3218', faint: '#9a6a4a' },
  blush: { label: 'Blush', top: '#ffe8ee', bottom: '#ffd5e0', ink: '#5a2433', faint: '#9a5a6a' },
  lilac: { label: 'Lilac', top: '#f2eafe', bottom: '#e3d6fa', ink: '#3a2a5a', faint: '#76669a' },
  sky: { label: 'Sky', top: '#e6f2fe', bottom: '#d2e6fa', ink: '#1d3a5a', faint: '#5a7a9a' },
  mint: { label: 'Mint', top: '#e6f8e9', bottom: '#cfeed6', ink: '#1f4a2a', faint: '#56865f' },
} as const;
export type NotePaper = keyof typeof NOTE_PAPERS;

export const NOTE_TAPES = {
  stripes: 'Pink stripes',
  dots: 'Mint dots',
  gingham: 'Lilac gingham',
  grid: 'Blue grid',
  kraft: 'Kraft paper',
  confetti: 'Confetti',
} as const;
export type NoteTape = keyof typeof NOTE_TAPES;

/** Width, and a height it grows from (null: as tall as its words), in CSS pixels at the room's scale. */
export const NOTE_SIZE = { minW: 130, maxW: 300, minH: 90, maxH: 320 } as const;

/** `hand`: written in a handwriting face (Caveat) rather than the app's own. */
export interface NoteStyle { paper: NotePaper; tape: NoteTape; width: number; height: number | null; hand: boolean }
export const DEFAULT_NOTE: NoteStyle = { paper: 'butter', tape: 'stripes', width: 160, height: null, hand: false };
/** The second note starts in other colours, so the two are easy to tell apart. */
export const DEFAULT_NOTE_2: NoteStyle = { paper: 'blush', tape: 'dots', width: 150, height: null, hand: true };
export const NOTE_KEY = 'lilt.room.note';
export const NOTE_KEY_2 = 'lilt.room.note.2';

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Saved choices, with anything unknown or broken falling back to the note's original look. */
export function readNoteStyle(raw: string | null, base: NoteStyle = DEFAULT_NOTE): NoteStyle {
  let v: Record<string, unknown> = {};
  try { const p = JSON.parse(raw ?? '{}'); if (p && typeof p === 'object' && !Array.isArray(p)) v = p; } catch { /* the original note */ }
  return {
    paper: typeof v.paper === 'string' && Object.hasOwn(NOTE_PAPERS, v.paper) ? v.paper as NotePaper : base.paper,
    tape: typeof v.tape === 'string' && Object.hasOwn(NOTE_TAPES, v.tape) ? v.tape as NoteTape : base.tape,
    width: num(v.width) ? clamp(v.width, NOTE_SIZE.minW, NOTE_SIZE.maxW) : base.width,
    height: num(v.height) ? clamp(v.height, NOTE_SIZE.minH, NOTE_SIZE.maxH) : base.height,
    hand: typeof v.hand === 'boolean' ? v.hand : base.hand,
  };
}

/** The note resized to a width and height, kept within what fits the wall. */
export function resized(s: NoteStyle, width: number, height: number): NoteStyle {
  return { ...s, width: clamp(width, NOTE_SIZE.minW, NOTE_SIZE.maxW), height: clamp(height, NOTE_SIZE.minH, NOTE_SIZE.maxH) };
}

export const isDefaultNote = (s: NoteStyle, base: NoteStyle = DEFAULT_NOTE) =>
  s.paper === base.paper && s.tape === base.tape && s.width === base.width && s.height === base.height && s.hand === base.hand;
