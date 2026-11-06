import { roomStyles } from "./roomStyles";
import { motion, useDragControls, useMotionValue } from "motion/react";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, Deck, Texts } from "../api";
import { ClockWidget, PlantWidget } from "./Desk";
import { openSettings } from "./SettingsSheet";
import { SettingsAppIcon } from "./icons";
import { chapterCards, EMPTY, loadRuns, progress } from "../flashcards";
import { DEFAULT_COURSE } from "../courseIds";
import { flashcardsPath } from "../courseNavigation";
import { Illustration } from "../components/Illustrations";
import { go } from "../App";
import { CURRENT, shortVersion } from "../release";
import { playSound } from "../sounds";
import { DEFAULT_NOTE, DEFAULT_NOTE_2, isDefaultNote, NOTE_KEY, NOTE_KEY_2, NOTE_PAPERS, NOTE_TAPES, NoteStyle, NotePaper, NoteTape, readNoteStyle, resized } from "../room/note-style";

/**
 * Small things that float in the room, each over a spot in the painting (painting pixels): the
 * note on the wall of photos, a clock in the window, the plant (the
 * days you practised this week) by the potted plant, Settings (theme, AI connection and
 * everything else, over the room) on the window beside the clock, and What's new (this version and
 * what came with it, from release.ts) up by the hanging lights, and Flashcards (the chapter you're
 * going through, a card at a time) beside the plant, and Yarn (the voice game) on the desk under the
 * screen. Drag them anywhere; each remembers its
 * spot in the painting (in this browser), so it rides the room's camera. One near the edge slides
 * inward to stay on screen; one left at home that would cover today's cards steps out of the way.
 */

type Spot = { x: number; y: number };
// Chosen so no two overlap each other, today's cards, the hint or the monitors from 1024×768 to
// 3440×1440 (widgets keep their size while the painting scales, so smaller screens are tighter).
const HOME: Record<string, Spot> = { note: { x: 460, y: 260 }, note2: { x: 470, y: 420 }, clock: { x: 930, y: 270 }, plant: { x: 490, y: 630 }, settings: { x: 1090, y: 180 }, news: { x: 680, y: 170 }, flashcards: { x: 800, y: 640 }, yarn: { x: 1060, y: 720 } };
// Spots are painting pixels, so they're keyed to the painting: new art starts everyone from home.
const KEY = "lilt.room.layout.cel-studio.2";
const load = (): Record<string, Spot> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
let layout = load();
const listeners = new Set<() => void>();
export function setSpot(id: string, s: Spot | null) {
  layout = { ...layout };
  if (s) layout[id] = s; else delete layout[id];
  try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* private mode: forget on reload */ }
  listeners.forEach((f) => f());
}
/** Restores the original positions of the widgets and today's cards. */
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
    <div className={[`fl${store[id] ? " moved" : ""}${dragging ? " dragging" : ""}${still ? " still" : ""}`, roomStyles["fl"]].join(" ")} ref={el} style={{ left: spot.x, top: spot.y, ["--d" as string]: `${delay}s` }}>
      <motion.div className={["fl-drag", roomStyles["fl-drag"]].join(" ")} aria-label={label} role="group" style={{ x, y }}
        drag={!still} dragListener={false} dragControls={controls}
        onPointerDown={(e) => { if (!still && !(e.target as HTMLElement).closest("input, textarea")) controls.start(e); }}
        dragMomentum={false} onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
        <div className={["fl-nudge", roomStyles["fl-nudge"]].join(" ")}><div className={["fl-bob", roomStyles["fl-bob"]].join(" ")}>{children}</div></div>
      </motion.div>
    </div>
  );
}

const MAX_NOTE = 280;

/** Where each note keeps its look in this browser, and how it looks until you change it. */
const NOTES = { note: { key: NOTE_KEY, base: DEFAULT_NOTE }, note2: { key: NOTE_KEY_2, base: DEFAULT_NOTE_2 } } as const;
type NoteId = keyof typeof NOTES;
const loadNoteStyle = (id: NoteId): NoteStyle => { try { return readNoteStyle(localStorage.getItem(NOTES[id].key), NOTES[id].base); } catch { return NOTES[id].base; } };
const saveNoteStyle = (id: NoteId, s: NoteStyle) => {
  const { key, base } = NOTES[id];
  try { if (isDefaultNote(s, base)) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(s)); } catch { /* private mode: forget on reload */ }
};

/**
 * A sticky note: click to write on it, click away to keep it. The first starts as your goal. While
 * you write, a small tray under it picks its paper, washi tape and writing, and its corner resizes
 * it. The first note can add a second; the second can be taken down.
 */
function Note({ id, text, onSave, onEditing, startEditing, onAddSecond, onRemove }: {
  id: NoteId; text: string; onSave: (t: string) => void; onEditing: (on: boolean) => void;
  /** Open for writing as soon as it appears (a note just added). */
  startEditing?: boolean; onAddSecond?: () => void; onRemove?: () => void;
}) {
  const [editing, setEditing] = useState(!!startEditing);
  const [draft, setDraft] = useState(text);
  const [look, setLook] = useState(() => loadNoteStyle(id));
  const [removing, setRemoving] = useState(false);
  const base = NOTES[id].base, name = id === "note" ? "Note" : "Second note";
  const down = useRef<{ x: number; y: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);
  useEffect(() => { onEditing(editing); if (editing) { const a = area.current; a?.focus(); a?.setSelectionRange(a.value.length, a.value.length); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (keep: boolean) => {
    setEditing(false);
    const t = draft.trim();
    if (keep && t !== text) { onSave(t); playSound("pencil"); } else setDraft(text);
  };
  const choose = (s: NoteStyle) => { setLook(s); saveNoteStyle(id, s); };
  useEffect(() => { if (!editing) setRemoving(false); }, [editing]);

  // The note hangs from its spot by its bottom edge, centred, so the top-right corner follows the
  // pointer when the width grows by twice the sideways move and the height by the upward one.
  const startResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const el = sticky.current, box = root.current;
    if (!el || !box) return;
    const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
    const from = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight }, start = look;
    let last = look;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      last = resized(start, from.w + (2 * (ev.clientX - from.x)) / scale, from.h - (ev.clientY - from.y) / scale);
      setLook(last);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      saveNoteStyle(id, last);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  const nudgeSize = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: [10, 0], ArrowLeft: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
    if (!step) return;
    e.preventDefault();
    const el = sticky.current;
    choose(resized(look, look.width + step[0], (look.height ?? el?.offsetHeight ?? 120) + step[1]));
  };

  const paper = NOTE_PAPERS[look.paper];
  return (
    <div className={[`fl-note${editing ? " editing" : ""}`, roomStyles["fl-note"]].join(" ")} ref={root}
      onBlur={(e) => { if (editing && !root.current?.contains(e.relatedTarget as Node | null)) done(true); }}
      onKeyDown={(e) => { if (editing && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } }}>
      <div ref={sticky} className={[`fl-sticky${editing ? " editing" : ""}${look.hand ? " hand" : ""}`, roomStyles["fl-sticky"]].join(" ")}
        style={{ width: look.width, minHeight: look.height ?? undefined, ["--note-top" as string]: paper.top, ["--note-bottom" as string]: paper.bottom, ["--note-ink" as string]: paper.ink, ["--note-faint" as string]: paper.faint }}
        role={editing ? undefined : "button"} tabIndex={editing ? -1 : 0}
        aria-label={editing ? undefined : `${name}: ${text || "empty"}. Press Enter to write on it.`}
        onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
        onClick={(e) => {
          const d = down.current; down.current = null;
          if (!editing && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) setEditing(true);
        }}
        onKeyDown={(e) => { if (!editing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditing(true); } }}>
        <i className={[`fl-washi tape-${look.tape}`, roomStyles["fl-washi"], roomStyles["tape"]].join(" ")} aria-hidden="true" />
        {editing ? (
          <>
            <textarea ref={area} value={draft} maxLength={MAX_NOTE} aria-label={name} rows={4}
              onChange={(e) => setDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); done(true); } }} />
            <small className={["fl-note-hint", roomStyles["fl-note-hint"]].join(" ")}>{draft.length > MAX_NOTE - 40 ? `${MAX_NOTE - draft.length} left` : "Click away to keep it"}</small>
            <button type="button" className={["fl-note-size", roomStyles["fl-note-size"]].join(" ")} onPointerDown={startResize} onMouseDown={(e) => e.preventDefault()} onKeyDown={nudgeSize}
              aria-label="Resize the note. Left and right arrows change its width, up and down its height" title="Drag to resize">
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 2 10M2 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </>
        ) : text ? <p className={["fl-note-text", roomStyles["fl-note-text"]].join(" ")}>{text}</p> : <p className={["fl-note-text empty", roomStyles["fl-note-text"]].join(" ")}>Write yourself a note</p>}
      </div>
      {editing && (
        // Choosing keeps the cursor in the note (no focus change on click), so you can go on writing.
        <div className={["fl-note-tools", roomStyles["fl-note-tools"]].join(" ")} role="group" aria-label="How the note looks"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }} onMouseDown={(e) => e.preventDefault()}>
          <div className={["fl-note-row", roomStyles["fl-note-row"]].join(" ")} role="group" aria-label="Paper">
            <span aria-hidden="true">Paper</span>
            {(Object.keys(NOTE_PAPERS) as NotePaper[]).map((id) => (
              <button key={id} type="button" className={["fl-swatch", roomStyles["fl-swatch"]].join(" ")} aria-pressed={look.paper === id} aria-label={NOTE_PAPERS[id].label} title={NOTE_PAPERS[id].label}
                style={{ ["--sw-top" as string]: NOTE_PAPERS[id].top, ["--sw-bottom" as string]: NOTE_PAPERS[id].bottom }}
                onClick={() => choose({ ...look, paper: id })} />
            ))}
          </div>
          <div className={["fl-note-row", roomStyles["fl-note-row"]].join(" ")} role="group" aria-label="Writing">
            <span aria-hidden="true">Writing</span>
            <button type="button" className={["fl-hand-pick", roomStyles["fl-hand-pick"]].join(" ")} aria-pressed={!look.hand} onClick={() => choose({ ...look, hand: false })}>Neat</button>
            <button type="button" className={["fl-hand-pick hand", roomStyles["fl-hand-pick"]].join(" ")} aria-pressed={look.hand} onClick={() => choose({ ...look, hand: true })}>Handwritten</button>
          </div>
          <div className={["fl-note-row", roomStyles["fl-note-row"]].join(" ")} role="group" aria-label="Washi tape">
            <span aria-hidden="true">Tape</span>
            {(Object.keys(NOTE_TAPES) as NoteTape[]).map((id) => (
              <button key={id} type="button" className={["fl-tape-pick", roomStyles["fl-tape-pick"]].join(" ")} aria-pressed={look.tape === id} aria-label={NOTE_TAPES[id]} title={NOTE_TAPES[id]}
                onClick={() => choose({ ...look, tape: id })}><i className={[`tape-${id}`, roomStyles["tape"]].join(" ")} /></button>
            ))}
          </div>
          <div className={["fl-note-foot", roomStyles["fl-note-foot"]].join(" ")}>
            {onAddSecond && <button type="button" className={["fl-note-reset", roomStyles["fl-note-reset"]].join(" ")} onClick={() => { done(true); onAddSecond(); }}>Add a second note</button>}
            {!isDefaultNote(look, base) && <button type="button" className={["fl-note-reset", roomStyles["fl-note-reset"]].join(" ")} onClick={() => choose(base)}>Back to the original note</button>}
            {/* Taking a note down that has words on it asks once more. */}
            {onRemove && (removing || !text.trim()
              ? <button type="button" className={["fl-note-reset remove", roomStyles["fl-note-reset"]].join(" ")} onClick={() => { setEditing(false); onRemove(); }}>{removing ? "Yes, take it down" : "Take this note down"}</button>
              : <button type="button" className={["fl-note-reset", roomStyles["fl-note-reset"]].join(" ")} onClick={() => setRemoving(true)}>Take this note down</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

/** Settings, in the room: just the app's icon, no label. A click opens every setting. */
function SettingsWidget() {
  return (
    <button className={["fl-app ss-open", roomStyles["fl-app"]].join(" ")} onClick={() => openSettings()} aria-label="Settings">
      <span className={["fl-app-icon", roomStyles["fl-app-icon"]].join(" ")} aria-hidden="true"><SettingsAppIcon /></span>
    </button>
  );
}


/**
 * What's new: the version you're running and what came with it. Closed, a small card with a dot
 * until you've opened this version; open, the list, each linking to where it lives.
 */
const SEEN_KEY = "lilt.news.seen";
function NewsWidget() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(SEEN_KEY) === CURRENT.version; } catch { return true; } });
  const toggle = () => {
    setOpen((o) => !o);
    if (!seen) { setSeen(true); try { localStorage.setItem(SEEN_KEY, CURRENT.version); } catch { /* private mode */ } }
  };
  // Clicking anywhere else, or Escape, closes it.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const date = new Date(`${CURRENT.date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className={[`fl-news${open ? " open" : ""}`, roomStyles["fl-news"]].join(" ")} ref={box}>
      <button className={["fl-news-head", roomStyles["fl-news-head"]].join(" ")} onClick={toggle} aria-expanded={open} aria-controls="fl-news-list">
        <span className={["fl-news-ic", roomStyles["fl-news-ic"]].join(" ")} aria-hidden="true">✦</span>
        <span className={["fl-news-t", roomStyles["fl-news-t"]].join(" ")}><b>What's new</b><small>Lilt {shortVersion(CURRENT.version)} · {date}</small></span>
        {!seen && <i className={["fl-news-dot", roomStyles["fl-news-dot"]].join(" ")} aria-label="New" />}
        <svg className={["fl-news-chev", roomStyles["fl-news-chev"]].join(" ")} viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5L6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className={["fl-news-list", roomStyles["fl-news-list"]].join(" ")} id="fl-news-list">
          {CURRENT.items.map((it) => (
            <li key={it.title}>
              {it.to ? <button onClick={() => go(it.to!)}><b>{it.title}</b><span>{it.body}</span></button> : <div><b>{it.title}</b><span>{it.body}</span></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Flashcards, in the room: a small pile of cards, the top one drawn with an open study book and a
 * card rising from it, then the chapter you're on and a segment per card. A click opens it.
 */
function FlashcardsWidget({ texts, course }: { texts: Texts; course: string }) {
  const { last, runs } = loadRuns(course);
  // The chapter you were last on, else the first one you haven't finished.
  const level = texts.levels.find((l) => l.id === last)
    ?? texts.levels.find((l) => { const c = chapterCards(l, course); return progress(c, runs[l.id] ?? EMPTY).got < c.length; })
    ?? texts.levels[0];
  if (!level) return null;
  const cards = chapterCards(level, course), run = runs[level.id] ?? EMPTY;
  const { got, total } = progress(cards, run);
  return (
    <button className={["fl-cards", roomStyles["fl-cards"]].join(" ")} onClick={() => go(flashcardsPath(course, level.id))} aria-label={`Flashcards: ${level.title}, ${got} of ${total} cards done`}>
      <span className={["fl-cards-back b2", roomStyles["fl-cards-back"]].join(" ")} aria-hidden="true" />
      <span className={["fl-cards-back b1", roomStyles["fl-cards-back"]].join(" ")} aria-hidden="true" />
      <span className={["fl-cards-card", roomStyles["fl-cards-card"]].join(" ")} aria-hidden="true">
        <span className={["fl-cards-art", roomStyles["fl-cards-art"]].join(" ")}><Illustration art="book" /></span>
        <span className={["fl-cards-chip", roomStyles["fl-cards-chip"]].join(" ")}>Flashcards</span>
        <span className={["fl-cards-body", roomStyles["fl-cards-body"]].join(" ")}>
          <b>{level.title}</b>
          <span className={["fl-cards-segs", roomStyles["fl-cards-segs"]].join(" ")}>{cards.map((c) => <i key={c.id} className={run.got.includes(c.id) ? "on" : undefined} />)}</span>
          <small>{got === total ? "Done · go again any time" : got ? `${got} of ${total} cards` : `${total} cards · start`}</small>
        </span>
      </span>
    </button>
  );
}

/**
 * Yarn, in the room: a small card with the voice game's drawing (the yarn, its wavy thread, the
 * cat peeking up). A click opens the game.
 */
function YarnWidget() {
  return (
    <button className={["fl-yarn", roomStyles["fl-yarn"]].join(" ")} onClick={() => go("/yarn")} aria-label="Ball of yarn: a voice game. Hum or speak to steer the yarn">
      <span className={["fl-yarn-art", roomStyles["fl-yarn-art"]].join(" ")} aria-hidden="true"><Illustration art="yarn" /></span>
      <span className={["fl-yarn-body", roomStyles["fl-yarn-body"]].join(" ")}>
        <b>Ball of yarn</b>
        <small>Hum or speak to play</small>
      </span>
    </button>
  );
}

export function RoomFloaters({ deck, inside, course = DEFAULT_COURSE }: { deck?: Deck | null; inside: boolean; course?: string }) {
  const [note, setNote] = useState<string | null>(null);
  // The second note: null when there isn't one. `added` opens it for writing as it appears.
  const [note2, setNote2] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [texts, setTexts] = useState<Texts | null>(null);
  // Read again each time you come back to the room, so the widget shows where you got to.
  useEffect(() => {
    let ignore = false;
    setTexts(null);
    if (!inside) void api.texts(course).then((value) => { if (!ignore) setTexts(value); }, () => {});
    return () => { ignore = true; };
  }, [inside, course]);
  const [writing, setWriting] = useState<Record<NoteId, boolean>>({ note: false, note2: false });
  const box = useRef<HTMLDivElement>(null);
  const store = useLayoutStore();
  useEffect(() => {
    void api.profile().then((p) => { setNote(p.room_note ?? (course === DEFAULT_COURSE ? p.goal.summary.trim() : "")); setNote2(p.room_note_2 ?? null); }, () => setNote(null));
  }, [inside, course]);
  // One save at a time, each reading the profile afresh, so two quick changes can't undo each other.
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const saveNotes = (patch: { room_note?: string; room_note_2?: string | null }) => {
    saving.current = saving.current.then(async () => {
      try { const p = await api.profile(); await api.saveProfile({ ...p, ...patch }); } catch { /* the note stays on screen; it saves next time */ }
    });
  };
  const saveNote = (t: string) => { setNote(t); saveNotes({ room_note: t }); };
  const saveNote2 = (t: string | null) => { setNote2(t); saveNotes({ room_note_2: t }); };

  // Stay on screen: slide inward; hide only if it can't fit, or if a widget still at home would
  // sit on today's cards (one you moved stays where you put it).
  useEffect(() => {
    const check = () => {
      // While the camera is at the desk or flying, the widgets are hidden: measuring them then
      // would shove them around, and they'd visibly jump back as the room settles.
      if (!box.current?.closest(".room-stage.settled")) return;
      const stack = document.querySelector(".cs")?.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      // On squarer screens the room's shortcuts (Photos, Practice, Music) sit under the menu bar.
      const strip = document.querySelector<HTMLElement>(".room-object-shortcuts");
      const shortcuts = strip && getComputedStyle(strip).display !== "none" ? strip.getBoundingClientRect() : null;
      type Box = { left: number; right: number; top: number; bottom: number };
      const overlap = (a: Box, b: Box) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
      // Widgets already placed this round, in page order; a widget at home steps clear of them.
      const placed: Box[] = [];
      box.current?.querySelectorAll<HTMLElement>(".fl").forEach((el) => {
        const r = el.querySelector<HTMLElement>(".fl-nudge")!.getBoundingClientRect();
        // Being dragged or written on (the note): leave it where it is until you're done.
        if (el.classList.contains("dragging") || el.classList.contains("still")) { placed.push(r); return; }
        el.classList.remove("off");
        // the card slides inward (and below the menu bar) to stay fully on screen; measure where it
        // would be without the current slide, so nothing resets or flickers between checks
        const was = [parseFloat(el.style.getPropertyValue("--nudge")) || 0, parseFloat(el.style.getPropertyValue("--nudge-y")) || 0];
        const card = { left: r.left - was[0], right: r.right - was[0], top: r.top - was[1], bottom: r.bottom - was[1] };
        let nx = card.left < 12 ? 12 - card.left : card.right > vw - 12 ? vw - 12 - card.right : 0;
        // Below the menu bar, and below the shortcuts too if it sits under them.
        const under = shortcuts && card.right + nx > shortcuts.left - 8 && card.left + nx < shortcuts.right + 8;
        const top = under ? Math.max(44, shortcuts.bottom + 10) : 44;
        let ny = card.top < top ? top - card.top : card.bottom > vh - 12 ? vh - 12 - card.bottom : 0;
        const at = () => ({ left: card.left + nx, right: card.right + nx, top: card.top + ny, bottom: card.bottom + ny });
        // On a small screen two homes can touch: a widget still at home slides just clear of the
        // one before it, sideways if that stays on screen, else down. One you placed never moves.
        if (!el.classList.contains("moved")) {
          for (const p of placed) {
            const b = at();
            if (!overlap(b, p)) continue;
            const right = p.right + 8 - b.left, left = b.right - (p.left - 8), down = p.bottom + 8 - b.top;
            const goRight = (b.left + b.right) / 2 >= (p.left + p.right) / 2;
            if (goRight && b.right + right <= vw - 12) nx += right;
            else if (!goRight && b.left - left >= 12) nx -= left;
            else if (b.bottom + down <= vh - 12) ny += down;
          }
        }
        if (Math.abs(nx - was[0]) > 0.5) el.style.setProperty("--nudge", `${nx}px`);
        if (Math.abs(ny - was[1]) > 0.5) el.style.setProperty("--nudge-y", `${ny}px`);
        const b = at();
        const outside = b.right - b.left > vw - 24 || b.bottom - b.top > vh - 56;
        // once you've placed the cards yourself, nothing hides for them: it just sits behind
        const onCards = !layout.stack && !el.classList.contains("moved") && stack && !(b.right < stack.left - 8 || b.left > stack.right + 8 || b.bottom < stack.top - 8 || b.top > stack.bottom);
        el.classList.toggle("off", outside || !!onCards);
        if (!outside && !onCards) placed.push(b);
      });
    };
    check();
    const id = window.setInterval(check, 200);
    window.addEventListener("resize", check);
    return () => { window.clearInterval(id); window.removeEventListener("resize", check); };
  }, [note, store]);

  return (
    <div className={[`fls${inside ? " away" : ""}`, roomStyles["fls"]].join(" ")} ref={box}>
      <Widget id="news" delay={-0.6} label="What's new">
        <NewsWidget />
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
      {texts && (
        <Widget id="flashcards" delay={-4.2} label="Flashcards">
          <FlashcardsWidget texts={texts} course={course} />
        </Widget>
      )}
      <Widget id="yarn" delay={-5} label="Ball of yarn">
        <YarnWidget />
      </Widget>
      {note !== null && (
        <Widget id="note" delay={-2.6} label="Note" still={writing.note}>
          <Note id="note" text={note} onSave={saveNote} onEditing={(on) => setWriting((w) => ({ ...w, note: on }))}
            onAddSecond={note2 === null ? () => { setAdded(true); saveNote2(""); } : undefined} />
        </Widget>
      )}
      {note2 !== null && (
        <Widget id="note2" delay={-1.4} label="Second note" still={writing.note2}>
          <Note id="note2" text={note2} startEditing={added} onSave={saveNote2} onEditing={(on) => setWriting((w) => ({ ...w, note2: on }))}
            onRemove={() => { setAdded(false); setSpot("note2", null); saveNote2(null); }} />
        </Widget>
      )}
    </div>
  );
}
