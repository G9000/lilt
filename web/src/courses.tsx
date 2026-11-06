import { pages } from "./ui/pages";
import { cx } from "./ui/cx";
// Every course has shared reading, chapter cards and daily practice. Kinds supply a name and
// tile; the built-in voice course also has its specialised recorder and guided sessions.

import { ReactNode } from "react";
import type { Course } from "./api";

export { DEFAULT_COURSE, parseTextId, textId } from "./courseIds";
import { practicePath } from "./courseNavigation";

export interface Kind {
  label: string;
  /** Two colours for the tile's gradient, and a 24×24 line glyph. */
  tile: [string, string];
  glyph: ReactNode;
  /** Where this course is practised. */
  practice: (c: Course) => string;
}

export const KINDS: Record<string, Kind> = {
  voice: {
    label: "Voice", tile: ["#f59a6c", "#e0643c"],
    glyph: <path d="M5 11.5v1M8 9v6M11 6.5v11M14 9.5v5M17 8v8M20 11v2" />,
    practice: (c) => practicePath(c.id),
  },
  language: {
    label: "Language", tile: ["#7aa6ff", "#3d63d6"],
    glyph: <><path d="M5 6.5h8M9 5v1.5c0 3.5-1.8 6.3-4.5 7.5M7 9.5c1 2 2.7 3.6 5 4.5" /><path d="M12.5 19l3.5-8.5 3.5 8.5M13.8 16h4.4" /></>,
    practice: (c) => practicePath(c.id),
  },
};

const OTHER: Kind = {
  label: "Course", tile: ["#9b8cff", "#6a4fd6"],
  glyph: <path d="M6 5.5h9a3 3 0 013 3v10H9a3 3 0 01-3-3zM6 15.5a3 3 0 013-3h9" />,
  practice: (c) => practicePath(c.id),
};

export const kindOf = (kind: string): Kind => KINDS[kind] ?? OTHER;

/** A kind's tile, as on a course card. */
export function KindTile({ kind, size = 44 }: { kind: string; size?: number }) {
  const k = kindOf(kind);
  return (
    <span className={cx(pages.coTile, "co-tile")} style={{ width: size, height: size, background: `linear-gradient(180deg, ${k.tile[0]}, ${k.tile[1]})` }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{k.glyph}</svg>
    </span>
  );
}
