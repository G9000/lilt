// How Practice names and groups a course's chapters and texts.

/** A word you'd read: three or more letters once repeats are collapsed ("hello" yes; "mmmee", "brrrr", "ng" no). */
const hasWord = (text: string) => (text.match(/\p{L}+/gu) ?? []).some((w) => w.toLowerCase().replace(/(\p{L})\1+/gu, "$1").length >= 3);

/**
 * A text's name in the sidebar: its words, or for a vocalise with none ("mmm ↗ ↘", "eeeeee") its id
 * made readable ("forward-hum" → "Forward hum"). An id under three letters says less than the text.
 */
export function textLabel(text: string, id: string): string {
  if (hasWord(text) || id.length < 3) return text;
  const name = id.replace(/[-_]+/g, " ").trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Chapters in order, in runs of the same `part` ("Get ready", "The skills"…); null where a chapter names none. */
export function byPart<T extends { part?: string | null }>(levels: T[]): { part: string | null; levels: T[] }[] {
  const out: { part: string | null; levels: T[] }[] = [];
  for (const l of levels) {
    const part = l.part?.trim() || null;
    const last = out[out.length - 1];
    if (last && last.part === part) last.levels.push(l);
    else out.push({ part, levels: [l] });
  }
  return out;
}
