// Text ids, shared by takes, cards and progress (the same rule as server/src/courses.rs).

/** The course the Practice app shows. */
export const DEFAULT_COURSE = "voice";

/** A text's id for takes, cards and progress: the app's course keeps `text.<chapter>.<text>`; others are `<course>/text.<chapter>.<text>` (as on the server). */
export const textId = (course: string, chapter: string, text: string) =>
  course === DEFAULT_COURSE ? `text.${chapter}.${text}` : `${course}/text.${chapter}.${text}`;

/** The course, chapter and text a text id names, or null for other prompts. */
export function parseTextId(id: string): { course: string; chapter: string; text: string } | null {
  const slash = id.indexOf("/");
  const course = slash > 0 ? id.slice(0, slash) : DEFAULT_COURSE;
  const rest = slash > 0 ? id.slice(slash + 1) : id;
  if (!rest.startsWith("text.")) return null;
  const [chapter, ...text] = rest.slice(5).split(".");
  return chapter && text.length ? { course, chapter, text: text.join(".") } : null;
}
