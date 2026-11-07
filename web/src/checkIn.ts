// What a text's earlier takes say back to you on its chapter page: your first and latest takes of it
// on different days (then and now), and the newest note you left yourself. It describes; nothing is
// graded, and a single day of takes just waits for another day.

export interface TakeLike {
  id: string;
  prompt_id: string;
  created_utc: string;
  local_date?: string | null;
  audio_url?: string | null;
  status: string;
  note: string | null;
}

/** The day a take belongs to: the day you recorded it where you were, else its UTC date. */
export const takeDay = (t: TakeLike) => t.local_date || t.created_utc.slice(0, 10);

/** Every playable take of one text, each once (a later copy wins), oldest first. */
export function takesOf<T extends TakeLike>(promptId: string, ...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const t of list) if (t.prompt_id === promptId) byId.set(t.id, t);
  return [...byId.values()]
    .filter((t) => !!t.audio_url && t.status !== "recording" && t.status !== "saving")
    .sort((a, b) => a.created_utc.localeCompare(b.created_utc));
}

/** Whole days between two YYYY-MM-DD days, counted at noon so clock changes don't matter. */
export function daysApart(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86400000);
}

export interface ThenNow<T> { first: T; latest: T; days: number }

/** Your first take and your latest, once they're on different days. */
export function thenAndNow<T extends TakeLike>(takes: T[]): ThenNow<T> | null {
  if (takes.length < 2) return null;
  const first = takes[0], latest = takes[takes.length - 1];
  const days = daysApart(takeDay(first), takeDay(latest));
  return days > 0 ? { first, latest, days } : null;
}

export const apartWords = (days: number) => (days === 1 ? "a day apart" : `${days} days apart`);

/** The newest note you left on any of these takes (skipping `except`), with the day you left it. */
export function lastNote<T extends TakeLike>(takes: T[], except?: string): { text: string; day: string } | null {
  for (let i = takes.length - 1; i >= 0; i--) {
    const t = takes[i], text = t.note?.trim();
    if (text && t.id !== except) return { text, day: takeDay(t) };
  }
  return null;
}
