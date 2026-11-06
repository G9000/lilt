import { DEFAULT_COURSE } from "./courseIds.ts";
import { flashcardsPath, textsPath } from "./courseNavigation.ts";

export function coursePicture(src: string, course = DEFAULT_COURSE): string | undefined {
  if (/^https?:\/\//i.test(src)) return src;
  if (!/^images\/[\w.-]+$/.test(src)) return undefined;
  return course === DEFAULT_COURSE ? `/texts/${src}` : `/courses/${encodeURIComponent(course)}/${src}`;
}

/** Only known chapter links are translated; document anchors and external URLs retain their meaning. */
export function courseLink(href: string, course = DEFAULT_COURSE, chapters: readonly string[] = []): string | undefined {
  if (course === DEFAULT_COURSE) return /^(https?:|#|mailto:)/i.test(href) ? href : undefined;
  const base = `#/learn/${encodeURIComponent(course)}`;
  if (href === "#/studio" || href === "index.md" || href === "./index.md") return base;
  if (href === "#/deck") return `${base}/today`;
  if (href === "#/texts") return `#${textsPath(course)}`;
  if (href === "#/flashcards") return `#${flashcardsPath(course)}`;
  const cards = href.match(/^#\/flashcards\/([^/?#]+)$/);
  if (cards) {
    let chapter: string;
    try { chapter = decodeURIComponent(cards[1]); } catch { return undefined; }
    return chapters.includes(chapter) ? `#${flashcardsPath(course, chapter)}` : undefined;
  }
  const studio = href.match(/^#\/studio\/([^/?#]+)(?:\/([^/?#]+))?$/);
  const relative = href.match(/^(?:\.\/)?([\w-]+)\.md(?:#([\w.-]+))?$/);
  const match = studio ?? relative;
  if (match) {
    let chapter = match[1];
    try { chapter = decodeURIComponent(chapter); } catch { return undefined; }
    if (relative && !chapters.includes(chapter)) chapter = chapter.replace(/^\d+-/, "");
    if (!chapters.includes(chapter)) return undefined;
    return `${base}/chapter/${encodeURIComponent(chapter)}${match[2] ? `/${encodeURIComponent(match[2])}` : ""}`;
  }
  return /^(https?:|#|mailto:)/i.test(href) ? href : undefined;
}
