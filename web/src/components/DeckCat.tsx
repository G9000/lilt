import { cx } from "../ui/cx";
import { practice } from "../ui/practice";
import { useEffect, useRef, useState } from "react";
import { CAT_URL } from "../room/scene";

export type CatMode = "sleep" | "watch" | "awake" | "happy";

/**
 * The room's cat, small, on the edge of the card you're practising. It dozes, perks up and says so
 * while you record, and a heart floats up when you stop. It never reacts to how a take went: only
 * that you said something.
 */
export function DeckCat({ mode, say }: { mode: CatMode; say?: string | null }) {
  const [hearts, setHearts] = useState(0);
  const was = useRef(mode);
  useEffect(() => {
    if (was.current === "watch" && mode !== "watch") setHearts((n) => n + 1);
    was.current = mode;
  }, [mode]);
  return (
    <div className={cx(`dk-cat ${mode}`, practice["dk-cat"])} aria-hidden="true">
      {say && <span className={cx("dk-cat-say", practice["dk-cat-say"])} key={say}>{say}</span>}
      <img src={CAT_URL} alt="" draggable={false} />
      {hearts > 0 && (
        <svg key={hearts} className={cx("dk-cat-heart", practice["dk-cat-heart"])} viewBox="-12 -13 24 20">
          <path d="M0 5C-10-3-6-11 0-6 6-11 10-3 0 5Z" fill="#ff7eb6" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
