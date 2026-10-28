import { motion, useDragControls, useMotionValue } from "motion/react";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, Deck } from "../api";
import { radio, useRadio } from "./lofi";
import { Volume } from "./Volume";
import { ClockWidget, PlantWidget } from "./Desk";
import { openSettings } from "./SettingsSheet";
import { SettingsAppIcon } from "./icons";

/**
 * Small things that float in the room, each over a spot in the painting (painting pixels): the
 * radio over the speaker, a note on the wall of photos, a clock in the window, the plant (the
 * days you practised this week) by the potted plant, and Settings (theme, AI connection and
 * everything else, over the room) on the window beside the clock. Drag them anywhere; each remembers its
 * spot in the painting (in this browser), so it rides the room's camera. One near the edge slides
 * inward to stay on screen; one left at home that would cover today's cards steps out of the way.
 */

type Spot = { x: number; y: number };
const HOME: Record<string, Spot> = { radio: { x: 1262, y: 452 }, note: { x: 150, y: 232 }, clock: { x: 1180, y: 236 }, plant: { x: 118, y: 560 }, settings: { x: 1400, y: 236 } };
const KEY = "lilt.room.layout";
const load = (): Record<string, Spot> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
let layout = load();
const listeners = new Set<() => void>();
export function setSpot(id: string, s: Spot | null) {
  layout = { ...layout };
  if (s) layout[id] = s; else delete layout[id];
  try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* private mode: forget on reload */ }
  listeners.forEach((f) => f());
}
/** Puts every widget and today's cards back where they started. */
export const resetLayout = () => { Object.keys(layout).forEach((id) => setSpot(id, null)); };
export function useLayoutStore() {
  const [, bump] = useState(0);
  useEffect(() => { const on = () => bump((n) => n + 1); listeners.add(on); return () => { listeners.delete(on); }; }, []);
  return layout;
}
/** True once any widget has been moved from its home. */
export const useLayoutMoved = () => Object.keys(useLayoutStore()).length > 0;

function Widget({ id, delay, label, still, children }: { id: string; delay: number; label: string; still?: boolean; children: ReactNode }) {
  const store = useLayoutStore();
  const spot = store[id] ?? HOME[id];
  const x = useMotionValue(0), y = useMotionValue(0);
  // Drags start anywhere on the widget except a slider or a text field.
  const controls = useDragControls();
  const el = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  // Once the new spot is drawn, drop the drag offset in the same frame: no jump.
  useLayoutEffect(() => { x.set(0); y.set(0); }, [spot.x, spot.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDragEnd = () => {
    setDragging(false);
    // The widget's box is at screen scale; the painting is scaled by the camera, so divide it back out.
    const stage = el.current?.closest(".room-stage") as HTMLElement | null;
    const inv = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--inv")) || 1 : 1;
    const dx = x.get() * inv, dy = y.get() * inv;
    if (Math.hypot(dx, dy) < 2) { x.set(0); y.set(0); return; }
    setSpot(id, { x: Math.round(spot.x + dx), y: Math.round(spot.y + dy) });
  };
  return (
    <div className={`fl${store[id] ? " moved" : ""}${dragging ? " dragging" : ""}`} ref={el} style={{ left: spot.x, top: spot.y, ["--d" as string]: `${delay}s` }}>
      <motion.div className="fl-drag" aria-label={label} role="group" style={{ x, y }}
        drag={!still} dragListener={false} dragControls={controls}
        onPointerDown={(e) => { if (!still && !(e.target as HTMLElement).closest("input, textarea")) controls.start(e); }}
        dragMomentum={false} onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
        <div className="fl-nudge"><div className="fl-bob">{children}</div></div>
      </motion.div>
    </div>
  );
}

const MAX_NOTE = 280;

/** The sticky note: click to write on it, click away to keep it. It starts as your goal. */
function Note({ text, onSave, onEditing }: { text: string; onSave: (t: string) => void; onEditing: (on: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const down = useRef<{ x: number; y: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);
  useEffect(() => { onEditing(editing); if (editing) { const a = area.current; a?.focus(); a?.setSelectionRange(a.value.length, a.value.length); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (keep: boolean) => {
    setEditing(false);
    const t = draft.trim();
    if (keep && t !== text) onSave(t); else setDraft(text);
  };
  return (
    <div className={`fl-sticky${editing ? " editing" : ""}`}
      role={editing ? undefined : "button"} tabIndex={editing ? -1 : 0}
      aria-label={editing ? undefined : `Note: ${text || "empty"}. Press Enter to write on it.`}
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
      onClick={(e) => {
        const d = down.current; down.current = null;
        if (!editing && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) setEditing(true);
      }}
      onKeyDown={(e) => { if (!editing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditing(true); } }}>
      <i className="fl-washi" aria-hidden="true" />
      {editing ? (
        <>
          <textarea ref={area} value={draft} maxLength={MAX_NOTE} aria-label="Note" rows={4}
            onChange={(e) => setDraft(e.target.value)} onBlur={() => done(true)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); done(true); }
            }} />
          <small className="fl-note-hint">{draft.length > MAX_NOTE - 40 ? `${MAX_NOTE - draft.length} left` : "Click away to keep it"}</small>
        </>
      ) : text ? <p className="fl-note-text">{text}</p> : <p className="fl-note-text empty">Write yourself a note</p>}
    </div>
  );
}

/** Settings, in the room: just the app's icon, no label. A click opens every setting. */
function SettingsWidget() {
  return (
    <button className="fl-app ss-open" onClick={() => openSettings()} aria-label="Settings">
      <span className="fl-app-icon" aria-hidden="true"><SettingsAppIcon /></span>
    </button>
  );
}


export function RoomFloaters({ deck, inside }: { deck?: Deck | null; inside: boolean }) {
  const r = useRadio();
  const [note, setNote] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const store = useLayoutStore();
  useEffect(() => {
    void api.profile().then((p) => setNote(p.room_note ?? p.goal.summary.trim()), () => setNote(null));
  }, [inside]);
  const saveNote = async (t: string) => {
    setNote(t);
    try { const p = await api.profile(); await api.saveProfile({ ...p, room_note: t }); } catch { /* the note stays on screen; it saves next time */ }
  };

  // Stay on screen: slide inward; hide only if it can't fit, or if a widget still at home would
  // sit on today's cards (one you moved stays where you put it).
  useEffect(() => {
    const check = () => {
      const stack = document.querySelector(".cs")?.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      box.current?.querySelectorAll<HTMLElement>(".fl").forEach((el) => {
        if (el.classList.contains("dragging")) return;
        el.classList.remove("off");
        // the card slides inward (and below the menu bar) to stay fully on screen; measure where it
        // would be without the current slide, so nothing resets or flickers between checks
        const was = [parseFloat(el.style.getPropertyValue("--nudge")) || 0, parseFloat(el.style.getPropertyValue("--nudge-y")) || 0];
        const r = el.querySelector<HTMLElement>(".fl-nudge")!.getBoundingClientRect();
        const card = { left: r.left - was[0], right: r.right - was[0], top: r.top - was[1], bottom: r.bottom - was[1] };
        const nx = card.left < 12 ? 12 - card.left : card.right > vw - 12 ? vw - 12 - card.right : 0;
        const ny = card.top < 44 ? 44 - card.top : card.bottom > vh - 12 ? vh - 12 - card.bottom : 0;
        if (Math.abs(nx - was[0]) > 0.5) el.style.setProperty("--nudge", `${nx}px`);
        if (Math.abs(ny - was[1]) > 0.5) el.style.setProperty("--nudge-y", `${ny}px`);
        const b = { left: card.left + nx, right: card.right + nx, top: card.top + ny, bottom: card.bottom + ny };
        const outside = b.right - b.left > vw - 24 || b.bottom - b.top > vh - 56;
        // once you've placed the cards yourself, nothing hides for them: it just sits behind
        const onCards = !layout.stack && !el.classList.contains("moved") && stack && !(b.right < stack.left - 8 || b.left > stack.right + 8 || b.bottom < stack.top - 8 || b.top > stack.bottom);
        el.classList.toggle("off", outside || !!onCards);
      });
    };
    check();
    const id = window.setInterval(check, 200);
    window.addEventListener("resize", check);
    return () => { window.clearInterval(id); window.removeEventListener("resize", check); };
  }, [note, store]);

  return (
    <div className={`fls${inside ? " away" : ""}`} ref={box}>
      <Widget id="radio" delay={0} label="Lo-fi radio">
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
              <Volume />
            </div>
          </div>
        </div>
      </Widget>
      <Widget id="settings" delay={-1.8} label="Settings">
        <SettingsWidget />
      </Widget>
      <Widget id="clock" delay={-1.1} label="Clock">
        <ClockWidget />
      </Widget>
      {deck && (
        <Widget id="plant" delay={-3.4} label="This week">
          <PlantWidget days={deck.participation?.days_this_week ?? 0} />
        </Widget>
      )}
      {note !== null && (
        <Widget id="note" delay={-2.6} label="Note" still={writing}>
          <Note text={note} onSave={(t) => void saveNote(t)} onEditing={setWriting} />
        </Widget>
      )}
    </div>
  );
}
