import { useEffect, useRef, useState } from "react";
import { api, Deck } from "../api";
import { radio, useRadio } from "./lofi";

/**
 * Small things that float in the room, each over a spot in the painting (painting pixels):
 * the radio over the speaker, your goal on the wall of photos, and the stage in the window.
 * They ride the room's camera; one whose spot is off screen, or that would cover today's cards,
 * steps out of the way.
 */

function Pin({ x, y, delay, children }: { x: number; y: number; delay: number; children: React.ReactNode }) {
  return (
    <div className="fl" style={{ left: x, top: y, ["--d" as string]: `${delay}s` }}>
      <div className="fl-bob">{children}</div>
    </div>
  );
}

export function RoomFloaters({ deck, inside }: { deck: Deck | null; inside: boolean }) {
  const r = useRadio();
  const [goal, setGoal] = useState<string>("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { void api.profile().then((p) => setGoal(p.goal.summary.trim()), () => setGoal("")); }, [inside]);

  // Step out of the way: hide any floater that is off screen or would sit on today's cards.
  useEffect(() => {
    const check = () => {
      const stack = document.querySelector(".cs")?.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      box.current?.querySelectorAll<HTMLElement>(".fl").forEach((el) => {
        el.classList.remove("off");
        el.style.setProperty("--nudge", "0px");
        // the spot stays put; the card slides inward to stay on screen
        const card = el.querySelector<HTMLElement>(".fl-bob > :first-child")!.getBoundingClientRect();
        const spot = (card.left + card.right) / 2;
        const nudge = card.left < 12 ? 12 - card.left : card.right > vw - 12 ? vw - 12 - card.right : 0;
        el.style.setProperty("--nudge", `${nudge}px`);
        const b = { left: card.left + nudge, right: card.right + nudge, top: card.top, bottom: card.bottom };
        const outside = spot < 8 || spot > vw - 8 || b.top < 36 || b.bottom > vh - 8;
        const onCards = stack && !(b.right < stack.left - 8 || b.left > stack.right + 8 || b.bottom < stack.top - 8 || b.top > stack.bottom);
        el.classList.toggle("off", outside || !!onCards);
      });
    };
    check();
    const id = window.setInterval(check, 700);
    window.addEventListener("resize", check);
    return () => { window.clearInterval(id); window.removeEventListener("resize", check); };
  }, [deck, goal]);

  const learned = deck?.learned ?? 0, total = deck?.total_cards ?? 0;
  return (
    <div className={`fls${inside ? " away" : ""}`} ref={box}>
      <Pin x={1262} y={452} delay={0}>
        <div className={`fl-radio${r.playing ? " playing" : ""}`}>
          <div className="ds-disc fl-disc" aria-hidden="true"><div className="ds-label" /></div>
          <div className="fl-r-info">
            <span className="ds-r-k">{r.playing && <span className="ds-eq" aria-hidden="true"><i /><i /><i /></span>}{r.ducked ? "Paused while the mic is on" : r.playing ? "Now playing" : "Lo-fi radio"}</span>
            <b>{r.mood}</b>
            <div className="ds-r-ctl">
              <button className="ds-r-skip" onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
              <button className="ds-r-play" onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? "Pause lo-fi radio" : "Start lo-fi radio"}>
                {r.playing || r.ducked
                  ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2.2v9H3zM6.8 1.5H9v9H6.8z" fill="currentColor" /></svg>
                  : <svg viewBox="0 0 12 12" aria-hidden="true" style={{ marginLeft: 2 }}><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>}
              </button>
              <button className="ds-r-skip" onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
            </div>
          </div>
        </div>
      </Pin>
      {goal && (
        <Pin x={150} y={232} delay={-2.6}>
          <div className="fl-sticky"><i className="fl-washi" aria-hidden="true" /><span>Your goal</span>{goal.length > 90 ? `${goal.slice(0, 88)}…` : goal}</div>
        </Pin>
      )}
      {deck && total > 0 && (
        <Pin x={1215} y={160} delay={-0.7}>
          <div className="fl-card fl-stage">
            <span className="fl-txt"><b>Stage {deck.open_stage} of {deck.stages ?? 7}</b><small>{learned} of {total} cards feel comfortable</small></span>
            <span className="fl-bar"><i style={{ width: `${Math.max(3, (learned / total) * 100)}%` }} /></span>
          </div>
        </Pin>
      )}
    </div>
  );
}
