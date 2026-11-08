// One recording runs up to two minutes, then stops and saves by itself: long enough for a reading or a
// voice check, short enough to keep a take easy on the voice. Lilt says so before it happens and after,
// so a take is never cut off without a word.

/** The longest single recording, in seconds. */
export const TAKE_MAX_S = 120;
/** How long before the end Lilt starts saying when it will stop. */
const WARN_S = 15;

/** While recording: nothing until the last few seconds, then when it stops and how long is left. */
export function limitNote(elapsed: number, max = TAKE_MAX_S): string | null {
  const left = Math.ceil(max - elapsed);
  if (left > WARN_S) return null;
  return `Stops at ${minutes(max)} · ${Math.max(0, left)} s left`;
}

/** After the limit stopped a take: it's kept, and how to carry on. */
export function cappedNote(max = TAKE_MAX_S): string {
  return `Stopped at ${minutes(max)} and saved. Record again to carry on.`;
}

const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
