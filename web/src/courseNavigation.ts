import { DEFAULT_COURSE } from "./courseIds.ts";

const KEY = "lilt.practice-course";
export const validCourseId = (id: string) => /^[a-z0-9-]{1,40}$/.test(id);

export function routeSegments(path: string): string[] {
  return path.split("/").filter(Boolean).map(segment => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
}

export function practicePath(course: string, chapter?: string, item?: string): string {
  const base = course === DEFAULT_COURSE ? "/studio" : `/learn/${encodeURIComponent(course)}`;
  return chapter ? `${base}${course === DEFAULT_COURSE ? "" : "/chapter"}/${encodeURIComponent(chapter)}${item ? `/${encodeURIComponent(item)}` : ""}` : base;
}

export function dailyPath(course: string, card?: string | null): string {
  const base = course === DEFAULT_COURSE ? "/deck" : `/learn/${encodeURIComponent(course)}/today`;
  return `${base}${card ? `?card=${encodeURIComponent(card)}` : ""}`;
}

export function flashcardsPath(course: string, chapter?: string): string {
  return `/flashcards${chapter ? `/${encodeURIComponent(chapter)}` : ""}${course === DEFAULT_COURSE ? "" : `?course=${encodeURIComponent(course)}`}`;
}

/** An explicit practice link wins over the remembered course, including old voice links. */
export function routeCourse(path: string, params: URLSearchParams): string | null {
  const [section, course] = routeSegments(path);
  if (section === "learn") return course ?? "";
  if (section === "flashcards") return params.get("course") ?? DEFAULT_COURSE;
  if (["studio", "deck", "guided", "practice", "texts"].includes(section)) return DEFAULT_COURSE;
  return null;
}

export function savedCourse(): string {
  try { const id = localStorage.getItem(KEY); return id && validCourseId(id) ? id : DEFAULT_COURSE; }
  catch { return DEFAULT_COURSE; }
}

export function rememberCourse(course: string) {
  if (!validCourseId(course)) return;
  try { localStorage.setItem(KEY, course); } catch { /* This visit still follows the selected course. */ }
}
