import "../styles/deck.css";
import "../styles/voice.css";
import "../styles/editor.css";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Deck, DeckItem, Profile, Rating, Session, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { Markdown, picture } from "../components/Markdown";
import { LeaveIcon, StudioIcon, TextsIcon } from "../desk/icons";
import { HistoryPage } from "./History";
import { setRoom } from "../room/Room";
import { currentLight } from "../room/scene";
import { AudioPlayer, loadPeaks, useTakePitch } from "../components/AudioPlayer";
import { StatusBadge, TakeFlags, Toast, useTakeStatus, useToast } from "../components/bits";
import { Measured, TakeInsight, TakeResult as Measures } from "../components/DeckPitch";
import { useLivePitch } from "../components/LivePitch";
import { useMic } from "../components/Recording";
import { ReadAlong, ReadNotes } from "../components/ReadAlong";
import { noteName, recentMedian, steadinessSt } from "../pitch";
import { levelMeter, RecState, TakeMeta, TakeRecorder } from "../recorder";

/**
 * Voice practice as a writing app: chapters in a sidebar (today's cards first, then the seven
 * levels of practice texts), the chapter as a document of things to read with how to say them,
 * and a recorder docked at the bottom with the waveform, the pitch line and the numbers.
 */

/** How a card felt; the face is how it felt, the label what it does to the card. */
const RATINGS: { r: Rating; label: string; face: string }[] = [
  { r: "again", label: "Again", face: "😣" }, { r: "hard", label: "Hard", face: "😕" }, { r: "good", label: "Good", face: "🙂" }, { r: "easy", label: "Easy", face: "😌" },
];
const deckName = (it: DeckItem) => (it.card.kind === "reference" ? "Reference" : it.card.deck_title);
const friendlyDate = (d: string, today: string) => {
  const days = Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const howTo = (basis: string) => cap(basis.replace(/^(NHS Fife( progression)?|Lilt's choice):\s*/i, ""));

/* ---------------------------------------------------------------- layout: sidebar and split sizes */

/** Your sidebar width, whether it's hidden, and where the text/recorder split sits, kept in this browser. */
interface Layout { side: number; collapsed: boolean; split: number }
const LAYOUT_KEY = "lilt.practice.layout";
const LAYOUT: Layout = { side: 272, collapsed: false, split: 0.5 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useLayout() {
  const [layout, setLayout] = useState<Layout>(() => {
    try { return { ...LAYOUT, ...JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") }; } catch { return LAYOUT; }
  });
  // The window's toolbar (with the traffic lights) sits outside this page, so the sizes live on the root.
  useEffect(() => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* private window: sizes just aren't kept */ }
    const root = document.documentElement;
    root.style.setProperty("--ve-side-w", layout.collapsed ? "0px" : `${layout.side}px`);
    root.style.setProperty("--ve-split", `${(layout.split * 100).toFixed(2)}%`);
    root.classList.toggle("ve-side-hidden", layout.collapsed);
  }, [layout]);
  useEffect(() => () => {
    const root = document.documentElement;
    root.style.removeProperty("--ve-side-w"); root.style.removeProperty("--ve-split"); root.classList.remove("ve-side-hidden");
  }, []);
  return [layout, setLayout] as const;
}

/** A draggable divider: pointer drag, arrow keys to nudge, double-click to reset. */
function Resizer({ className, label, onDrag, onNudge, onReset }: {
  className: string; label: string; onDrag: (x: number) => void; onNudge: (dir: -1 | 1) => void; onReset: () => void;
}) {
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    document.documentElement.classList.add("ve-dragging");
    const move = (ev: PointerEvent) => onDrag(ev.clientX);
    const up = () => {
      el.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("ve-dragging");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up, { once: true });
    el.addEventListener("pointercancel", up, { once: true });
  };
  return (
    <div className={`ve-resize ${className}`} role="separator" aria-orientation="vertical" aria-label={label} tabIndex={0}
      onPointerDown={down} onDoubleClick={onReset}
      onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onNudge(e.key === "ArrowLeft" ? -1 : 1); } }} />
  );
}

const SidebarIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="2.8" width="12.4" height="10.4" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 3v10" stroke="currentColor" strokeWidth="1.3" /></svg>
);

export function VoicePage({ doc, levelId, itemId, first }: { doc: "home" | "start" | "today" | "chapter" | "recordings" | "progress"; levelId?: string; itemId?: string; first?: string | null }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practised, setPractised] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Take[]>([]);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    void Promise.all([api.texts(), api.deck(), api.profile(), api.history({ days: 3650 })]).then(([t, d, p, h]) => {
      setTexts(t); setDeck(d); setProfile(p);
      setPractised(new Set(h.takes.map((x) => x.prompt_id)));
      setHistory(h.takes);
    });
  }, []);
  const level = texts ? texts.levels.find((l) => l.id === levelId) ?? texts.levels[0] : null;
  const chips = useRef<HTMLElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useLayout();
  const toggleSide = () => setLayout((l) => ({ ...l, collapsed: !l.collapsed }));
  // ⌘\ or Ctrl+\ hides and shows the sidebar, as in most editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); toggleSide(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dragSide = (x: number) => {
    const left = page.current?.getBoundingClientRect().left ?? 0, w = x - left;
    setLayout((l) => (w < 150 ? { ...l, collapsed: true } : { ...l, collapsed: false, side: clamp(Math.round(w), 200, 420) }));
  };
  const dragSplit = (x: number) => {
    const r = docRef.current?.getBoundingClientRect();
    if (r) setLayout((l) => ({ ...l, split: clamp((x - r.left) / r.width, 0.32, 0.72) }));
  };
  useEffect(() => { chips.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" }); }, [texts, doc, level?.id]);

  return (
    <div className="ve" ref={page}>
      <button className="ve-side-toggle" onClick={toggleSide} aria-label={layout.collapsed ? "Show sidebar" : "Hide sidebar"} aria-keyshortcuts="Meta+Backslash Control+Backslash"
        title={layout.collapsed ? "Show sidebar (⌘\\)" : "Hide sidebar (⌘\\)"}><SidebarIcon /></button>
      {!layout.collapsed && <Resizer className="side" label="Sidebar width" onDrag={dragSide} onReset={() => setLayout((l) => ({ ...l, side: LAYOUT.side }))}
        onNudge={(d) => setLayout((l) => ({ ...l, side: clamp(l.side + d * 16, 200, 420) }))} />}
      <Sidebar texts={texts} deck={deck} practised={practised} current={doc === "chapter" ? level?.id ?? "" : doc === "start" ? "home" : doc} itemId={doc === "chapter" ? itemId : undefined} locked={recording} />
      <div className={`ve-doc${doc === "recordings" || doc === "progress" ? " solo" : ""}`} ref={docRef}>
        <Resizer className="split" label="Text and recorder split" onDrag={dragSplit} onReset={() => setLayout((l) => ({ ...l, split: LAYOUT.split }))}
          onNudge={(d) => setLayout((l) => ({ ...l, split: clamp(l.split + d * 0.03, 0.32, 0.72) }))} />
        {texts && (
          <nav className="ve-chips" aria-label="Chapters" ref={chips}>
            <button aria-current={doc === "home" ? "page" : undefined} onClick={() => go("/studio")} disabled={recording}>Home</button>
            <button aria-current={doc === "recordings" ? "page" : undefined} onClick={() => go("/history")} disabled={recording}>Recordings</button>
            <button aria-current={doc === "today" ? "page" : undefined} onClick={() => go("/deck")} disabled={recording}>Today</button>
            {texts.levels.map((l) => <button key={l.id} aria-current={doc === "chapter" && l.id === level?.id ? "page" : undefined} onClick={() => go(`/studio/${l.id}`)} disabled={recording}>{l.title}</button>)}
          </nav>
        )}
        {doc === "recordings" || doc === "progress"
          ? <div className="ve-page"><div className="ve-col ve-embed">{doc === "recordings" ? <HistoryPage /> : <ProgressSoon />}</div></div>
          : doc === "home"
          ? texts && profile && <HomeDoc texts={texts} deck={deck} practised={practised} history={history} profile={profile} onRecording={setRecording} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />
          : doc === "start"
          ? profile && <StartDoc profile={profile} onProfile={setProfile} onRecording={setRecording} onTake={(t) => { setPractised((s) => new Set([...s, t.prompt_id])); setHistory((h) => [...h, t]); }} />
          : doc === "today"
          ? <TodayDoc key={first ?? ""} first={first ?? null} band={profile?.comfort_range_hz ?? null} onDeck={setDeck} onRecording={setRecording} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />
          : texts && level && profile && <ChapterDoc key={level.id} texts={texts} level={level} itemId={itemId} profile={profile} onProfile={setProfile} onRecording={setRecording}
              practised={practised} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- sidebar */

/** The chapter-complete medal: a coral disc with a white star. */
function Medal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="var(--accent)" />
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".8" />
      <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#fff" transform="translate(3.6 3.7) scale(.55)" />
    </svg>
  );
}
const chapterDone = (l: TextLevel, practised: Set<string>) => l.items.every((it) => practised.has(`text.${l.id}.${it.id}`));

const Chevron = ({ open }: { open: boolean }) => (
  <svg className={`ve-chev${open ? " open" : ""}`} viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.8L7.7 6 4.5 9.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Tick = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** One folder in the tree: a row that opens the page, a chevron that folds it, and its files under it. */
function Folder({ id, label, extra, current, open, onToggle, onOpen, locked, children }: {
  id: string; label: string; extra: ReactNode; current: boolean; open: boolean; onToggle: (id: string) => void; onOpen: () => void; locked: boolean; children: ReactNode;
}) {
  return (
    <li className={`ve-folder${open ? " open" : ""}`}>
      <div className="ve-row">
        <button className="ve-fold" onClick={() => onToggle(id)} aria-expanded={open} aria-label={`${open ? "Fold" : "Unfold"} ${label}`}><Chevron open={open} /></button>
        <button className="ve-open" onClick={onOpen} disabled={locked} aria-current={current ? "page" : undefined}><span className="t">{label}</span>{extra}</button>
      </div>
      {open && <ul className="ve-files">{children}</ul>}
    </li>
  );
}

/** The places above the tree: Home, your recordings and your progress. */
const PLACES = [
  { id: "home", label: "Home", to: "/studio", icon: "M2.8 7.2L8 2.8l5.2 4.4V13a.8.8 0 01-.8.8H9.6V10H6.4v3.8H3.6a.8.8 0 01-.8-.8z" },
  { id: "recordings", label: "Recordings", to: "/history", icon: "M3 6.5v3M5.5 4v8M8 2.5v11M10.5 5v6M13 7v2" },
  { id: "progress", label: "Progress", to: "/progress", icon: "M2.5 13.5h11M4 11V8.5M7 11V5.5M10 11V7M13 11V3.5", soon: true },
];

/** Progress isn't ready to trust yet, so it says so and points at what already works. */
function ProgressSoon() {
  return (
    <article className="ve-soon">
      <h1>Progress</h1>
      <p className="lede">Coming soon.</p>
      <p>A clearer picture of how your voice is changing over weeks is on its way. Until then, everything you need to hear your progress is already here:</p>
      <ul>
        <li><a href="#/studio">Home</a> plays your first take next to your latest one, under <strong>Then and now</strong>.</li>
        <li><a href="#/history">Recordings</a> keeps every take, so you can listen back to any day.</li>
        <li>After each take, Lilt tells you in words what it noticed and one thing to try.</li>
      </ul>
    </article>
  );
}

/**
 * The sidebar as a file tree, like Obsidian: Today and each chapter are folders, their cards and
 * texts the files. The page you're on opens its folder; the chevrons fold the rest.
 */
function Sidebar({ texts, deck, practised, current, itemId, locked }: {
  texts: Texts | null; deck: Deck | null; practised: Set<string>; current: string; itemId?: string; locked: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([current]));
  useEffect(() => { setOpen((o) => (o.has(current) ? o : new Set([...o, current]))); }, [current]);
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const left = deck ? deck.items.filter((i) => !i.done_today).length : 0;
  const total = deck?.items.length ?? 0;
  const file = (key: string, label: string, done: boolean, on: boolean, to: string, disabled = false) => (
    <li key={key}>
      <button className={`ve-file${done ? " done" : ""}`} onClick={() => go(to)} disabled={locked || disabled} aria-current={on ? "page" : undefined} title={label}>
        <span className="t">{label}</span>{done && <Tick className="ve-tick" />}
      </button>
    </li>
  );
  return (
    <nav className="ve-side" aria-label="Practice">
      {PLACES.map((p) => (
        <button key={p.id} className="ve-home" onClick={() => go(p.to)} disabled={locked} aria-current={current === p.id ? "page" : undefined}>
          <span className="ve-home-ic"><svg viewBox="0 0 16 16" aria-hidden="true"><path d={p.icon} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className="t">{p.label}</span>
          {"soon" in p && <span className="ve-soon-tag">Soon</span>}
        </button>
      ))}
      <ul className="ve-tree">
        <Folder id="today" label="Today" current={current === "today"} open={open.has("today")} onToggle={toggle} onOpen={() => go("/deck")} locked={locked}
          extra={deck && !deck.paused ? (left === 0 && total ? <Tick className="ve-tick" /> : <span className="c">{total - left}/{total}</span>) : null}>
          {deck?.paused ? <li className="ve-note-row">Resting today</li>
            : deck?.items.map((it) => file(it.card.id, it.card.front, it.done_today, false, `/deck?card=${encodeURIComponent(it.card.id)}`, it.done_today))}
        </Folder>
      </ul>
      <h6>Chapters{texts && <span>{texts.levels.filter((l) => chapterDone(l, practised)).length} of {texts.levels.length} complete</span>}</h6>
      <ul className="ve-tree">
        {texts?.levels.map((l) => {
          const n = l.items.length, d = l.items.filter((it) => practised.has(`text.${l.id}.${it.id}`)).length;
          return (
            <Folder key={l.id} id={l.id} label={l.title} current={current === l.id && !itemId} open={open.has(l.id)} onToggle={toggle} onOpen={() => go(`/studio/${l.id}`)} locked={locked}
              extra={d >= n ? <Medal className="ve-medal-s" /> : <span className="c">{d}/{n}</span>}>
              {l.items.map((it) => file(it.id, it.text, practised.has(`text.${l.id}.${it.id}`), current === l.id && itemId === it.id, `/studio/${l.id}/${it.id}`))}
            </Folder>
          );
        })}
      </ul>
      <div className="ve-side-foot">
        <a href="#/guided"><StudioIcon />Guided session</a>
        <a href="#/texts"><TextsIcon />All practice texts</a>
        <a href="#/"><LeaveIcon />Back to the room</a>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- the dock */

/** True when the screen is split (text left, recorder right); results then show in the right half. */
const SPLIT = "(min-width: 1101px)";
function useSplit() {
  const [split, setSplit] = useState(() => window.matchMedia(SPLIT).matches);
  useEffect(() => {
    const m = window.matchMedia(SPLIT), f = () => setSplit(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return split;
}

interface Pt { t: number; hz: number | null }
const LO = 80, HI = 400;
const fy = (hz: number, h: number) => { const pad = h * 0.1; return h - pad - (Math.log(hz / LO) / Math.log(HI / LO)) * (h - 2 * pad); };

/**
 * The room's cat asleep on its blanket, filling the right half while the recorder is idle: the whole
 * painting, anchored bottom-left and scaled to cover, with the three cat layers placed where the room
 * draws them (x 0–375, y 710–881 of 1672×941).
 */
function SleepingCat({ hint, title = "Ready when you are" }: { hint: string; title?: string }) {
  const light = currentLight();
  return (
    <div className="ve-art">
      <div className="ve-cat" aria-hidden="true">
        <div className="ve-cat-stage" style={{ backgroundImage: `url(room/room-${light}.webp)` }}>
          <img className="tail" src={`room/cat-tail-${light}.webp`} alt="" />
          <img className="body" src={`room/cat-body-${light}.webp`} alt="" />
          <img className="ear" src={`room/cat-ear-${light}.webp`} alt="" />
          <span className="ve-zzz"><i>z</i><i>z</i><i>z</i></span>
        </div>
      </div>
      <p className="ve-art-copy"><b>{title}</b><span>{hint}</span></p>
    </div>
  );
}

/** The recorder at the bottom: one button, the waveform with the pitch line on it, and the numbers. */
function Dock({ meta, band, allowRetake, onSaved, onRecording, children, idleHint, result, quiet = false }: {
  meta: TakeMeta | null; band: [number, number] | null; allowRetake: boolean; quiet?: boolean;
  onSaved: (t: Take) => void; onRecording: (on: boolean) => void; children?: ReactNode; idleHint: string;
  /** The last take's result, shown in place of the cat once recording stops (split screen only). */
  result?: ReactNode;
}) {
  const mic = useMic();
  const [state, setState] = useState<RecState>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const rec = useRef<TakeRecorder | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const recording = state === "recording";
  const points = useLivePitch(mic.stream, recording || listening) as Pt[];
  const kept = useRef<Pt[]>([]);
  if (points.length) kept.current = points;
  const shown = points.length ? points : kept.current;
  const amps = useRef<{ t: number; v: number }[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);

  // Redraw when the scope changes size (the split view stretches it with the window).
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => setSize((n) => n + 1));
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { onRecording(recording); }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onRecording(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loudness for the waveform, while the microphone is in use.
  useEffect(() => {
    if (!mic.stream || !(recording || listening)) return;
    amps.current = [];
    const t0 = performance.now();
    let last = 0;
    return levelMeter(mic.stream, (rms) => {
      const t = (performance.now() - t0) / 1000;
      if (t - last < 0.025) return;
      last = t;
      amps.current.push({ t, v: Math.min(1, Math.sqrt(rms) * 2.4) });
      if (amps.current.length > 600) amps.current.splice(0, amps.current.length - 600);
    });
  }, [mic.stream, recording, listening]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const s = (performance.now() - (rec.current?.startedAt ?? 0)) / 1000;
      setElapsed(s);
      if (s > 120) void stop();
    }, 200);
    return () => clearInterval(id);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw: comfortable range, guide lines, the waveform, and the pitch line over it.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const w = cv.width, h = cv.height;
    g.clearRect(0, 0, w, h);
    if (band) { g.fillStyle = "rgba(224,100,60,.10)"; g.fillRect(0, fy(band[1], h), w, fy(band[0], h) - fy(band[1], h)); }
    g.strokeStyle = "rgba(127,127,127,.13)"; g.lineWidth = dpr;
    g.fillStyle = "rgba(127,127,127,.6)"; g.font = `500 ${11 * dpr}px "Geist Variable", system-ui, sans-serif`; g.textAlign = "right";
    for (const f of [110, 220, 330]) { const y = Math.round(fy(f, h)) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(r.height > 120 ? w - 44 * dpr : w, y); g.stroke(); if (r.height > 120) g.fillText(`${f} Hz`, w - 4 * dpr, y + 4 * dpr); }
    g.textAlign = "left";
    const span = 8, end = shown.length ? shown[shown.length - 1].t : 0, x = (t: number) => ((t - (end - span)) / span) * w;
    const aEnd = amps.current.length ? amps.current[amps.current.length - 1].t : 0, ax = (t: number) => ((t - (aEnd - span)) / span) * w;
    g.fillStyle = "rgba(127,127,127,.16)";
    for (const a of amps.current) { if (a.t < aEnd - span) continue; const hh = Math.max(2 * dpr, a.v * h * 0.7); g.beginPath(); g.roundRect(ax(a.t), h / 2 - hh / 2, 2.5 * dpr, hh, 1.25 * dpr); g.fill(); }
    g.strokeStyle = "#e0643c"; g.lineWidth = 3 * dpr; g.lineJoin = g.lineCap = "round";
    g.shadowColor = "rgba(224,100,60,.45)"; g.shadowBlur = 10 * dpr; g.beginPath();
    let pen = false, tip: [number, number] | null = null;
    for (const p of shown) {
      if (p.t < end - span) continue;
      if (!p.hz) { pen = false; tip = null; continue; }
      const X = x(p.t), Y = fy(Math.max(LO, Math.min(HI, p.hz)), h);
      if (pen) g.lineTo(X, Y); else g.moveTo(X, Y);
      pen = true; tip = [X, Y];
    }
    g.stroke(); g.shadowBlur = 0;
    if (tip && (recording || listening)) {
      g.fillStyle = "rgba(224,100,60,.22)"; g.beginPath(); g.arc(tip[0] - 6 * dpr, tip[1], 10 * dpr, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e0643c"; g.beginPath(); g.arc(tip[0] - 6 * dpr, tip[1], 4.5 * dpr, 0, Math.PI * 2); g.fill();
    }
  }, [shown, band, size, recording, listening]);

  const start = async () => {
    if (!metaRef.current) return;
    setErr(null); setListening(false);
    const stream = mic.stream ?? (await mic.request());
    if (!stream) return;
    kept.current = [];
    const r = new TakeRecorder(stream, (x) => { setState(x.state); if (x.error) setErr(x.error); });
    rec.current = r;
    try { await r.start(metaRef.current); setElapsed(0); } catch (e: any) { setState("error"); setErr(e.message); }
  };
  const stop = async () => {
    try { onSaved(await rec.current!.stop()); } catch (e: any) { setErr(e.message); }
  };
  const canStart = !!meta && (state === "idle" || (allowRetake && state === "saved"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      if (recording) void stop(); else if (canStart) void start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const voiced = shown.filter((p) => p.hz).map((p) => p.hz as number);
  const sorted = [...voiced].sort((a, b) => a - b);
  const now = recording || listening ? recentMedian(shown.map((p) => p.hz)) : null;
  const mid = sorted.length > 8 ? sorted[sorted.length >> 1] : null;
  const range = sorted.length > 8 ? [sorted[Math.floor(sorted.length * 0.1)], sorted[Math.floor(sorted.length * 0.9)]] : null;
  const last2 = shown.length ? shown.filter((p) => p.t > shown[shown.length - 1].t - 2).map((p) => p.hz) : [];
  const sd = steadinessSt(last2);
  const inBand = mid && band ? mid >= band[0] && mid <= band[1] : null;
  const active = recording || listening || shown.length > 0;

  const startListening = async () => { const s = mic.stream ?? (await mic.request()); if (s) setListening(true); };

  const dash = <span className="ve-none">–</span>;
  // Until the microphone is in use, the right half is just the room's window and the record button.
  const idle = !recording && !listening && state !== "saving" && state !== "error";
  const showResult = idle && !!result;
  const status = recording ? "Recording" : listening ? "Live" : state === "saving" ? "Saving…" : state === "error" ? "Not saved" : state === "saved" ? "Saved" : "Ready";
  return (
    <section className={`ve-dock${recording ? " rec" : ""}${listening ? " live" : ""}${idle ? " idle" : ""}${showResult ? " has-result" : idle ? " art" : ""}${quiet ? " quiet" : ""}`} aria-label="Recorder">
      {showResult ? <div className="ve-result-pane"><h2>Your take</h2>{result}</div> : <SleepingCat hint={idleHint} title={quiet ? "Nice one" : undefined} />}
      <div className="ve-now" aria-live="off">
        <div className="ve-now-read">
          <b>{now ? <>{Math.round(now)}<small>Hz</small></> : dash}</b>
          <span>{now ? noteName(now) : "Your pitch now"}</span>
        </div>
        <span className={`ve-state ${recording ? "rec" : listening ? "live" : state}`}><i aria-hidden="true" />{status}</span>
      </div>
      <div className="ve-scope">
        <canvas ref={canvas} aria-hidden="true" />
        {!active && <span className="ve-scope-idle">{idleHint}</span>}
        {inBand !== null && <span className={`ve-pill${inBand ? " ok" : ""}`}>{inBand ? "In your range" : "Outside your range"}</span>}
      </div>
      <div className="ve-stats" aria-live="off" title="Live estimate. Saved takes are measured with Praat.">
        <div className="ve-stat"><span>Middle</span><b>{mid ? <>{Math.round(mid)}<small>Hz</small></> : dash}</b><i>{mid ? noteName(mid) : ""}</i></div>
        <div className="ve-stat"><span>Usual range</span><b>{range ? <>{Math.round(range[0])}–{Math.round(range[1])}</> : dash}</b><i>{range ? "Hz" : ""}</i></div>
        <div className="ve-stat"><span>Steadiness</span><b>{sd !== null ? <>{sd.toFixed(1)}<small>st</small></> : dash}</b><i>{sd === null ? "" : sd < 0.3 ? "smooth" : sd < 0.8 ? "a little wobbly" : "moving"}</i></div>
      </div>
      <button className={`ve-rec${recording ? " on" : ""}`} onClick={() => void (recording ? stop() : start())} disabled={!recording && !canStart}
        aria-label={recording ? "Stop recording" : "Start recording"}>
        <i aria-hidden="true" />
        {recording ? <>Stop<span className="ve-clock">{clock(elapsed)}</span></>
          : state === "saving" ? "Saving…"
          : state === "saved" && allowRetake ? "Record again" : "Record"}
        {(recording || canStart) && <kbd aria-hidden="true">Space</kbd>}
      </button>
      <div className="ve-dock-sub">
        <span className="ve-dock-msg">
          {recording ? "Read the highlighted text"
            : listening ? "Listening only. Nothing is saved."
            : state === "saving" ? "Saving to your computer…" : ""}
        </span>
        {children}
        <span className="ve-sp" />
        {!recording && !quiet && (listening
          ? <button className="ve-ghost" aria-pressed="true" onClick={() => setListening(false)}>Stop listening</button>
          : <button className="ve-ghost" onClick={() => void startListening()} disabled={state === "saving"}>Show my pitch live</button>)}
      </div>
      {mic.error ? <MicHelp error={mic.error} onRetry={() => void mic.request()} /> : err && <p className="ve-err" role="alert">{err}</p>}
      {state === "error" && <button className="btn-secondary" onClick={() => void rec.current!.retrySave().then(onSaved, (e) => setErr(e.message))}>Retry saving</button>}
    </section>
  );
}

/** When the microphone can't be used: what happened, the one step that fixes it, and a retry. */
function MicHelp({ error, onRetry }: { error: string; onRetry: () => void }) {
  const blocked = /blocked/i.test(error);
  return (
    <div className="ve-mic-help" role="alert">
      <p><b>{blocked ? "Lilt can't use your microphone yet." : "Lilt can't hear your microphone."}</b>{" "}
        {blocked ? "Click the icon just left of the web address, set Microphone to Allow, then try again." : error}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

/* ---------------------------------------------------------------- free recording */

/** Nothing chosen yet: the recorder takes a free recording, saved in today's Studio session. */
const FREE = { role: "free" as const, prompt_id: "free", prompt_text: "Free recording" };
const FREE_HINT = "Talk freely, or pick a card or text to practise";

/** A free take's summary: listen back, then the measured pitch line and numbers once analysis lands. */
function FreeResult({ take, band, onMeasured }: { take: Take; band: [number, number] | null; onMeasured?: (m: Measured) => void }) {
  return (
    <div className="prc ve-result" key={take.id}>
      <ListenBack src={take.audio_url} />
      <Measures take={take} band={band} onMeasured={onMeasured} />
    </div>
  );
}

/* ---------------------------------------------------------------- home: what Practice is for */

/**
 * The Practice home, read like a note: a full-width cover, the owner's words and pictures from
 * content/texts/index.md, then the chapters with your progress (generated, so it never goes stale).
 * Nothing is picked, so the recorder takes free recordings.
 */
function HomeDoc({ texts, deck, practised, history, profile, onRecording, onTake }: {
  texts: Texts; deck: Deck | null; practised: Set<string>; history: Take[]; profile: Profile; onRecording: (on: boolean) => void; onTake: (t: Take) => void;
}) {
  const band = profile.comfort_range_hz ?? null;
  const cut = texts.home ? texts.home.indexOf("\n## ") : -1;
  const intro = texts.home && cut >= 0 ? texts.home.slice(0, cut) : texts.home ?? "", rest = cut >= 0 ? texts.home!.slice(cut + 1) : "";
  const split = useSplit();
  const [studio, setStudio] = useState<string | null>(null);
  const [freeTake, setFreeTake] = useState<Take | null>(null);
  useEffect(() => { void api.studioSession().then((s) => setStudio(s.id), () => {}); }, []);
  const freeView = freeTake && <FreeResult take={freeTake} band={band} />;
  const cover = texts.home_cover && picture(texts.home_cover);
  return (
    <>
      <div className="ve-page">
        {cover && <div className="ve-cover" style={{ backgroundImage: `url(${cover})` }} role="img" aria-label="Cover picture" />}
        <article className="ve-col ve-home-col">
          {/* The welcome first; then, under its opening paragraph, where you are: starting, or practising. */}
          {intro ? <Markdown src={intro} className="ve-md" /> : <header className="ve-head"><h1>Practice</h1></header>}
          {!band ? <StartCard /> : <YourPractice history={history} band={band} next={<NextStep deck={deck} texts={texts} practised={practised} />} />}
          {rest && <Markdown src={rest} className="ve-md" />}
          <section className="ve-md">
            <h2>The chapters</h2>
            <ol className="ve-chapters">
              {texts.levels.map((l) => {
                const n = l.items.length, d = l.items.filter((it) => practised.has(`text.${l.id}.${it.id}`)).length;
                return (
                  <li key={l.id}>
                    <a href={`#/studio/${l.id}`}>
                      <span className="n">{l.level}</span>
                      <span className="t"><b>{l.title}</b><small>{l.subtitle}</small></span>
                      {d >= n ? <Medal className="ve-medal-s" /> : <span className="c">{d}/{n}</span>}
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>
          {freeView && !split && <section className="ve-free" aria-label="Your free take"><h2>Your take</h2>{freeView}</section>}
        </article>
      </div>
      <Dock key="free" meta={studio ? { session_id: studio, ...FREE } : null} band={band} allowRetake
        onSaved={(t) => { onTake(t); setFreeTake(t); }} onRecording={onRecording} idleHint={FREE_HINT} result={split ? freeView : null} />
    </>
  );
}

/* ---------------------------------------------------------------- first run, and your practice so far */

const REF = { prompt_id: "ref.count-1-10", text: "One, two, three, four, five, six, seven, eight, nine, ten." };

function StartCard() {
  return (
    <section className="ve-start-card">
      <span className="ic" aria-hidden="true">
        <svg viewBox="0 0 16 16"><rect x="5.5" y="1.8" width="5" height="8.4" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M3.3 7.6a4.7 4.7 0 009.4 0M8 12.3v2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </span>
      <p><b>First time here?</b> Record one line in your everyday voice. It becomes your starting point, so later you can hear how far you've come.</p>
      <button className="ve-start-go" onClick={() => go("/studio/start")}>Find my starting voice</button>
    </section>
  );
}

const dayKey = (t: Take) => t.local_date ?? t.created_utc.slice(0, 10);
const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The same text on your first day and on your latest, so you can hear the change. */
function thenAndNow(history: Take[]): [Take, Take] | null {
  const groups = new Map<string, Take[]>();
  for (const t of history) if (t.audio_url) groups.set(t.prompt_id, [...(groups.get(t.prompt_id) ?? []), t]);
  const spans = [...groups.entries()].map(([id, ts]) => {
    const sorted = [...ts].sort((a, b) => a.created_utc.localeCompare(b.created_utc));
    return { id, first: sorted[0], last: sorted[sorted.length - 1] };
  }).filter((g) => dayKey(g.first) !== dayKey(g.last));
  // The reference line first: it's the same every day, so it compares best.
  const pick = spans.find((g) => g.id === REF.prompt_id) ?? spans.sort((a, b) => dayKey(a.first).localeCompare(dayKey(b.first)))[0];
  return pick ? [pick.first, pick.last] : null;
}

/** One clear thing to do now: today's cards, a rest day, or the next chapter once the cards are done. */
function NextStep({ deck, texts, practised }: { deck: Deck | null; texts: Texts; practised: Set<string> }) {
  if (!deck) return null;
  const left = deck.items.filter((i) => !i.done_today);
  if (deck.paused) return <div className="ve-next"><p><b>Resting today.</b> Your cards are paused until your voice feels ready.</p><button className="ve-next-go quiet" onClick={() => go("/deck")}>Open Today</button></div>;
  if (left.length) return (
    <div className="ve-next">
      <p><b>Today: {left.length} card{left.length === 1 ? "" : "s"}</b>, about {Math.max(1, left.length)} min</p>
      <button className="ve-next-go" onClick={() => go(`/deck?card=${encodeURIComponent(left[0].card.id)}`)}>Start today's cards</button>
    </div>
  );
  const chapter = texts.levels.find((l) => !chapterDone(l, practised));
  return (
    <div className="ve-next">
      <p><b>Today's cards are done.</b> Anything more is a bonus{chapter ? <>, like the next text in {chapter.title}</> : null}.</p>
      {chapter && <button className="ve-next-go quiet" onClick={() => go(`/studio/${chapter.id}`)}>Open {chapter.title}</button>}
    </div>
  );
}

function YourPractice({ history, band, next }: { history: Take[]; band: [number, number]; next: ReactNode }) {
  const days = new Set(history.map(dayKey));
  const today = new Date(), iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const month = iso(today).slice(0, 7);
  const thisMonth = [...days].filter((d) => d.startsWith(month)).length;
  const last14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 13 + i); return iso(d); });
  const pair = thenAndNow(history);
  return (
    <section className="ve-practice" aria-label="Your practice">
      {next}
      {history.length > 0 && <>
      <div className="ve-days">
        <p><b>{thisMonth === 0 ? "A fresh month" : `${thisMonth} day${thisMonth === 1 ? "" : "s"} of practice this month`}</b>{thisMonth > 0 && <span>Every day you show up counts. Missed days don't.</span>}</p>
        <ol aria-label="The last two weeks">{last14.map((d) => <li key={d} className={days.has(d) ? "on" : ""} title={shortDate(d)} />)}</ol>
      </div>
      {pair ? (
        <div className="ve-then">
          <p className="ve-then-h"><b>Then and now</b><span>{pair[0].prompt_text}</span></p>
          <div className="ab">
            <AudioPlayer src={pair[0].audio_url} tag="A" label={`Day 1 · ${shortDate(dayKey(pair[0]))}`} knownDuration={pair[0].analysis_summary?.duration_s} pitchTakeId={pair[0].analysis_summary ? pair[0].id : undefined} band={band} compact />
            <AudioPlayer src={pair[1].audio_url} tag="B" label={`latest · ${shortDate(dayKey(pair[1]))}`} knownDuration={pair[1].analysis_summary?.duration_s} pitchTakeId={pair[1].analysis_summary ? pair[1].id : undefined} band={band} compact />
          </div>
        </div>
      ) : (
        <p className="ve-then-wait">Your first takes are saved. Come back on another day and this is where you'll hear them next to your newest ones.</p>
      )}
      </>}
    </section>
  );
}

/** First run: read the reference line once, set the comfortable range from it, keep it as Day 1. */
function StartDoc({ profile, onProfile, onRecording, onTake }: {
  profile: Profile; onProfile: (p: Profile) => void; onRecording: (on: boolean) => void; onTake: (t: Take) => void;
}) {
  const split = useSplit();
  const [studio, setStudio] = useState<string | null>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { void api.studioSession().then((s) => setStudio(s.id), () => {}); }, []);
  const measured = async (m: Measured) => {
    const a = await api.analysis(m.take.id).catch(() => null);
    const p10 = a?.measures?.f0_p10_hz?.value, p90 = a?.measures?.f0_p90_hz?.value;
    setRange(p10 && p90 ? [Math.round(p10), Math.round(p90)] : null);
  };
  const save = async () => { if (range) { onProfile(await api.saveProfile({ ...profile, comfort_range_hz: range })); setSaved(true); } };
  const result = take && (
    <>
      <FreeResult take={take} band={range} onMeasured={(m) => void measured(m)} />
      {range && (saved ? (
        <div className="ve-start-done">
          <p><b>You're all set.</b> Your comfortable range is {range[0]}–{range[1]} Hz, and this take is your Day 1.</p>
          <div><button className="ve-start-go" onClick={() => go("/deck")}>Start today's cards</button><button className="ve-link" onClick={() => go("/studio")}>Back to Home</button></div>
        </div>
      ) : (
        <div className="ve-start-done">
          <p>From this take, your comfortable range looks like <b>{range[0]}–{range[1]} Hz</b>. The recorder shades it so you can see where you are while you practise.</p>
          <div><button className="ve-start-go" onClick={() => void save()}>Use this as my range</button><span className="ve-small">You can record it again first, if you like.</span></div>
        </div>
      ))}
    </>
  );
  return (
    <>
      <div className="ve-page">
        <article className="ve-col">
          <header className="ve-head">
            <h1>Find your starting voice</h1>
            <p className="ve-subtitle">Two minutes, once</p>
          </header>
          <blockquote className="ve-how"><b>How to do it</b>
            Use your everyday voice, the one you have now, not the one you're aiming for. Read the line below at an easy pace, then stop. This is just a starting point, so there's nothing to get right.</blockquote>
          <ol className="ve-items">
            <li className="ve-item on">
              <span className="ve-mk num" aria-hidden="true">1.</span>
              <p className="readtext ve-read">{REF.text}</p>
              <p className="ve-hint">An easy pace, in your everyday voice. The daily reference card uses this same line.</p>
              {!split && result}
            </li>
          </ol>
        </article>
      </div>
      <Dock key="start" meta={studio ? { session_id: studio, role: "reference", prompt_id: REF.prompt_id, prompt_text: REF.text } : null} band={range} allowRetake
        onSaved={(t) => { onTake(t); setTake(t); setRange(null); setSaved(false); }} onRecording={onRecording} idleHint="Press record and count from one to ten"
        result={split ? result : null} />
    </>
  );
}

/* ---------------------------------------------------------------- a chapter: practice texts */

function ChapterDoc({ texts, level, itemId, profile, onProfile, onRecording, practised, onTake }: {
  texts: Texts; level: TextLevel; itemId?: string; profile: Profile; onProfile: (p: Profile) => void;
  onRecording: (on: boolean) => void; practised: Set<string>; onTake: (t: Take) => void;
}) {
  const mic = useMic();
  const [sessionId, setSessionId] = useState<string | null>(null);
  // -1 until a text is picked; the recorder takes free recordings meanwhile.
  const [sel, setSel] = useState(() => (itemId ? Math.max(0, level.items.findIndex((i) => i.id === itemId)) : -1));
  const [takes, setTakes] = useState<Take[]>([]);
  const [previous, setPrevious] = useState<Take | null>(null);
  const [recording, setRec] = useState(false);
  const starts = useRef<(number | null)[] | null>(null);
  const [toast, setToast] = useToast();
  // Finishing a chapter's last text earns its medal; it pops in if it happens on this visit.
  const complete = chapterDone(level, practised);
  const wasComplete = useRef(complete);
  const fresh = complete && !wasComplete.current;
  useEffect(() => { if (fresh) setToast(`Chapter complete: ${level.title}`); }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const band = profile.comfort_range_hz ?? null;
  const item = sel >= 0 ? level.items[sel] : null;
  const promptId = item ? `text.${level.id}.${item.id}` : FREE.prompt_id;
  const isPrompt = level.kind === "prompt";
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    void api.studioSession().then((s) => { setSessionId(s.id); void api.session(s.id).then((d) => setTakes(d.takes.filter((x) => x.role === "free"))); });
  }, []);
  useEffect(() => { void api.history({ prompt_id: promptId, days: 365 }).then((h) => setPrevious(h.takes.length ? h.takes[h.takes.length - 1] : null)); }, [promptId]);
  useEffect(() => { itemRefs.current[sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [sel]);

  const choose = (i: number) => {
    if (recording) return;
    const j = Math.max(0, Math.min(level.items.length - 1, i));
    setSel(j);
    window.location.replace(`#/studio/${level.id}/${level.items[j].id}`);
  };
  // Picking a text in the sidebar changes the URL; follow it.
  useEffect(() => {
    const i = itemId ? level.items.findIndex((x) => x.id === itemId) : -1;
    if (i >= 0 && !recording) setSel(i);
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || recording) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); choose(sel + 1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); choose(sel - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const forText = useMemo(() => takes.filter((t) => t.prompt_id === promptId), [takes, promptId]);
  const latest = forText[forText.length - 1] ?? null;
  const before = forText.length >= 2 ? forText[forText.length - 2] : previous && previous.id !== latest?.id ? previous : null;
  const latestPitch = useTakePitch(latest?.id, latest?.status === "review_ready");

  const onSaved = async (t: Take) => {
    let saved = t;
    if (starts.current && item && !isPrompt) saved = await api.patchTake(t.id, { read_along: { starts: starts.current, text: item.text } }).catch(() => t);
    starts.current = null;
    setTakes((xs) => [...xs, saved]);
    onTake(saved);
  };
  const useRange = async (t: Take) => {
    const a = await api.analysis(t.id).catch(() => null);
    const p10 = a?.measures?.f0_p10_hz?.value, p90 = a?.measures?.f0_p90_hz?.value;
    if (!p10 || !p90) { setToast("No pitch range for this take"); return; }
    onProfile(await api.saveProfile({ ...profile, comfort_range_hz: [Math.round(p10), Math.round(p90)] }));
    setToast(`Your range is now ${Math.round(p10)}–${Math.round(p90)} Hz`);
  };

  const split = useSplit();
  const freeView = !item && latest && <FreeResult take={latest} band={band} />;
  const n = level.items.length;
  return (
    <>
      <div className="ve-page">
        <article className="ve-col">
          <header className="ve-head">
            <h1>{level.title}</h1>
            <p className="ve-subtitle">{level.subtitle}</p>
            <p className="ve-meta">{n} texts, about {Math.max(2, n)} minutes, chapter {level.level} of {texts.levels.length}</p>
            {complete && (
              <div className={`ve-award${fresh ? " fresh" : ""}`} role={fresh ? "status" : undefined}>
                <Medal className="ve-award-medal" />
                <div><b>Chapter complete</b><span>You've practised all {n} texts in {level.title}. Come back to any of them whenever you like.</span></div>
              </div>
            )}
          </header>
          <blockquote className="ve-how">
            <b>How to do it</b>
            {howTo(level.basis)} <span className="ve-src">{level.written_by}{level.source_url && <> <a href={level.source_url} target="_blank" rel="noreferrer">Source</a></>}</span>
          </blockquote>
          {freeView && !split && <section className="ve-free" aria-label="Your free take"><h2>Your take</h2>{freeView}</section>}
          <ol className="ve-items">
            {level.items.map((it, i) => {
              const on = i === sel;
              return (
                <li key={it.id} ref={(el) => { itemRefs.current[i] = el; }} className={`ve-item${on ? " on" : ""}${level.kind === "passage" ? " passage" : ""}`}
                  onClick={() => { if (!on) choose(i); }}>
                  <span className="ve-mk num" aria-hidden="true">{i + 1}.</span>
                  {on && !isPrompt
                    ? <ReadAlong text={it.text} levelId={level.id} hint={it.hint} kind={level.kind} stream={mic.stream} active={recording}
                        onStarts={(s) => { starts.current = s; }} alignment={latest?.read_along?.starts ?? null} pitch={latestPitch} />
                    : <p className="readtext ve-read" aria-label={on ? it.text : undefined}>{it.text}</p>}
                  <p className="ve-hint">{it.hint}</p>
                  {on && it.example && <div className="ve-example"><AudioPlayer src={`/texts/${it.example}`} label="Hear an example" compact /></div>}
                  {!on && <button className="ve-pick sr-only" onClick={() => choose(i)}>Practise {it.text.slice(0, 40)}</button>}
                  {on && !isPrompt && <ReadNotes text={it.text} levelId={level.id} hint={it.hint} withHint={false} />}
                  {on && latest && <ChapterTake take={latest} before={before} band={band} onUseRange={useRange} onUpdate={(t) => setTakes((xs) => xs.map((x) => (x.id === t.id ? t : x)))} />}
                </li>
              );
            })}
          </ol>
          <p className="ve-end">{texts.note}</p>
        </article>
      </div>
      <Dock key={promptId} meta={sessionId ? { session_id: sessionId, ...FREE, ...(item && { prompt_id: promptId, prompt_text: item.text }) } : null}
        band={band} allowRetake onSaved={(t) => void onSaved(t)} onRecording={(on) => { setRec(on); onRecording(on); }} result={split ? freeView : null}
        idleHint={item ? "Press record and read the highlighted text" : FREE_HINT}>
        <button className="ve-link" onClick={() => choose(sel + 1)} disabled={recording || sel >= n - 1}>{item ? "Next text" : "Start with text 1"} <kbd>↓</kbd></button>
      </Dock>
      <Toast text={toast} />
    </>
  );
}

const Star = ({ on }: { on: boolean }) => <svg viewBox="0 0 16 16" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" /></svg>;

function ChapterTake({ take, before, band, onUseRange, onUpdate }: { take: Take; before: Take | null; band: [number, number] | null; onUseRange: (t: Take) => void; onUpdate: (t: Take) => void }) {
  useTakeStatus(take, onUpdate);
  const ready = take.status === "review_ready";
  return (
    <section className="ve-take" aria-label="Your take" onClick={(e) => e.stopPropagation()}>
      <div className="ve-take-head"><b>Your take</b><StatusBadge status={take.status} /><TakeFlags take={take} /></div>
      <TakeInsight take={take} band={band} />
      <div className={before ? "ab" : ""}>
        {before && <AudioPlayer src={before.audio_url} tag="A" label={`before · ${before.local_date ?? new Date(before.created_utc).toLocaleDateString()}`} knownDuration={before.analysis_summary?.duration_s} pitchTakeId={before.id} band={band} compact />}
        <AudioPlayer key={`${take.id}-${ready}`} src={take.audio_url} tag={before ? "B" : undefined} label="this take" knownDuration={take.analysis_summary?.duration_s} pitchTakeId={ready ? take.id : undefined} band={band} compact={!!before} />
      </div>
      {!ready && take.status === "analysis_pending" && <p className="ve-small">Measuring your pitch line…</p>}
      {before && <p className="ve-small">Listen to both. Which feels more like you? Your ear decides.</p>}
      <div className="ve-take-actions">
        <button className="ve-ghost" onClick={() => void api.patchTake(take.id, { favourite: !take.favourite }).then(onUpdate)} aria-pressed={take.favourite}><Star on={take.favourite} />{take.favourite ? "Favourite" : "I like this one"}</button>
        {ready && <button className="ve-ghost" onClick={() => onUseRange(take)}>Use this take's range as my comfortable range</button>}
        {before && <button className="ve-ghost" onClick={() => go(`/compare?a=${before.id}&b=${take.id}`)}>Detailed comparison</button>}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- today: the voice deck */

interface Result { item: DeckItem; rating: Rating; median: number | null }
type Phase = { k: "say"; retryOf: string | null } | { k: "rate"; take: Take } | { k: "end" } | { k: "hurt" };

const PlayIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /><rect x="7.1" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /></svg>;
function ListenBack({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    let live = true;
    void loadPeaks(src, 72).then((p) => { if (!live || !p) return; const max = Math.max(0.01, ...Array.from(p)); setBars(Array.from(p, (v) => 0.12 + 0.88 * (v / max))); });
    return () => { live = false; };
  }, [src]);
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };
  return (
    <div className="prc-player">
      <button className="play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play your recording"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
      <div className="prc-wave" aria-hidden="true">
        {(bars.length ? bars : Array(72).fill(0.15)).map((h, i, arr) => <i key={i} className={i / arr.length < pos ? "on" : ""} style={{ transform: `scaleY(${h.toFixed(3)})` }} />)}
      </div>
      <audio ref={audio} src={src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (isFinite(a.duration) && a.duration > 0) setPos(a.currentTime / a.duration); }} />
    </div>
  );
}

function TodayDoc({ first, band, onDeck, onRecording, onTake }: {
  first: string | null; band: [number, number] | null; onDeck: (d: Deck) => void; onRecording: (on: boolean) => void; onTake: (t: Take) => void;
}) {
  const mic = useMic();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<DeckItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>({ k: "say", retryOf: null });
  const [recOn, setRecOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [measured, setMeasured] = useState<Record<string, number | null>>({});
  const [comfort, setComfort] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const curRef = useRef<HTMLLIElement>(null);
  const split = useSplit();
  // Opened from the computer, no card is chosen yet: the recorder takes free recordings meanwhile.
  const [chosen, setChosen] = useState(!!first);
  const [studio, setStudio] = useState<string | null>(null);
  const [freeTake, setFreeTake] = useState<Take | null>(null);
  useEffect(() => { void api.studioSession().then((s) => setStudio(s.id), () => {}); }, []);

  useEffect(() => {
    Promise.all([api.deck(), api.deckSession()]).then(([d, s]) => {
      setDeck(d); onDeck(d); setSession(s);
      setComfort(s.comfort?.comfort ?? null);
      const left = d.items.filter((i) => !i.done_today);
      const pick = first ? left.findIndex((i) => i.card.id === first) : -1;
      setQueue(pick > 0 ? [left[pick], ...left.slice(0, pick), ...left.slice(pick + 1)] : left);
      if (d.paused) setPhase({ k: "hurt" }); else if (!left.length) setPhase({ k: "end" });
    }, (e) => setErr(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const item = queue[idx];
  useEffect(() => { curRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [idx, phase.k]);
  useEffect(() => { if (phase.k === "end" || phase.k === "hurt") titleRef.current?.focus({ preventScroll: true }); }, [phase.k]);

  const choose = (j: number) => {
    if (phase.k !== "say" || recOn) return;
    if (!chosen) setChosen(true);
    if (j <= idx) return;
    setQueue((q) => { const n = [...q]; const [it] = n.splice(j, 1); n.splice(idx, 0, it); return n; });
    setPhase({ k: "say", retryOf: null });
  };
  const rate = async (r: Rating | "ouch") => {
    if (phase.k !== "rate" || busy) return;
    setBusy(true);
    try {
      const res = await api.rateCard(item.card.id, phase.take.id, r);
      setDeck(res.deck); onDeck(res.deck);
      if (r === "ouch") { setPhase({ k: "hurt" }); return; }
      setResults((x) => [...x, { item, rating: r, median: measured[phase.take.id] ?? null }]);
      let q = queue;
      if (r === "again") {
        const fresh = res.deck.items.find((i) => i.card.id === item.card.id) ?? item;
        q = [...queue, { ...fresh, kind: "again", done_today: false }];
        setQueue(q);
      }
      if (idx + 1 < q.length) { setIdx(idx + 1); setPhase({ k: "say", retryOf: null }); } else setPhase({ k: "end" });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const ouchNow = () => void api.rateCard(item.card.id, null, "ouch").then((res) => { setDeck(res.deck); onDeck(res.deck); setPhase({ k: "hurt" }); }, (e) => setErr(e.message));

  // Keys 1–4 rate, like Anki.
  useEffect(() => {
    if (phase.k !== "rate") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) { e.preventDefault(); void rate(RATINGS[n - 1].r); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // The cat in the room follows along.
  useEffect(() => {
    const k = phase.k;
    setRoom({ mode: recOn ? "watch" : k === "rate" ? "awake" : k === "end" ? "happy" : "sleep",
      say: k === "hurt" ? "take a break, sip some water" : k === "end" ? "all done! drink water :3" : recOn ? "i'm listening :3" : k === "rate" ? "let's listen :3" : "zzz… press record" });
  }, [phase.k, recOn]);

  if (err && !deck) return <div className="ve-page"><article className="ve-col"><p role="alert" className="ve-err">{err}</p></article></div>;
  if (!deck || !session) return <div className="ve-page"><article className="ve-col"><p className="ve-subtitle">Getting your cards…</p></article></div>;

  const ended = phase.k === "end" || phase.k === "hurt";
  const earlier = deck.items.filter((i) => i.done_today && !results.some((r) => r.item.card.id === i.card.id));
  const total = earlier.length + results.length + (ended ? 0 : queue.length - idx);
  const doneCount = earlier.length + results.length;
  const label = (r: Rating) => RATINGS.find((x) => x.r === r)?.label ?? r;
  const setFeel = async (c: string) => { setComfort(c); try { await api.patchSession(session.id, { comfort: { comfort: c }, complete: true }); } catch (e: any) { setErr(e.message); } };
  const meta: TakeMeta | null = item && phase.k === "say" ? {
    session_id: session.id,
    role: phase.retryOf ? "retry" : item.card.kind === "reference" ? "reference" : item.card.kind === "exercise" ? "exercise" : "free",
    prompt_id: item.card.prompt_id, prompt_text: item.card.front,
    exercise_id: item.card.exercise_id, exercise_version: item.card.exercise_version, retry_of: phase.retryOf,
  } : null;
  const date = new Date(`${deck.local_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  // Listen back, the measured pitch and the rating: under the card, or in the right half when split.
  const free = (!chosen && phase.k === "say") || phase.k === "end";
  const freeView = free && freeTake && <FreeResult take={freeTake} band={band} />;
  const rateView = phase.k === "rate" && (
    <div className="prc ve-result" onClick={(e) => e.stopPropagation()} key={phase.take.id}>
      <ListenBack src={phase.take.audio_url} />
      <Measures key={phase.take.id} take={phase.take} band={band} onMeasured={(m: Measured) => setMeasured((x) => ({ ...x, [phase.take.id]: m.median }))} />
      <div className="ve-rate-box">
        <p className="ve-q" id="feel-q">How did that feel?</p>
        <div className="vc-rate ve-rate" role="group" aria-labelledby="feel-q">
          {RATINGS.map((r, i) => (
            <button key={r.r} onClick={() => void rate(r.r)} disabled={busy} aria-keyshortcuts={String(i + 1)} aria-label={`${r.label}, next ${item.preview[r.r]}`}>
              <span className="face" aria-hidden="true">{r.face}</span>
              <span className="l">{r.label}<kbd aria-hidden="true">{i + 1}</kbd></span>
              <small>{item.preview[r.r] === "later today" ? "in a few min" : item.preview[r.r]}</small>
            </button>
          ))}
        </div>
        <div className="ve-rate-more">
          <button className="ve-pill" onClick={() => setPhase({ k: "say", retryOf: phase.take.id })} disabled={busy}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 11-1.5-3.6M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Record it again
          </button>
          <button className="ve-pill ouch" onClick={() => void rate("ouch")} disabled={busy}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s-5.5-3.3-5.5-7A3 3 0 018 5.2 3 3 0 0113.5 7C13.5 10.7 8 14 8 14z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            It hurt or felt strained
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="ve-page">
        <article className="ve-col">
          <header className="ve-head">
            {phase.k === "end" ? <h1 tabIndex={-1} ref={titleRef}>That's today's deck</h1>
              : phase.k === "hurt" ? <h1 tabIndex={-1} ref={titleRef}>Let's stop here</h1>
              : <h1>Today</h1>}
            <p className="ve-subtitle">{date}</p>
            <p className="ve-meta">{doneCount} of {total} done{deck.next_due && phase.k === "end" ? `, next ones come back ${friendlyDate(deck.next_due, deck.local_date)}` : ""}</p>
          </header>
          {phase.k === "hurt" ? (
            <blockquote className="ve-how warn"><b>Rest your voice</b>
              That card is paused and so is your plan. Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.</blockquote>
          ) : phase.k === "end" ? (
            <div className="ve-endbox">
              {comfort ? <p className="ve-note ok" role="status">{comfort === "strain" || comfort === "pain" ? "Noted. Your plan is paused so you can rest." : "Noted. See you tomorrow."}</p> : (
                <>
                  <p className="ve-q" id="voice-q">How does your voice feel now?</p>
                  <div className="ve-feel" role="group" aria-labelledby="voice-q">
                    <button onClick={() => void setFeel("comfortable")}>Comfortable</button>
                    <button onClick={() => void setFeel("some_effort")}>A bit tired</button>
                    <button className="hurt" onClick={() => void setFeel("strain")}>Strained</button>
                    <button className="hurt" onClick={() => void setFeel("pain")}>It hurts</button>
                  </div>
                </>
              )}
              <p className="ve-small">Your takes are in <a href="#/history">your recordings</a> and <a href="#/progress">progress</a>. Anything more today is a bonus: try a chapter on the left.</p>
            </div>
          ) : (
            <blockquote className="ve-how"><b>How to do it</b>
              {!chosen && "Pick a card to start, or just press record and talk freely. "}Say each card in your practice voice, listen back, then rate how it felt. Your rating decides when a card comes back; pitch numbers never do.</blockquote>
          )}
          {freeView && !split && <section className="ve-free" aria-label="Your free take"><h2>Your take</h2>{freeView}</section>}
          <ol className="ve-items">
            {earlier.map((it) => (
              <li key={`e-${it.card.id}`} className="ve-item done"><span className="ve-mk num" aria-hidden="true"><Tick /></span>
                <p className="readtext ve-read">{it.card.front}</p><p className="ve-hint"><span className="ve-tag">Done</span>{deckName(it)}</p></li>
            ))}
            {results.map((r, i) => (
              <li key={`r-${i}`} className="ve-item done"><span className="ve-mk num" aria-hidden="true"><Tick /></span>
                <p className="readtext ve-read">{r.item.card.front}</p>
                <p className="ve-hint"><span className={`ve-tag ${r.rating}`}>{label(r.rating)}</span>{r.median ? `${Math.round(r.median)} Hz, ${noteName(r.median)}` : deckName(r.item)}</p></li>
            ))}
            {!ended && queue.slice(idx).map((it, k) => {
              const j = idx + k, on = chosen && k === 0;
              return (
                <li key={`q-${j}-${it.card.id}`} ref={on ? curRef : undefined} className={`ve-item${on ? " on" : ""}`} onClick={() => { if (!on) choose(j); }}>
                  <span className="ve-mk num" aria-hidden="true">{doneCount + k + 1}.</span>
                  <p className="ve-kind">{deckName(it)}{(it.kind === "new" || it.kind === "again") && <span className="ve-tag next">{it.kind === "new" ? "New card" : "Again"}</span>}
                    {!chosen && k === 0 && phase.k === "say" && <span className="ve-tag start">Start here</span>}</p>
                  {on && it.card.kind !== "exercise"
                    ? <ReadAlong text={it.card.front} levelId={it.card.level_id} hint={it.card.hint} kind={it.card.text_kind} stream={mic.stream} active={recOn} />
                    : <p className="readtext ve-read" aria-label={on ? it.card.front : undefined}>{it.card.front}</p>}
                  {it.card.hint && <p className="ve-hint">{it.card.hint}</p>}
                  {!on && <button className="ve-pick sr-only" onClick={() => choose(j)} disabled={phase.k !== "say" || recOn}>Practise {it.card.front.slice(0, 40)} next</button>}
                  {on && rateView}
                </li>
              );
            })}
          </ol>
          {err && <p role="alert" className="ve-err">{err}</p>}
        </article>
      </div>
      {free ? (
        <Dock key="free" meta={studio ? { session_id: studio, ...FREE } : null} band={band} allowRetake
          onSaved={(t) => { onTake(t); setFreeTake(t); }} onRecording={(on) => { setRecOn(on); onRecording(on); }}
          idleHint={FREE_HINT} result={split ? freeView : null}>
          {phase.k === "say" && item && <button className="ve-link" onClick={() => choose(idx)}>Start today's cards</button>}
        </Dock>
      ) : !ended && item && (
        <Dock key={`${item.card.id}-${idx}-${phase.k === "say" ? phase.retryOf ?? "" : "rated"}`} meta={meta} band={band} allowRetake={false} quiet={phase.k === "rate"}
          onSaved={(t) => { onTake(t); setPhase({ k: "rate", take: t }); }} onRecording={(on) => { setRecOn(on); onRecording(on); }}
          idleHint={phase.k === "rate" ? "Listen back, then rate how it felt" : "Press record and say the card"}>
          {phase.k === "say" && !recOn && <button className="ve-link ouch" onClick={ouchNow}>Stop, my voice hurts</button>}
        </Dock>
      )}
    </>
  );
}
