import { useEffect, useRef, useState } from "react";
import { api, Deck } from "../api";
import { radio, useRadio } from "./lofi";

/**
 * Small things that float in the room, each pinned to a spot in the painting (painting pixels):
 * the radio over the speaker, this week by the plant, your goal on the wall of photos, and the
 * stage hanging in the window. They ride the room's camera; one whose pin is off screen, or whose
 * card would cover today's cards, steps out of the way.
 */

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function weekDots(today: string, dates: string[]) {
  const d = today ? new Date(`${today}T12:00:00`) : new Date();
  const weekday = (d.getDay() + 6) % 7;
  return DAYS.map((label, i) => {
    const x = new Date(d); x.setDate(d.getDate() - weekday + i);
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { label, done: dates.includes(iso), today: i === weekday };
  });
}

function Pin({ x, y, delay, children }: { x: number; y: number; delay: number; children: React.ReactNode }) {
  return (
    <div className="fl" style={{ left: x, top: y, ["--d" as string]: `${delay}s` }}>
      <div className="fl-bob">{children}<i className="fl-stem" /><i className="fl-pin" /></div>
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
        // the pin stays on its spot; the card slides inward to stay on screen
        const pin = el.querySelector(".fl-pin")!.getBoundingClientRect(), card = el.querySelector<HTMLElement>(".fl-bob > :first-child")!.getBoundingClientRect();
        const nudge = card.left < 12 ? 12 - card.left : card.right > vw - 12 ? vw - 12 - card.right : 0;
        el.style.setProperty("--nudge", `${nudge}px`);
        const b = { left: card.left + nudge, right: card.right + nudge, top: card.top, bottom: pin.bottom };
        const outside = pin.left < 8 || pin.right > vw - 8 || b.top < 36 || b.bottom > vh - 8;
        const onCards = stack && !(b.right < stack.left - 8 || b.left > stack.right + 8 || b.bottom < stack.top - 8 || b.top > stack.bottom);
        el.classList.toggle("off", outside || !!onCards);
      });
    };
    check();
    const id = window.setInterval(check, 700);
    window.addEventListener("resize", check);
    return () => { window.clearInterval(id); window.removeEventListener("resize", check); };
  }, [deck, goal]);

  const week = deck?.participation;
  const days = week?.days_this_week ?? 0;
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
      {deck && (
        <Pin x={132} y={505} delay={-1.4}>
          <div className="fl-card fl-week">
            <span className="fl-txt"><b>{days ? `${days} day${days === 1 ? "" : "s"} this week` : "A new week"}</b><small>{days ? "Days you practised" : "Whenever you're ready"}</small></span>
            <span className="fl-dots" aria-hidden="true">{weekDots(deck.local_date, week?.dates_this_week ?? []).map((d, i) => <i key={i} className={`${d.done ? "on" : ""}${d.today ? " today" : ""}`} />)}</span>
          </div>
        </Pin>
      )}
      {goal && (
        <Pin x={150} y={232} delay={-2.6}>
          <div className="fl-sticky"><span>Your goal</span>{goal.length > 90 ? `${goal.slice(0, 88)}…` : goal}</div>
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
