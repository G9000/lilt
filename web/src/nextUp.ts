// Which chapter is "next up": where you left off, never a checklist. Chapters are a shelf to
// explore, so skipping a text (or a whole chapter) never pins "Next up" to it.

export interface ChapterProgress { id: string; total: number; done: number }

/**
 * The furthest chapter you've practised in decides: until you've practised about half of its texts
 * you're still in it; after that the next chapter is up. Nothing practised yet: the first chapter.
 * Everything up to the last chapter practised: no next chapter.
 */
export function nextUp(chapters: ChapterProgress[]): string | null {
  let last = -1;
  chapters.forEach((c, i) => { if (c.done > 0) last = i; });
  if (last === -1) return chapters[0]?.id ?? null;
  const here = chapters[last];
  if (here.done * 2 < here.total) return here.id;
  return chapters[last + 1]?.id ?? null;
}
