import { roomStyles } from "./roomStyles";
import { animate, AnimatePresence, motion, type PanInfo, useDragControls, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Deck, DeckItem } from "../api";
import { setSpot, useLayoutStore } from "./Floaters";

/**
 * Today's cards on the room, as a pile: one card per practice card left. Swipe the top card
 * away and it tucks in at the back; tap the card on top (or its arrow) to practise that one.
 */

const KIND: Record<DeckItem["kind"], string> = { warmup: "Warm-up", daily: "Daily", before_after: "Before and after", new: "New", review: "Review", again: "Again", cooldown: "Cool-down" };
const SUB: Record<string, string> = { reference: "The same every day", exercise: "Exercise", text: "Read aloud" };

/** Where a card rests at depth d (0 = top): each one higher, a touch smaller, fanned alternately. */
const rest = (d: number) => ({
  x: d === 0 ? 0 : d % 2 ? -5 : 6,
  y: -d * 10,
  rotate: d === 0 ? 0 : d % 2 ? -1.6 : 1.1,
  scale: 1 - d * 0.025,
  opacity: d > 3 ? 0 : 1,
});
const SPRING = { type: "spring", stiffness: 320, damping: 28, mass: 0.9 } as const;

export function CardStack({ deck, onStart }: { deck: Deck | null; onStart: (cardId: string | null) => void }) {
  const items = deck ? deck.items.filter((i) => !i.done_today) : [];
  const ids = items.map((i) => i.card.id).join(",");
  const [order, setOrder] = useState<string[]>([]);
  // The pile deals in one card at a time the first time it appears; after that, moves are immediate.
  const [dealt, setDealt] = useState(false);
  useEffect(() => { if (!items.length || dealt) return; const id = window.setTimeout(() => setDealt(true), 1300); return () => window.clearTimeout(id); }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new deck (or a finished card) resets the pile to today's order.
  useEffect(() => { setOrder(items.map((i) => i.card.id)); }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(items.map((i) => [i.card.id, i]));
  const pile = order.filter((id) => byId.has(id));
  const n = pile.length;
  const done = !!deck && !deck.paused && n === 0;

  const cycle = (dir: 1 | -1) => setOrder((o) => (o.length < 2 ? o : dir > 0 ? [...o.slice(1), o[0]] : [o[o.length - 1], ...o.slice(0, -1)]));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") { e.preventDefault(); cycle(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); cycle(-1); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(pile[0] ?? null); }
  };
  const top = pile[0] ? byId.get(pile[0])! : null;
  const label = !deck ? "Today's practice, loading" : done ? "Today's practice is done" : deck.paused ? "Resting today"
    : `Today's practice: ${n} card${n === 1 ? "" : "s"}. Card on top: ${top?.card.front}. Swipe or use the arrow keys to see the others; press Enter to start it.`;

  // The whole pile can be moved by its grip (swiping the cards still flips through them). Where
  // you put it is remembered as an offset from its corner, and it always stays on screen.
  const saved = useLayoutStore().stack;
  const sx = useMotionValue(saved?.x ?? 0), sy = useMotionValue(saved?.y ?? 0);
  const grip = useDragControls();
  const self = useRef<HTMLElement>(null);
  const [moving, setMoving] = useState(false);
  /** Offset `p`, nudged so the pile is on screen (measured where it is now, then shifted to `p`; the
   *  CSS `scale` on small windows scales the offset too, so `k` converts screen pixels to offset). */
  const onScreen = (p = { x: sx.get(), y: sy.get() }) => {
    const el = self.current, r = el?.getBoundingClientRect();
    if (!el || !r) return p;
    const vw = window.innerWidth, vh = window.innerHeight, k = r.width / (el.offsetWidth || r.width);
    const ox = (p.x - sx.get()) * k, oy = (p.y - sy.get()) * k;
    const L = r.left + ox, R = r.right + ox, T = r.top + oy, B = r.bottom + oy;
    const dx = L < 6 ? 6 - L : R > vw - 6 ? vw - 6 - R : 0;
    const dy = T < 40 ? 40 - T : B > vh - 6 ? vh - 6 - B : 0;
    return { x: p.x + dx / k, y: p.y + dy / k };
  };
  // Always from where you put it, so a pile squeezed in on a narrow window goes back when it widens.
  const spot = useRef(saved);
  spot.current = saved;
  const fit = () => { const p = onScreen({ x: spot.current?.x ?? 0, y: spot.current?.y ?? 0 }); sx.set(p.x); sy.set(p.y); };
  useEffect(fit, [saved?.x, saved?.y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const placed = () => {
    setMoving(false);
    const p = onScreen();
    const spring = { type: "spring", stiffness: 380, damping: 32 } as const;
    void animate(sx, p.x, spring); void animate(sy, p.y, spring);
    setSpot("stack", Math.hypot(p.x, p.y) < 4 ? null : { x: Math.round(p.x), y: Math.round(p.y) });
  };

  return (
    <motion.section ref={self} className={[`cs${moving ? " moving" : ""}`, roomStyles["cs"]].join(" ")} tabIndex={0} aria-label={label} onKeyDown={onKey}
      style={{ x: sx, y: sy }} drag dragListener={false} dragControls={grip} dragMomentum={false}
      onDragStart={() => setMoving(true)} onDragEnd={placed}>
      <div className={["cs-cards", roomStyles["cs-cards"]].join(" ")}>
        {!deck || done || deck.paused ? (
          <StaticCard title={!deck ? "Getting your cards…" : deck.paused ? "Resting today" : "All done"}
            sub={!deck ? "" : deck.paused ? "Cards that hurt stay paused" : "The lights are on. Nice work."} onStart={() => onStart(null)} />
        ) : (
          <AnimatePresence initial>
            {pile.slice(0, 4).map((id, d) => {
              const it = byId.get(id)!, i = items.indexOf(it);
              return (
                <StackCard key={id} item={it} depth={d} index={i} count={n}
                  first={i === 0} delay={dealt ? 0 : 0.3 + (Math.min(n, 4) - 1 - d) * 0.12} onSwipe={cycle} onStart={() => onStart(id)} />
              );
            })}
          </AnimatePresence>
        )}
      </div>
      {n > 1 && (
        <div className={["cs-dots", roomStyles["cs-dots"]].join(" ")} aria-hidden="true">
          {items.map((it) => <i key={it.card.id} className={it.card.id === pile[0] ? "on" : undefined} />)}
        </div>
      )}
      <button className={["cs-grip", roomStyles["cs-grip"]].join(" ")} aria-label="Move today's cards (drag)" onPointerDown={(e) => { e.preventDefault(); grip.start(e); }}>
        <span className={["cs-grip-tip", roomStyles["cs-grip-tip"]].join(" ")} aria-hidden="true">Drag to move</span>
      </button>
    </motion.section>
  );
}

function StackCard({ item, depth, index, count, first, delay, onSwipe, onStart }: {
  item: DeckItem; depth: number; index: number; count: number; first: boolean; delay: number;
  onSwipe: (dir: 1 | -1) => void; onStart: () => void;
}) {
  const top = depth === 0;
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-200, 0, 200], [-14, 0, 14]);
  const [nudged, setNudged] = useState(false);
  // It's a tap only if the pointer barely moved between press and release.
  const down = useRef<{ x: number; y: number } | null>(null);
  // Once, a small sideways nudge says "this can be swiped".
  useEffect(() => {
    if (!top || count < 2 || nudged) return;
    const id = window.setTimeout(() => {
      setNudged(true);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      void animate(x, [0, -26, 0], { duration: 0.7, ease: "easeInOut" });
    }, 1400);
    return () => window.clearTimeout(id);
  }, [top]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > 90, fast = Math.abs(info.velocity.x) > 450;
    if (count > 1 && (far || fast)) {
      const dir = (Math.sign(info.offset.x || info.velocity.x) || 1) as 1 | -1;
      // fly off either way, then tuck in at the back: the card underneath comes up
      void animate(x, dir * 380, { duration: 0.26, ease: [0.3, 0.6, 0.4, 1] }).then(() => { x.set(0); onSwipe(1); });
    } else {
      void animate(x, 0, SPRING);
    }
  };
  // The outer layer springs to its place in the pile; the inner one follows your finger.
  return (
    <motion.article
      className={[`cs-card${top ? " top" : ""}`, roomStyles["cs-card"]].join(" ")}
      style={{ zIndex: 10 - depth }}
      initial={{ y: 70, opacity: 0, scale: 0.9, rotate: (index - 1) * 6 }}
      animate={rest(depth)}
      exit={{ y: 40, opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      transition={{ ...SPRING, delay }}
      aria-hidden={!top}
    >
     <motion.div
      className={["cs-drag", roomStyles["cs-drag"]].join(" ")}
      style={{ x, rotate: tilt }}
      drag={top ? "x" : false}
      dragMomentum={false}
      dragElastic={count > 1 ? 1 : 0.12}
      dragConstraints={count > 1 ? undefined : { left: 0, right: 0 }}
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={(e) => {
        const d = down.current; down.current = null;
        if (top && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) onStart();
      }}
      onDragEnd={top ? onDragEnd : undefined}
      whileTap={top ? { scale: 0.985 } : undefined}
     >
      <div className={["cs-in", roomStyles["cs-in"]].join(" ")}>
        <div className={["cs-body", roomStyles["cs-body"]].join(" ")}>
          <div className={["cs-head", roomStyles["cs-head"]].join(" ")}><div className={["cs-title", roomStyles["cs-title"]].join(" ")}>Today's practice</div>
            <span className={[`cs-chip${first ? " next" : ""}`, roomStyles["cs-chip"]].join(" ")}>{first ? "Up next" : KIND[item.kind]}</span></div>
          <div className={["cs-kind", roomStyles["cs-kind"]].join(" ")}>{item.card.deck_title} · {SUB[item.card.kind] ?? item.card.kind}</div>
          <div className={["cs-phrase", roomStyles["cs-phrase"]].join(" ")}>{item.card.front}</div>
          {item.card.hint && <div className={["cs-hint", roomStyles["cs-hint"]].join(" ")}>{item.card.hint}</div>}
          <div className={["cs-foot", roomStyles["cs-foot"]].join(" ")}>
            <span className={["cs-count", roomStyles["cs-count"]].join(" ")}><b>{index + 1}</b> of {count}, about {count} minute{count === 1 ? "" : "s"}</span>
            <span className={["cs-go", roomStyles["cs-go"]].join(" ")} aria-hidden="true">Start <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h10M10 5l4 4-4 4" /></svg></span>
          </div>
        </div>
      </div>
      <div className={["cs-shade", roomStyles["cs-shade"]].join(" ")} style={{ opacity: Math.min(0.3, depth * 0.14) }} />
     </motion.div>
    </motion.article>
  );
}

function StaticCard({ title, sub, onStart }: { title: string; sub: string; onStart: () => void }) {
  return (
    <motion.article className={["cs-card top", roomStyles["cs-card"]].join(" ")} onTap={onStart} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING} whileTap={{ scale: 0.985 }}>
      <div className={["cs-drag", roomStyles["cs-drag"]].join(" ")}>
      <div className={["cs-in", roomStyles["cs-in"]].join(" ")}>
        <div className={["cs-body", roomStyles["cs-body"]].join(" ")}>
          <div className={["cs-title", roomStyles["cs-title"]].join(" ")}>Today's practice</div>
          <div className={["cs-phrase", roomStyles["cs-phrase"]].join(" ")}>{title}</div>
          <div className={["cs-kind", roomStyles["cs-kind"]].join(" ")}>{sub}</div>
          <div className={["cs-foot", roomStyles["cs-foot"]].join(" ")}><span className={["cs-count", roomStyles["cs-count"]].join(" ")}>Sit down at the desk</span>
            <span className={["cs-go", roomStyles["cs-go"]].join(" ")} aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h10M10 5l4 4-4 4" /></svg></span></div>
        </div>
      </div>
      </div>
    </motion.article>
  );
}
