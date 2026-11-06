// How Practice names and groups a course's chapters and texts.
import { introductionSteps } from "./markdown.ts";

/** A chapter's intro without the "NHS Fife:" or "Lilt's choice:" it used to start with. */
export const howTo = (basis: string) => { const s = basis.replace(/^(NHS Fife( progression)?|Lilt's choice):\s*/i, ""); return s.charAt(0).toUpperCase() + s.slice(1); };

/** Voice care steps ("Be gentle", "Take care…") are tinted with a heart. */
export const isCare = (label: string) => /gentle|care/i.test(label);

/**
 * A chapter's intro as its opening line and its **Label.** steps, labels tidied ("On track when"
 * reads "Signs it's working"). Null when the intro isn't written as steps.
 */
export function chapterSteps(basis: string): { lede: string; tips: { label: string; body: string }[] } | null {
  const steps = introductionSteps(howTo(basis));
  if (!steps) return null;
  return {
    lede: steps.lede,
    tips: steps.tips.map(({ label, body }) => /^on track when$/i.test(label.trim())
      ? { label: "Signs it's working", body: body.charAt(0).toUpperCase() + body.slice(1) }
      : { label: label.replace(/[.:]$/, ""), body }),
  };
}

/** A word you'd read: three or more letters once repeats are collapsed ("hello" yes; "mmmee", "brrrr", "ng" no). */
const hasWord = (text: string) => (text.match(/\p{L}+/gu) ?? []).some((w) => w.toLowerCase().replace(/(\p{L})\1+/gu, "$1").length >= 3);

/**
 * A text's name in the sidebar: its words, or for a vocalise with none ("mmm ↗ ↘", "eeeeee") its id
 * made readable ("forward-hum" → "Forward hum"). An id under three letters says less than the text.
 */
export function textLabel(text: string, id: string): string {
  if (isLong(text)) return passageTitle(id);
  return hasWord(text) || id.length < 3 ? text : idLabel(id);
}

/** Words in a text, for reading times. */
export const wordCount = (text: string) => (text.match(/\p{L}[\p{L}'’-]*/gu) ?? []).length;
/** A passage long enough to want a title of its own (about 40 words and up). */
export const isLong = (text: string) => wordCount(text) >= 40;
/** About how long a passage takes to read aloud, at an easy 150 words a minute. */
export const readingTime = (text: string) => `about ${Math.max(1, Math.round(wordCount(text) / 150))} min`;
/** A passage's title from its id: "night-bus-2" → "Night bus, part 2", "sky-blue" → "Sky blue". */
export function passageTitle(id: string): string {
  const part = id.match(/^(.*)-(\d+)$/);
  return part ? `${idLabel(part[1])}, part ${part[2]}` : idLabel(id);
}

/** A text id made readable: "hum-to-hello" → "Hum to hello", "ng" → "Ng". */
export function idLabel(id: string): string {
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

/** Whether two labels say the same thing ("Warm-ups" and "Warm-up"), so a tag needn't repeat its chapter. */
export const sameLabel = (a: string, b: string) => {
  const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}]/gu, "").replace(/s$/, "");
  return plain(a) === plain(b);
};
