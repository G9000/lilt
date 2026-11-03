import "../styles/deck.css";
import "../styles/voice.css";
import "../styles/editor.css";
import { Fragment, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api, Deck, DeckItem, Piece, Profile, Rating, Session, SyllabusChange, SyllabusUpdates, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { Markdown, picture } from "../components/Markdown";
import { PracticeSettings } from "./Settings";
import { DEFAULT_COURSE, textId } from "../courses";
import { byPart, chapterSteps, howTo, isCare, isLong, passageTitle, readingTime, textLabel } from "../chapters";
import { MixtapeSections, useMixtape } from "./Courses";
import { openRemix, RemixPanel } from "../components/RemixPanel";

/** The course Practice shows. */
const COURSE = DEFAULT_COURSE;
import { HistoryPage } from "./History";
import { TextHistory } from "./TextHistory";
import { setRoom } from "../room/Room";
import { currentLight } from "../room/scene";
import { AudioPlayer, loadPeaks, useTakePitch } from "../components/AudioPlayer";
import { StatusBadge, TakeFlags, Toast, useTakeStatus, useToast } from "../components/bits";
import { Measured, ResonanceNote, TakeInsight, TakeResult as Measures } from "../components/DeckPitch";
import type { CardKind } from "../insight";
import { useLivePitch } from "../components/LivePitch";
import { PianoRoll, PitchPoint } from "../components/PianoRoll";
import { useTakeAudio } from "../components/takeAudio";
import { useMic } from "../components/Recording";
import { ReadAlong, ReadNotes } from "../components/ReadAlong";
import { cleanContour, noteName, recentMedian, steadinessSt } from "../pitch";
import { levelMeter, RecState, TakeMeta, TakeRecorder } from "../recorder";
import { clearOfTone, noteFor, onTone, playTone, stopTone } from "../tone";
import { Brightness, brightnessWords, meterPosition, trackBrightness } from "../brightness";

/**
 * Voice practice as a writing app: chapters in a sidebar (today's cards first, then the seven
 * levels of practice texts), the chapter as a document of things to read with how to say them,
 * and a recorder docked at the bottom with the waveform, the pitch line and the numbers.
 */

/** How a card felt; the face is how it felt, the label what it does to the card. */
const RATINGS: { r: Rating; label: string; face: string }[] = [
  { r: "again", label: "Again", face: "😣" }, { r: "hard", label: "Hard", face: "😕" }, { r: "good", label: "Good", face: "🙂" }, { r: "easy", label: "Easy", face: "😌" },
];
/** A card's hint away from its chapter: "Your check-in: …" only means something there. */
const cardHint = (h: string) => { const t = h.replace(/^your check-in:\s*/i, ""); return t.charAt(0).toUpperCase() + t.slice(1); };
const deckName = (it: DeckItem) => (it.card.kind === "reference" ? "Reference" : it.card.deck_title);
const friendlyDate = (d: string, today: string) => {
  const days = Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ---------------------------------------------------------------- layout: sidebar and split sizes */

/** Sidebar layout, legacy recorder split, and reading width, kept in this browser. */
interface Layout { side: number; collapsed: boolean; split: number }
const LAYOUT_KEY = "lilt.practice.layout";
const LAYOUT: Layout = { side: 272, collapsed: false, split: 0.5 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useLayout() {
  const [layout, setLayout] = useState<Layout>(() => {
    try { return { ...LAYOUT, ...JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") }; } catch { return LAYOUT; }
  });
  // The window's toolbar (with the traffic lights) sits outside this page, so the sizes live on the root.
  // They're set before the first paint, so the page never draws the default sizes first.
  useLayoutEffect(() => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* private window: sizes just aren't kept */ }
    const root = document.documentElement;
    root.style.setProperty("--ve-side-w", layout.collapsed ? "0px" : `${layout.side}px`);
    root.style.setProperty("--ve-side-open", `${layout.side}px`);
    root.style.setProperty("--ve-split", `${(layout.split * 100).toFixed(2)}%`);
    root.classList.toggle("ve-side-hidden", layout.collapsed);
  }, [layout]);
  // The sidebar slides only once the page has settled, so a reload never animates it into place.
  useEffect(() => {
    const root = document.documentElement;
    let id = requestAnimationFrame(() => { id = requestAnimationFrame(() => root.classList.add("ve-motion")); });
    return () => {
      cancelAnimationFrame(id);
      root.style.removeProperty("--ve-side-w"); root.style.removeProperty("--ve-side-open"); root.style.removeProperty("--ve-split");
      root.classList.remove("ve-side-hidden", "ve-motion");
    };
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

export function VoicePage({ doc, levelId, itemId, first, text }: { doc: "home" | "start" | "updates" | "mixtape" | "settings" | "today" | "chapter" | "recordings" | "progress" | "free"; levelId?: string; itemId?: string; first?: string | null;
  /** Recordings narrowed to one text over time (`#/history?text=…`). */
  text?: string | null }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practised, setPractised] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Take[]>([]);
  const [recording, setRecording] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([api.texts(), api.deck(), api.profile(), api.history({ days: 3650 })]).then(([t, d, p, h]) => {
      setTexts(t); setDeck(d); setProfile(p);
      setPractised(new Set(h.takes.map((x) => x.prompt_id)));
      setHistory(h.takes);
    }, (e: any) => setLoadErr(`Lilt couldn't load your practice: ${e.message}. Is the Lilt server running?`));
  }, []);
  // If the microphone is already allowed, open it on arrival: the first take then starts at once,
  // with its half-second pre-roll, instead of waiting for the mic to wake.
  const micCtx = useMic();
  useEffect(() => {
    if (micCtx.stream) return;
    void navigator.permissions?.query({ name: "microphone" as PermissionName })
      .then((p) => { if (p.state === "granted" && !micCtx.stream) void micCtx.request(); }, () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A remix or an undo changed the course: read it again.
  useEffect(() => {
    const on = () => void api.texts().then(setTexts);
    window.addEventListener("lilt:texts-changed", on);
    return () => window.removeEventListener("lilt:texts-changed", on);
  }, []);
  const newChapter = async () => {
    const r = await api.addChapter(COURSE);
    setTexts(await api.texts());
    go(`/studio/${r.chapter}`);
    openRemix({ course: COURSE, chapter: r.chapter, title: "New chapter", starter: "What should this chapter be about? Say who it's for and what you'd like to practise." });
  };
  const level = texts ? texts.levels.find((l) => l.id === levelId) ?? texts.levels[0] : null;
  const chips = useRef<HTMLElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useLayout();
  const toggleSide = () => setLayout((l) => ({ ...l, collapsed: !l.collapsed }));
  // ⌘\ or Ctrl+\ hides and shows the sidebar, as in most editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); toggleSide(); }
      // ⌘, opens this app's settings, as on a Mac.
      if ((e.metaKey || e.ctrlKey) && e.key === ",") { e.preventDefault(); go("/studio/settings"); }
    };
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
      <RemixPanel />
      <Sidebar onNewChapter={() => void newChapter()} texts={texts} deck={deck} practised={practised} current={doc === "chapter" ? level?.id ?? "" : doc === "start" ? "home" : doc === "updates" ? "mixtape" : doc} itemId={doc === "chapter" ? itemId : undefined} locked={recording} />
      <div className={`ve-doc${doc === "recordings" || doc === "progress" || doc === "updates" || doc === "mixtape" || doc === "settings" ? " solo" : ""}`} ref={docRef}>
        <Resizer className="split" label="Text and recorder split" onDrag={dragSplit} onReset={() => setLayout((l) => ({ ...l, split: LAYOUT.split }))}
          onNudge={(d) => setLayout((l) => ({ ...l, split: clamp(l.split + d * 0.03, 0.32, 0.72) }))} />
        {texts && (
          <nav className="ve-chips" aria-label="Chapters" ref={chips}>
            <button aria-current={doc === "home" ? "page" : undefined} onClick={() => go("/studio")} disabled={recording}>Home</button>
            <button aria-current={doc === "free" ? "page" : undefined} onClick={() => go("/studio/free")} disabled={recording}>Studio</button>
            <button aria-current={doc === "recordings" ? "page" : undefined} onClick={() => go("/history")} disabled={recording}>Recordings</button>
            <button aria-current={doc === "mixtape" ? "page" : undefined} onClick={() => go("/studio/mixtape")} disabled={recording}>Mixtape</button>
            <button aria-current={doc === "today" ? "page" : undefined} onClick={() => go("/deck")} disabled={recording}>Today</button>
            <button aria-current={doc === "settings" ? "page" : undefined} onClick={() => go("/studio/settings")} disabled={recording}>Settings</button>
            {texts.levels.map((l) => <button key={l.id} aria-current={doc === "chapter" && l.id === level?.id ? "page" : undefined} onClick={() => go(`/studio/${l.id}`)} disabled={recording}>{l.title}</button>)}
          </nav>
        )}
        {loadErr && !texts
          ? <div className="ve-page"><article className="ve-col"><p role="alert" className="ve-err">{loadErr}</p></article></div>
          : doc === "recordings" || doc === "progress"
          ? <div className="ve-page"><div className="ve-col ve-embed">{doc === "recordings" ? (text ? <TextHistory key={text} promptId={text} /> : <HistoryPage />) : <ProgressSoon />}</div></div>
          : doc === "updates"
          ? <div className="ve-page"><div className="ve-col ve-embed"><UpdatesDoc onTexts={setTexts} /></div></div>
          : doc === "settings"
          ? <div className="ve-page"><div className="ve-col ve-embed"><PracticeSettings /></div></div>
          : doc === "mixtape"
          ? <div className="ve-page"><div className="ve-col ve-embed"><MixtapeDoc onTexts={setTexts} /></div></div>
          : doc === "free"
          ? profile && <StudioDoc band={profile.comfort_range_hz ?? null} onRecording={setRecording} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />
          : doc === "home"
          ? texts && profile && <HomeDoc texts={texts} deck={deck} practised={practised} history={history} profile={profile} />
          : doc === "start"
          ? profile && <StartDoc profile={profile} onProfile={setProfile} onRecording={setRecording} onTake={(t) => { setPractised((s) => new Set([...s, t.prompt_id])); setHistory((h) => [...h, t]); }} />
          : doc === "today"
          ? <TodayDoc key={first ?? ""} first={first ?? null} band={profile?.comfort_range_hz ?? null} onDeck={setDeck}
            onUseRange={(lo, hi) => { if (profile) void api.saveProfile({ ...profile, comfort_range_hz: [lo, hi] }).then(setProfile); }} onRecording={setRecording} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />
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
/** Voice care keeps its heart; every other tip is a numbered step. */
const HEART = "M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 018 4.7a2.8 2.8 0 015.5 1.6C13.5 10.2 8 13.5 8 13.5z";

/**
 * A chapter's video. Until you press play it is only a card drawn here (no request to YouTube, so
 * nothing about you leaves this computer); then YouTube's no-cookie player loads in its place.
 */
export function ChapterVideo({ video }: { video: NonNullable<TextLevel["video"]> }) {
  const [on, setOn] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${video.id}`;
  if (on) return (
    <div className="ci-video">
      <div className="ci-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} title={video.title || "Video"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
      <p className="ci-vmeta">{video.by && <>{video.by} · </>}<a href={watch} target="_blank" rel="noreferrer">Open on YouTube</a></p>
    </div>
  );
  // The thumbnail is a copy saved with the course, so showing it asks nothing of YouTube.
  const poster = video.image ? picture(video.image) : undefined;
  // Small until you want it: a thumbnail row; pressing it opens the full player.
  return (
    <button type="button" className="ci-vrow" onClick={() => setOn(true)} aria-label={`Play video: ${video.title}`}>
      <span className={`ci-thumb${poster ? "" : " plain"}`}>
        {poster && <img src={poster} alt="" loading="lazy" />}
        <span className="ci-play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M5.5 3.5l7 4.5-7 4.5z" fill="currentColor" /></svg></span>
      </span>
      <span className="ci-vtext"><small>Video{video.by ? ` · ${video.by}` : ""}</small><b>{video.title || "Watch a video"}</b><small>Plays from YouTube when you press it</small></span>
    </button>
  );
}

/**
 * A chapter's intro: its opening line, then each **Label.** paragraph as a numbered step (number,
 * label, a line or two), voice care tinted with a heart. All of it the first time; once you've
 * practised there, the opening line and "Show tips". The sources fold away under the list. On a
 * phone, "Skip to the texts" jumps past the steps.
 */
function ChapterIntro({ level, started }: { level: TextLevel; started: boolean }) {
  // Decided once per visit (the parent keys this by chapter), so it never folds up under you.
  const [open, setOpen] = useState(!started);
  const [sources, setSources] = useState(false);
  const basis = howTo(level.basis);
  const steps = chapterSteps(level.basis);
  const tips = steps?.tips ?? [];
  return (
    <section className="ci" aria-label="About this chapter">
      <Markdown src={steps?.lede ?? basis} className={steps ? "ci-lede" : "ci-body"} headingOffset={1} />
      {tips.length > 0 && open && (
        <button type="button" className="ci-link ci-skip" onClick={() => document.getElementById(`texts-${level.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          Skip to the texts<span aria-hidden="true">↓</span>
        </button>
      )}
      {tips.length > 0 && open && (
        <ol className="ci-tips" id={`tips-${level.id}`}>
          {tips.map((t, i) => {
            const care = isCare(t.label);
            return (
              <li key={i} className={care ? "care" : undefined}>
                {care
                  ? <span className="ci-ic" aria-hidden="true"><svg viewBox="0 0 16 16"><path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  : <span className="ci-ic ci-n" aria-hidden="true">{tips.slice(0, i + 1).filter((x) => !isCare(x.label)).length}</span>}
                <div>{t.label && <b>{t.label}</b>}<Markdown src={t.body} headingOffset={2} /></div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="ci-foot">
        {tips.length > 0 && (
          <button type="button" className="ci-link" aria-expanded={open} aria-controls={`tips-${level.id}`} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide tips" : `Show tips (${tips.length})`}<span aria-hidden="true">{open ? "↑" : "↓"}</span>
          </button>
        )}
        <button type="button" className="ci-link quiet" aria-expanded={sources} onClick={() => setSources((v) => !v)}>
          Sources<span aria-hidden="true">{sources ? "↑" : "↓"}</span>
        </button>
      </div>
      {sources && <p className="ci-src">{level.written_by}{level.source_url && <> <a href={level.source_url} target="_blank" rel="noreferrer">Source</a></>}</p>}
      {level.video && <ChapterVideo video={level.video} />}
    </section>
  );
}

const chapterDone = (l: TextLevel, practised: Set<string>) => l.items.every((it) => practised.has(textId(COURSE, l.id, it.id)));
/** The first chapter you haven't finished: next up. */
const nextChapter = (texts: Texts, practised: Set<string>) => texts.levels.find((l) => !chapterDone(l, practised));

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

/** Where the sidebar keeps which parts of the course are folded. */
const FOLDED_KEY = "lilt.sidebar.folded";

/** The places above the tree: Home, your recordings and your progress. */
const PLACES = [
  { id: "home", label: "Home", to: "/studio", icon: "M2.8 7.2L8 2.8l5.2 4.4V13a.8.8 0 01-.8.8H9.6V10H6.4v3.8H3.6a.8.8 0 01-.8-.8z" },
  { id: "free", label: "Studio", to: "/studio/free", icon: "M8 2.5a2 2 0 012 2v3.5a2 2 0 01-4 0V4.5a2 2 0 012-2zM4.5 8a3.5 3.5 0 007 0M8 11.5v2" },
  { id: "recordings", label: "Recordings", to: "/history", icon: "M3 6.5v3M5.5 4v8M8 2.5v11M10.5 5v6M13 7v2" },
  { id: "mixtape", label: "Mixtape", to: "/studio/mixtape", icon: "M2.6 4h10.8a.8.8 0 01.8.8v6.4a.8.8 0 01-.8.8H2.6a.8.8 0 01-.8-.8V4.8a.8.8 0 01.8-.8zM4.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M9.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M6.6 7.6h2.8M5 12l1-2h4l1 2" },
  { id: "settings", label: "Practice settings", to: "/studio/settings", icon: "M8 5.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zM8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" },
];

/**
 * Your mixtape, in Practice (#/studio/mixtape): your own remix of this course, made by your AI.
 * Whether you're playing it or the original, its history with Undo, going back to the original,
 * updates from the original, and what to ask your AI.
 */
function MixtapeDoc({ onTexts }: { onTexts: (t: Texts) => void }) {
  const m = useMixtape(COURSE, () => void api.texts().then(onTexts));
  return (
    <div className="co ve-mixtape">
      <header className="co-head">
        <h1>Your mixtape</h1>
        <p>Your own remix of {m.c ? m.c.title.toLowerCase() : "this course"}. The first change makes your own copy; Practice then plays your version. The original stays as it is, and you can go back any time.</p>
      </header>
      <MixtapeSections m={m} updatesHref="/studio/updates" remix={
        <section className="co-sec">
          <h2>How to remix</h2>
          <div className="co-box">
            <div className="co-row"><div><b>A chapter</b><p>Open it and press <b className="co-k">Remix</b> below the chapter title. Say what to change; you can keep going or undo.</p></div></div>
            <div className="co-row"><div><b>A new chapter</b><p>Press <b className="co-k">New chapter</b> at the end of the chapter list, then say what it should be about.</p></div></div>
            <div className="co-row">
              <div><b>The whole course</b><p>Ask for your own version of everything: gentler, shorter, about your own days.</p></div>
              <button className="btn-secondary" onClick={() => openRemix({ course: COURSE, title: "The whole course" })}>Remix the whole course</button>
            </div>
          </div>
        </section>
      } />
    </div>
  );
}

/** One piece of the syllabus as you'd read it: a text in the reading serif with its hint, or Markdown. */
function PieceView({ piece }: { piece: Piece | null }) {
  if (!piece) return <p className="ve-up-gone">Removed</p>;
  if (piece.text) return <div className="ve-up-text"><p>{piece.text}</p>{piece.hint && <small>{piece.hint}</small>}</div>;
  return <Markdown src={piece.markdown.replace(/^---\n[\s\S]*?\n---\n/, "")} className="ve-md ve-up-md" headingOffset={1} />;
}

const KIND: Record<SyllabusChange["kind"], string> = { added: "New", changed: "Updated", removed: "Removed" };

/**
 * Updates from Lilt's original, for someone using their own version of the syllabus: what comes in
 * on its own, where you both changed something (pick yours or Lilt's), and an undo once it's done.
 */
export function UpdatesDoc({ course, onTexts, back = "#/studio", backLabel = "Back to Home" }: { course?: string; onTexts?: (t: Texts) => void; back?: string; backLabel?: string }) {
  const [u, setU] = useState<SyllabusUpdates | null>(null);
  const [picks, setPicks] = useState<Record<string, "yours" | "original">>({});
  const [done, setDone] = useState<{ taken: number; kept: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = () => api.syllabusUpdates(course).then(setU, (e) => setError(String(e.message ?? e)));
  useEffect(() => { void load(); }, [course]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = async () => { if (onTexts) onTexts(await api.texts()); await load(); };
  const run = async (f: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await f(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const apply = () => run(async () => {
    const r = await api.applySyllabusUpdates(picks, course);
    setDone({ taken: r.updates_taken, kept: r.kept_yours }); setPicks({}); await refresh();
  });
  const undo = () => run(async () => { await api.undoSyllabus(course); setDone(null); await refresh(); });

  if (!u) return <article className="ve-soon"><h1>Updates from Lilt</h1>{error && <p role="alert">{error}</p>}</article>;
  const choose = u.changes.filter((c) => c.handling === "choose");
  const coming = u.changes.filter((c) => c.handling === "take");
  const same = u.changes.filter((c) => c.handling === "already").length;
  const ready = choose.every((c) => picks[c.id]);
  const n = choose.length + coming.length;
  return (
    <article className="ve-soon ve-updates">
      <h1>Updates from Lilt</h1>
      {done ? (
        <>
          <p className="lede">All up to date.</p>
          <p>{done.taken} {done.taken === 1 ? "update" : "updates"} brought in{done.kept ? `, and ${done.kept} kept as yours` : ""}. Your practice history stays with each text.</p>
          <p className="ve-up-actions"><a className="ve-up-go" href={back}>{backLabel}</a><button className="ve-up-quiet" onClick={undo} disabled={busy}>Undo</button></p>
        </>
      ) : u.using === "original" ? (
        <p>You're using Lilt's original chapters, so its updates already apply. <a href={back}>{backLabel}</a></p>
      ) : !u.available ? (
        <p>Your version is up to date with Lilt's original. <a href={back}>{backLabel}</a></p>
      ) : (
        <>
          <p>Lilt's original chapters have changed since you made your own version. Updates to things you haven't changed come straight in.{choose.length > 0 && " Where you both changed something, choose which to keep."}</p>
          {choose.length > 0 && (
            <section>
              <h2>Choose ({choose.length})</h2>
              <ul className="ve-up-list">
                {choose.map((c) => (
                  <li key={c.id}>
                    <div className="ve-up-head"><b>{c.title}</b><span className="ve-up-kind">{KIND[c.kind]}</span>{c.part && <small>{c.part}</small>}</div>
                    <div className="ve-up-pick" role="radiogroup" aria-label={c.title}>
                      {(["yours", "original"] as const).map((side) => (
                        <button key={side} role="radio" aria-checked={picks[c.id] === side} className={picks[c.id] === side ? "on" : ""}
                          onClick={() => setPicks((p) => ({ ...p, [c.id]: side }))}>
                          <span className="ve-up-label">{side === "yours" ? "Keep yours" : "Take Lilt's new version"}</span>
                          <PieceView piece={side === "yours" ? c.yours : c.original} />
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {coming.length > 0 && (
            <section>
              <h2>Coming in ({coming.length})</h2>
              <ul className="ve-up-list">
                {coming.map((c) => (
                  <li key={c.id}>
                    <details>
                      <summary className="ve-up-head"><b>{c.title}</b><span className="ve-up-kind">{KIND[c.kind]}</span>{c.part && <small>{c.part}</small>}</summary>
                      <PieceView piece={c.kind === "removed" ? c.before : c.original} />
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {same > 0 && <p className="ve-up-note">{same} more {same === 1 ? "change matches" : "changes match"} what you'd already done.</p>}
          {error && <p className="ve-up-error" role="alert">{error}</p>}
          <p className="ve-up-actions">
            {choose.length > 1 && !ready && <button className="ve-up-quiet" onClick={() => setPicks(Object.fromEntries(choose.map((c) => [c.id, "original" as const])))}>Take all of Lilt's new versions</button>}
            <button className="ve-up-go" onClick={apply} disabled={busy || !ready}>Bring in {n} {n === 1 ? "update" : "updates"}</button>
            {!ready && <span className="ve-up-note">Choose for each one above first.</span>}
          </p>
          <p className="ve-up-note">You can undo this afterwards.</p>
        </>
      )}
    </article>
  );
}

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
function Sidebar({ texts, deck, practised, current, itemId, locked, onNewChapter }: {
  texts: Texts | null; deck: Deck | null; practised: Set<string>; current: string; itemId?: string; locked: boolean; onNewChapter: () => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([current]));
  // Only the page you're on stays unfolded; the rest fold away as you move.
  useEffect(() => { setOpen(new Set([current])); }, [current]);
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const left = deck ? deck.items.filter((i) => !i.done_today).length : 0;
  const total = deck?.items.length ?? 0;
  const next = texts && nextChapter(texts, practised);
  // Parts of the course you've folded away, kept in this browser. Going to a chapter unfolds its part.
  const [folded, setFolded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FOLDED_KEY) ?? "[]")); } catch { return new Set(); }
  });
  const fold = (part: string, on: boolean) => setFolded((f) => {
    const n = new Set(f); if (on) n.add(part); else n.delete(part);
    try { localStorage.setItem(FOLDED_KEY, JSON.stringify([...n])); } catch { /* private window: folds just aren't kept */ }
    return n;
  });
  const here = texts?.levels.find((l) => l.id === current);
  const currentPart = here ? here.part?.trim() || "Chapters" : null;
  useEffect(() => { if (currentPart && folded.has(currentPart)) fold(currentPart, false); }, [current]); // eslint-disable-line react-hooks/exhaustive-deps
  const file = (key: string, label: string, done: boolean, on: boolean, to: string, disabled = false) => (
    <li key={key}>
      <button className={`ve-file${done ? " done" : ""}`} onClick={() => go(to)} disabled={locked || disabled} aria-current={on ? "page" : undefined} title={label}>
        <span className="t">{label}</span>{done && <Tick className="ve-tick" />}
      </button>
    </li>
  );
  return (
    <nav className="ve-side" aria-label="Practice">
      {/* The list scrolls under a fixed top strip, so nothing slides beneath the sidebar toggle. */}
      <div className="ve-side-scroll">
      {PLACES.map((p) => (
        <button key={p.id} className="ve-home" onClick={() => go(p.to)} disabled={locked} aria-current={current === p.id ? "page" : undefined}>
          <span className="ve-home-ic"><svg viewBox="0 0 16 16" aria-hidden="true"><path d={p.icon} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <span className="t">{p.label}</span>
          {p.id === "mixtape" && texts?.edition && (texts.edition.updates
            ? <span className="ve-mix-tag new">{texts.edition.updates} new</span>
            : texts.edition.mine ? <span className="ve-mix-tag">{texts.edition.changes}</span> : null)}
        </button>
      ))}
      <ul className="ve-tree">
        <Folder id="today" label="Today" current={current === "today"} open={open.has("today")} onToggle={toggle} onOpen={() => go("/deck")} locked={locked}
          extra={deck && !deck.paused ? (left === 0 && total ? <Tick className="ve-tick" /> : <span className="c">{total - left}/{total}</span>) : null}>
          {deck?.paused ? <li className="ve-note-row">Resting today</li>
            : deck?.items.map((it) => file(it.card.id, textLabel(it.card.front, it.card.id.split(".").pop() ?? ""), it.done_today, false, `/deck?card=${encodeURIComponent(it.card.id)}`, it.done_today))}
        </Folder>
      </ul>
      {/* Each part of the course is a heading of its own, with how many of its chapters are done; a
          course without parts keeps one "Chapters" heading. */}
      {texts && byPart(texts.levels).map((g, gi, groups) => {
        const name = g.part ?? "Chapters", shut = folded.has(name), inPart = g.part ? g.levels : texts.levels;
        return (
        <Fragment key={`${gi}-${g.part ?? ""}`}>
          {(g.part || gi === 0) && (
            <h6 className="ve-part">
              <button onClick={() => fold(name, !shut)} aria-expanded={!shut}>
                <span className="t">{name}</span>
                <span className="c">{inPart.filter((l) => chapterDone(l, practised)).length} of {inPart.length}</span>
                <Chevron open={!shut} />
              </button>
            </h6>
          )}
          {!shut && <ul className="ve-tree">
            {g.levels.map((l) => {
              const n = l.items.length, d = l.items.filter((it) => practised.has(textId(COURSE, l.id, it.id))).length;
              return (
                <Folder key={l.id} id={l.id} label={l.title} current={current === l.id && !itemId} open={open.has(l.id)} onToggle={toggle} onOpen={() => go(`/studio/${l.id}`)} locked={locked}
                  extra={d >= n ? <Medal className="ve-medal-s" /> : <span className={l.id === next?.id ? "c next" : "c"} title={l.id === next?.id ? "Next up" : undefined}>{d}/{n}</span>}>
                  {l.items.map((it) => file(it.id, textLabel(it.text, it.id), practised.has(textId(COURSE, l.id, it.id)), current === l.id && itemId === it.id, `/studio/${l.id}/${it.id}`))}
                </Folder>
              );
            })}
            {gi === groups.length - 1 && <li><button className="ve-new-chapter" onClick={onNewChapter} disabled={locked}><span aria-hidden="true">+</span>New chapter</button></li>}
          </ul>}
        </Fragment>
        );
      })}
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- the dock */

/** The recorder floats over the text at every size, so results always show under the text you said. */
function useSplit() {
  return false;
}

type Pt = PitchPoint;
/** The live chart's fixed pitch range, so it never rescales while you speak. */
const LO = 80, HI = 400;

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

/**
 * A live number you can read: it eases toward new values in semitones, ignores wobbles under a
 * quarter semitone and changes at most about seven times a second, and through a pause it keeps your last value (marked as held) instead of
 * vanishing. Cleared when a new take or listening starts.
 */
function useHeld(value: number | null, run: boolean, smooth = false): { v: number | null; held: boolean } {
  const [shown, setShown] = useState<{ v: number | null; held: boolean }>({ v: null, held: false });
  const target = useRef<number | null>(null);
  target.current = value;
  useEffect(() => { if (run) setShown({ v: null, held: false }); }, [run]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = target.current;
      setShown((s) => {
        if (t === null) return s.v === null || s.held ? s : { v: s.v, held: true };
        // Ease in log space (semitones), so a jump of a fifth reads as a glide, not a flicker.
        const v = smooth && s.v !== null && !s.held ? Math.exp(Math.log(s.v) + (Math.log(t) - Math.log(s.v)) * 0.45) : t;
        // Small wobbles don't redraw the number; a real move does.
        return s.v !== null && !s.held && Math.abs(12 * Math.log2(v / s.v)) < 0.25 ? s : { v, held: false };
      });
    }, 150);
    return () => window.clearInterval(id);
  }, [smooth]);
  return shown;
}

/** The recorder at the bottom: one button, the waveform with the pitch line on it, and the numbers. */
export function Dock({ meta, band, allowRetake, onSaved, onRecording, children, idleHint, result, quiet = false, liveButton = false, retake = false, eyesOff = false, foldChart = false, brightness = false }: {
  meta: TakeMeta | null; band: [number, number] | null; allowRetake: boolean; quiet?: boolean;
  /** Show the darker–brighter meter while the mic is in use (the Resonance chapter's steady sounds). */
  brightness?: boolean;
  /** An eyes-off take: no live pitch line or numbers, so you listen to yourself instead. */
  eyesOff?: boolean;
  /** Offer "Show my pitch live" (Studio); a text's recorder only records. */
  liveButton?: boolean;
  /** The live chart stays up between takes (Studio): fold it once a take is saved, with a toggle. */
  foldChart?: boolean;
  /** You've recorded this text before: the button says "Record again". */
  retake?: boolean;
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
  const box = useRef<HTMLElement>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (rec.current?.state === "recording") void rec.current.stop().catch(() => {});
    };
  }, []);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const recording = state === "recording";
  const points = useLivePitch(mic.stream, recording || listening) as Pt[];
  const kept = useRef<Pt[]>([]);
  if (points.length) kept.current = points;
  const shown = points.length ? points : kept.current;
  const amps = useRef<{ t: number; v: number }[]>([]);
  // Narrower than the split view, the recorder docks at the bottom with a slim chart: no note labels.
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 1100px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);


  useEffect(() => { onRecording(recording); }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  // The recorder sits in the page, under the text: bring it into view while you record (live line and
  // Stop), and the take's result once it's saved (it renders just after the recorder).
  useEffect(() => { if (recording) box.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [recording]);
  useEffect(() => {
    if (state !== "saved") return;
    const id = window.setTimeout(() => {
      const next = box.current?.nextElementSibling;
      if (next) next.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [state]);
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

  // "Play my note": the middle of your range, to hum along to. It never plays while the mic listens.
  const note = band ? noteFor(band) : null;
  const [toneOn, setToneOn] = useState(false);
  useEffect(() => onTone(setToneOn), []);
  useEffect(() => { if (recording || listening) stopTone(); }, [recording, listening]);
  useEffect(() => () => stopTone(), []);

  // Brighter or darker than the start of this take, read a few times a second.
  const [bright, setBright] = useState<Brightness | null>(null);
  useEffect(() => {
    if (!brightness || !mic.stream || !(recording || listening)) return;
    setBright(null);
    let last = 0;
    return trackBrightness(mic.stream, (b) => {
      const t = performance.now();
      if (t - last < 120) return;
      last = t;
      setBright(b);
    });
  }, [brightness, mic.stream, recording, listening]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const s = (performance.now() - (rec.current?.startedAt ?? 0)) / 1000;
      setElapsed(s);
      if (s > 120) void stop();
    }, 200);
    return () => clearInterval(id);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps


  const start = async () => {
    if (!metaRef.current || starting.current) return;
    starting.current = true;
    try {
      setErr(null); setListening(false);
      const stream = mic.stream ?? (await mic.request());
      if (!stream || !mounted.current) return;
      // The take keeps the half second before Record: let that be clear of your note.
      await clearOfTone();
      if (!mounted.current) return;
      kept.current = [];
      const r = new TakeRecorder(stream, (x) => { setState(x.state); if (x.error) setErr(x.error); });
      rec.current = r;
      await r.start(metaRef.current);
      if (!mounted.current) { if (r.state === "recording") await r.stop(); return; }
      setElapsed(0);
    } catch (e: any) {
      // No take was captured when starting failed; let the learner retry Record.
      setState("idle"); setErr(e.message);
    } finally { starting.current = false; }
  };
  const stop = async () => {
    try { onSaved(await rec.current!.stop()); } catch (e: any) { setErr(e.message); }
  };
  // After an error a new take can start; audio held from the failed one is recovered separately.
  const canStart = !!meta && (state === "idle" || state === "error" || (allowRetake && state === "saved"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      // Space stops a take any time, but won't start one behind the Remix chat.
      if (recording) void stop(); else if (canStart && !document.querySelector(".ve.remixing")) void start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const voiced = shown.filter((p) => p.hz).map((p) => p.hz as number);
  const sorted = [...voiced].sort((a, b) => a - b);
  const live = recording || listening;
  // The readout reads the cleaned tail (octave slips and clicks removed), not raw frames.
  const nowRaw = live ? recentMedian(cleanContour(shown.slice(-300)).slice(-80).map((p) => p.hz), 9) : null;
  const mid = sorted.length > 8 ? sorted[sorted.length >> 1] : null;
  const range = sorted.length > 8 ? [sorted[Math.floor(sorted.length * 0.1)], sorted[Math.floor(sorted.length * 0.9)]] : null;
  const last2 = shown.length ? shown.filter((p) => p.t > shown[shown.length - 1].t - 2).map((p) => p.hz) : [];
  const sdRaw = steadinessSt(last2);
  // Calm numbers: they hold through pauses rather than flicking to a dash.
  const nowHeld = useHeld(nowRaw, live, true);
  const now = nowHeld.v;
  const sd = useHeld(sdRaw, live).v;
  const inBand = mid && band ? mid >= band[0] && mid <= band[1] : null;
  const active = recording || listening || shown.length > 0;
  // Three seconds in, if even your loudest moment is very quiet, say so: the mic, not your voice.
  const loudest = amps.current.length ? Math.max(...amps.current.filter((a) => a.t > amps.current[amps.current.length - 1].t - 3).map((a) => a.v)) : 1;
  const tooQuiet = (recording ? elapsed > 3 : listening && amps.current.length > 120) && loudest < Math.sqrt(0.012) * 2.4;

  const startListening = async () => { stopTone(); const s = mic.stream ?? (await mic.request()); if (s) setListening(true); };

  const dash = <span className="ve-none">–</span>;
  // Until the microphone is in use, the right half is just the room's window and the record button.
  const idle = !recording && !listening && state !== "saving" && state !== "error";
  const showResult = idle && !!result;
  // Each new take folds the chart again once it's saved.
  const [chartOpen, setChartOpen] = useState(false);
  useEffect(() => { if (recording) setChartOpen(false); }, [recording]);
  const canFold = foldChart && idle && state === "saved";
  const folded = canFold && !chartOpen;
  const status = recording ? "Recording" : listening ? "Live" : state === "saving" ? "Saving…" : state === "error" ? "Not saved" : state === "saved" ? "Saved" : "Ready";
  const showBright = brightness && (recording || listening);
  return (
    <section ref={box} className={`ve-dock${recording ? " rec" : ""}${listening ? " live" : ""}${idle ? " idle" : ""}${showResult ? " has-result" : idle ? " art" : ""}${quiet ? " quiet" : ""}${eyesOff ? " eyes-off" : ""}${folded ? " folded" : ""}${showBright ? " bright" : ""}`} aria-label="Recorder">
      {showResult ? <div className="ve-result-pane"><h2>Your take</h2>{result}</div> : <SleepingCat hint={idleHint} title={quiet ? "Nice one" : undefined} />}
      <div className="ve-now" aria-live="off">
        <div className={`ve-now-read${nowHeld.held ? " held" : ""}`}>
          <b>{now ? <>{Math.round(now)}<small>Hz</small></> : dash}</b>
          <span>{now ? (nowHeld.held ? `Last heard · ${noteName(now)}` : noteName(now)) : "Your pitch now"}</span>
        </div>
        <span className={`ve-state ${recording ? "rec" : listening ? "live" : state}`}><i aria-hidden="true" />{status}</span>
      </div>
      <div className="ve-scope">
        <PianoRoll live points={shown} duration={shown.length ? shown[shown.length - 1].t : 0} band={band} range={[LO, HI]}
          levels={amps.current} compact={narrow} height="100%" label="Your pitch, live, over the last eight seconds" />
        {!active && <span className="ve-scope-idle">{idleHint}</span>}
        {eyesOff && active && <span className="ve-eyes">Eyes off: listen to yourself, not the line</span>}
        {inBand !== null && <span className={`ve-inrange${inBand ? " ok" : ""}`}>{inBand ? "In your range" : "Outside your range"}</span>}
      </div>
      {showBright && (
        <div className="ve-bright">
          <div className="ve-bright-track" role="meter" aria-label="Brightness compared with the start of this take" aria-valuemin={-1} aria-valuemax={1}
            aria-valuenow={bright?.rel != null ? Number(meterPosition(bright.rel).toFixed(2)) : 0} aria-valuetext={brightnessWords(bright)}>
            <i className="ve-bright-start" />
            <span className={`ve-bright-pos${bright?.rel == null ? " wait" : bright.voiced ? "" : " held"}`} style={{ transform: `translateX(${(bright?.rel != null ? meterPosition(bright.rel) : 0) * 50}%)` }}><b /></span>
          </div>
          <div className="rz-labels" aria-hidden="true"><span>Darker</span><span>Where you started</span><span>Brighter</span></div>
          <p className="ve-bright-words" aria-hidden="true">{brightnessWords(bright)}</p>
          <p className="ve-bright-note">Works best on a steady sound on one note: a hum, a held vowel, a whisper. Not on speech.</p>
        </div>
      )}
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
          : (state === "saved" && allowRetake) || retake ? "Record again" : "Record"}
        {(recording || canStart) && <kbd aria-hidden="true">Space</kbd>}
      </button>
      <div className="ve-dock-sub">
        <span className={`ve-dock-msg${tooQuiet ? " quiet-mic" : ""}`}>
          {tooQuiet ? "Your mic hears you very quietly. Come a little closer to it."
            : recording ? "Read the highlighted text"
            : listening ? "Listening only. Nothing is saved."
            : state === "saving" ? "Saving to your computer…" : ""}
        </span>
        {note && !quiet && (
          <button className="ve-ghost ve-note" onClick={() => (toneOn ? stopTone() : playTone(note))} disabled={recording || listening || state === "saving"} aria-pressed={toneOn}
            title={recording || listening ? "Your note can't play while the microphone is listening" : "A soft tone at the middle of your comfortable range, to hum along to"}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6.2h2.2L8 3.4v9.2L4.7 9.8H2.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M10.6 5.6a3.4 3.4 0 010 4.8M12.4 3.9a5.8 5.8 0 010 8.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            Play my note · {noteName(note)}
          </button>
        )}
        {children}
        {canFold && <button className="ve-ghost" aria-expanded={!folded} onClick={() => setChartOpen(!chartOpen)}>{folded ? "Show pitch line" : "Hide pitch line"}</button>}
        <span className="ve-sp" />
        {liveButton && !recording && !quiet && (listening
          ? <button className="ve-ghost" aria-pressed="true" onClick={() => setListening(false)}>Stop listening</button>
          : <button className="ve-icon" onClick={() => void startListening()} disabled={state === "saving"} aria-label="Show my pitch live" title="Show my pitch live, without recording">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 9c1.4-3.2 2.6-3.2 3.6 0s2.4 3.2 3.4 0 2.4-3.2 3.5 0 1.9 1.6 2.5 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>)}
      </div>
      {mic.error ? <MicHelp error={mic.error} onRetry={() => void mic.request()} /> : err && <p className="ve-err" role="alert">{err}</p>}
      {state === "error" && rec.current?.onServer && <button className="btn-secondary" onClick={() => void rec.current!.retrySave().then(onSaved, (e) => setErr(e.message))}>Retry saving</button>}
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
const FREE_HINT = "Press the wave to watch your pitch, or Record to keep a take";

const RESULTS_OPEN = "lilt.results.open";

/**
 * A take's measured details, folded to one line (its middle pitch and how much of it sat in your range)
 * so the page stays short; open them for the rest. Whether you keep them open is remembered.
 */
export function FoldedMeasures({ take, band, card, onUseRange, onMeasured }: {
  take: Take; band: [number, number] | null; card?: CardKind | null;
  onUseRange?: (lo: number, hi: number) => void; onMeasured?: (m: Measured) => void;
}) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(RESULTS_OPEN) === "1"; } catch { return false; } });
  const [measured, setMeasured] = useState<Measured | undefined>(undefined);
  const median = measured?.median;
  const toggle = (on: boolean) => { setOpen(on); try { localStorage.setItem(RESULTS_OPEN, on ? "1" : "0"); } catch { /* private mode: forget on reload */ } };
  const inBand = median && band ? median >= band[0] && median <= band[1] : null;
  // How much of the voiced take sat in your range says more than where its middle fell; the middle is
  // the fallback when there's too little voice to count.
  const share = median ? measured!.inRange(band) : null;
  return (
    <details className="ve-details" open={open} onToggle={(e) => { if (e.currentTarget.open !== open) toggle(e.currentTarget.open); }}>
      <summary>Pitch details
        <span className="ve-sum">{median === undefined ? "Measuring…" : median === null ? "No clear pitch"
          : <>{Math.round(median)} Hz · {noteName(median)}{share !== null ? ` · ${Math.round(share * 100)}% in your range` : inBand !== null && (inBand ? " · in your range" : " · outside your range")}</>}</span>
      </summary>
      <Measures take={take} band={band} card={card} onUseRange={onUseRange} onMeasured={(m) => { setMeasured(m); onMeasured?.(m); }} />
    </details>
  );
}

/** A free take's summary: listen back, then the measured pitch line and numbers once analysis lands. */
function FreeResult({ take, band, onMeasured }: { take: Take; band: [number, number] | null; onMeasured?: (m: Measured) => void }) {
  return (
    <div className="prc ve-result" key={take.id}>
      <ListenBack src={take.audio_url} />
      <FoldedMeasures take={take} band={band} onMeasured={onMeasured} />
    </div>
  );
}

/* ---------------------------------------------------------------- home: what Practice is for */

/**
 * The Practice home: actions and the chapter catalog, with the owner's complete Markdown guide
 * available in a disclosure. Keep the guide intact so code blocks and references work across sections.
 * Nothing is picked, so the recorder takes free recordings.
 */
function HomeDoc({ texts, deck, practised, history, profile }: {
  texts: Texts; deck: Deck | null; practised: Set<string>; history: Take[]; profile: Profile;
}) {
  const band = profile.comfort_range_hz ?? null;
  const cover = texts.home_cover && picture(texts.home_cover);
  const next = nextChapter(texts, practised);
  return (
    <>
      <div className="ve-page">
        {cover && <div className="ve-cover" style={{ backgroundImage: `url(${cover})` }} role="img" aria-label="Cover picture" />}
        <article className="ve-col ve-home-col">
          <header className="ve-head"><h1>Your practice</h1><p className="ve-subtitle">Pick up where you left off, or explore a chapter.</p></header>
          {!band ? <StartCard /> : <YourPractice history={history} band={band} next={<NextStep deck={deck} texts={texts} practised={practised} />} />}
          <nav className="ve-course-jumps" aria-label="Course shortcuts">
            {texts.levels.length > 0 && <a href={`#/studio/${next?.id ?? texts.levels[0].id}`}>{practised.size ? "Continue learning" : "First chapter"}</a>}
            <a href="#/deck">Today's practice</a>
            <button type="button" onClick={() => document.getElementById("voice-chapters")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Browse {texts.levels.length} chapters <span aria-hidden="true">↓</span></button>
          </nav>
          {texts.home && <details className="ve-course-guide"><summary>Course guide<span>Introduction and resources</span></summary><Markdown src={texts.home} className="ve-md" headingOffset={1} /></details>}
          <section className="ve-md" id="voice-chapters" aria-label="Course chapters">
            <h2>The chapters</h2>
            {byPart(texts.levels).map((g, gi) => (
              <div className="ve-part-group" key={`${gi}-${g.part ?? ""}`}>
                {g.part && <h3 className="ve-part-h">{g.part}</h3>}
                <ol className="ve-chapters">
                  {g.levels.map((l) => {
                    const n = l.items.length, d = l.items.filter((it) => practised.has(textId(COURSE, l.id, it.id))).length;
                    const isNext = l.id === next?.id;
                    return (
                      <li key={l.id}>
                        <a href={`#/studio/${l.id}`} className={isNext ? "next" : undefined}>
                          <span className="n">{l.level}</span>
                          <span className="t"><b>{l.title}{isNext && <span className="ve-tag next">Next up</span>}</b><small>{l.subtitle}</small></span>
                          {d >= n ? <Medal className="ve-medal-s" /> : <span className="c">{d}/{n}</span>}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            {texts.edition?.mine && (
              <p className="ve-edition">
                You're playing your mixtape of these chapters ({texts.edition.changes} {texts.edition.changes === 1 ? "change" : "changes"}).{" "}
                <a href="#/studio/mixtape">{texts.edition.updates ? `See your mixtape, and ${texts.edition.updates} ${texts.edition.updates === 1 ? "update" : "updates"} from the original →` : "See your mixtape →"}</a>
              </p>
            )}
          </section>
        </article>
      </div>
    </>
  );
}

/**
 * Studio: free talk, outside the course. Play with your voice, watch your pitch live, record whatever
 * you like; takes land in Recordings and count toward nothing.
 */
function StudioDoc({ band, onRecording, onTake }: { band: [number, number] | null; onRecording: (on: boolean) => void; onTake: (t: Take) => void }) {
  const [studio, setStudio] = useState<string | null>(null);
  const [freeTake, setFreeTake] = useState<Take | null>(null);
  useEffect(() => { void api.studioSession().then((s) => setStudio(s.id), () => {}); }, []);
  return (
    <>
      <div className="ve-page">
        <article className="ve-col">
          <header className="ve-head"><h1>Studio</h1><p className="ve-subtitle">Free talk. No script, nothing to finish.</p></header>
          <div className="ve-studio-rec">
            <Dock key="free" meta={studio ? { session_id: studio, ...FREE } : null} band={band} allowRetake liveButton foldChart
              onSaved={(t) => { onTake(t); setFreeTake(t); }} onRecording={onRecording} idleHint={FREE_HINT} />
          </div>
          <p className="ci-lede-plain">Talk, hum, sing, try things. Record a take to play back, or press the wave to just watch your pitch. Nothing here counts toward the course; takes are kept in <a href="#/history">Recordings</a>.</p>
          {freeTake && <section className="ve-free" aria-label="Your take"><h2>Your take</h2><FreeResult take={freeTake} band={band} /></section>}
        </article>
      </div>
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
  const chapter = nextChapter(texts, practised);
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
      {/* No range is chosen yet, so the take isn't judged against one. */}
      <FreeResult take={take} band={saved ? range : null} onMeasured={(m) => void measured(m)} />
      {range && (saved ? (
        <div className="ve-start-done">
          <p><b>You're all set.</b> Your comfortable range is {range[0]}–{range[1]} Hz for now, and this take is your Day 1. Once you find your note in the Pitch chapter, move the range up to match in Practice settings.</p>
          <div><button className="ve-start-go" onClick={() => go("/studio/start-here")}>Next: Start here</button><button className="ve-link" onClick={() => go("/deck")}>Start today's cards</button></div>
        </div>
      ) : (
        <div className="ve-start-done">
          <p>Right now you speak at about <b>{range[0]}–{range[1]} Hz</b>. Lilt can shade this behind your pitch line as your comfortable range for now. When you find your note in the Pitch chapter, you'll move it up.</p>
          <div><button className="ve-start-go" onClick={() => void save()}>Use it for now</button><span className="ve-small">You can record it again first, if you like.</span></div>
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
              <Dock key="start" meta={studio ? { session_id: studio, role: "reference", prompt_id: REF.prompt_id, prompt_text: REF.text } : null} band={saved ? range : null} allowRetake
        onSaved={(t) => { onTake(t); setTake(t); setRange(null); setSaved(false); }} onRecording={onRecording} idleHint="Press record and count from one to ten"
        />
              {!split && result}
            </li>
          </ol>
        </article>
      </div>
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
  // Record always records a text: the one in the address, or the first. (Free talk lives in Studio.)
  const [sel, setSel] = useState(() => (itemId ? Math.max(0, level.items.findIndex((i) => i.id === itemId)) : 0));
  // After a remix, the texts that changed (or arrived) glow for a moment.
  const seen = useRef(new Map(level.items.map((it) => [it.id, `${it.text}|${it.hint}`])));
  const [remixed, setRemixed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const prev = seen.current;
    seen.current = new Map(level.items.map((it) => [it.id, `${it.text}|${it.hint}`]));
    const changed = level.items.filter((it) => prev.get(it.id) !== `${it.text}|${it.hint}`).map((it) => it.id);
    if (!changed.length) return;
    setRemixed(new Set(changed));
    const t = window.setTimeout(() => setRemixed(new Set()), 2600);
    return () => window.clearTimeout(t);
  }, [level]);
  const [takes, setTakes] = useState<Take[]>([]);
  // Every earlier take of the selected text (oldest first), and which one plays as A beside your latest.
  const [earlier, setEarlier] = useState<Take[]>([]);
  const [aPick, setAPick] = useState<APick>("last");
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
  const promptId = item ? textId(COURSE, level.id, item.id) : FREE.prompt_id;
  const isPrompt = level.kind === "prompt";
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    void api.studioSession().then((s) => { setSessionId(s.id); void api.session(s.id).then((d) => setTakes(d.takes.filter((x) => x.role === "free"))); });
  }, []);
  useEffect(() => {
    // Never show a take of another text as "before" while this one's history loads.
    setEarlier([]);
    setAPick("last");
    let live = true;
    void api.history({ prompt_id: promptId, days: 3650 }).then((h) => {
      if (live) setEarlier(h.takes.filter((t) => t.prompt_id === promptId));
    }, () => undefined);
    return () => { live = false; };
  }, [promptId]);
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
  // What can play as A: every take of this text but the latest, oldest first.
  const choices = useMemo(() => {
    const seen = new Map([...earlier, ...forText].map((t) => [t.id, t]));
    return [...seen.values()].filter((t) => t.id !== latest?.id && t.status !== "recording").sort((a, b) => a.created_utc.localeCompare(b.created_utc));
  }, [earlier, forText, latest?.id]);
  const before = aPick === "first" ? choices[0] ?? null : aPick === "last" ? choices.at(-1) ?? null : choices.find((t) => t.id === aPick) ?? choices.at(-1) ?? null;
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
  // The recorder sits under the text it records.
  const recorder = (
    <Dock key={promptId} meta={sessionId ? { session_id: sessionId, ...FREE, ...(item && { prompt_id: promptId, prompt_text: item.text }) } : null}
            band={band} allowRetake retake={!!(latest || earlier.length)} brightness={level.id === "resonance" && !!item} onSaved={(t) => void onSaved(t)} onRecording={(on) => { setRec(on); onRecording(on); }} result={split ? freeView : null}
            idleHint={item ? "Press record and read the highlighted text" : FREE_HINT}>
            <button className="ve-icon" onClick={() => choose(sel + 1)} disabled={recording || sel >= n - 1} aria-label={item ? "Next text" : "Start with text 1"} title={`${item ? "Next text" : "Start with text 1"} (↓)`}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </Dock>
  );
  return (
    <>
      <div className="ve-page">
        <article className="ve-col">
          <header className="ve-head ve-head-remix">
            <h1>{level.title}</h1>
            <p className="ve-subtitle">{level.subtitle}</p>
            <p className="ve-meta">{n} texts, about {Math.max(2, n)} minutes, chapter {level.level} of {texts.levels.length}</p>
            <div className="ve-head-actions">
              <button className="ve-remix-btn" disabled={recording} title={recording ? "Stop recording first" : undefined} onClick={() => openRemix({ course: COURSE, chapter: level.id, title: level.title, starter: level.title === "New chapter" ? "What should this chapter be about? Say who it's for and what you'd like to practise." : undefined })}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.6 4h10.8a.8.8 0 01.8.8v6.4a.8.8 0 01-.8.8H2.6a.8.8 0 01-.8-.8V4.8a.8.8 0 01.8-.8zM4.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M9.4 7.6a1.1 1.1 0 102.2 0 1.1 1.1 0 10-2.2 0M6.6 7.6h2.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Remix
              </button>
            </div>
            {complete && (
              <div className={`ve-award${fresh ? " fresh" : ""}`} role={fresh ? "status" : undefined}>
                <Medal className="ve-award-medal" />
                <div><b>Chapter complete</b><span>You've practised all {n} texts in {level.title}. Come back to any of them whenever you like.</span></div>
              </div>
            )}
          </header>
          <ChapterIntro key={level.id} level={level} started={level.items.some((it) => practised.has(textId(COURSE, level.id, it.id)))} />
          {freeView && !split && <section className="ve-free" aria-label="Your free take"><h2>Your take</h2>{freeView}</section>}
          <ol className="ve-items" id={`texts-${level.id}`}>
            {level.items.map((it, i) => {
              const on = i === sel;
              return (
                <li key={it.id} ref={(el) => { itemRefs.current[i] = el; }} className={`ve-item${on ? " on" : ""}${level.kind === "passage" ? " passage" : ""}${remixed.has(it.id) ? " fresh" : ""}`}
                  onClick={() => { if (!on) choose(i); }}>
                  <span className="ve-mk num" aria-hidden="true">{i + 1}.</span>
                  {it.id === level.check_in && <span className="ve-checkin" title="Record this one each time you visit, so you can hear and see your change">Check-in · record it each visit</span>}
                  {/* A long passage gets its title and reading time, so the shelf is easy to browse. */}
                  {isLong(it.text) && <p className="ve-ptitle">{passageTitle(it.id)}<span>{readingTime(it.text)}</span></p>}
                  {on && !isPrompt
                    ? <ReadAlong text={it.text} levelId={level.id} hint={it.hint} kind={level.kind} stream={mic.stream} active={recording}
                        onStarts={(s) => { starts.current = s; }} alignment={latest?.read_along?.starts ?? null} pitch={latestPitch} />
                    : <p className="readtext ve-read" aria-label={on ? it.text : undefined}>{it.text}</p>}
                  <p className="ve-hint">{it.hint}</p>
                  {on && it.example && <div className="ve-example"><AudioPlayer src={`/texts/${it.example}`} label="Hear an example" compact /></div>}
                  {!on && <button className="ve-pick sr-only" onClick={() => choose(i)}>Practise {it.text.slice(0, 40)}</button>}
                  {on && recorder}
                  {on && !isPrompt && <ReadNotes text={it.text} levelId={level.id} hint={it.hint} withHint={false} />}
                  {on && latest && <ChapterTake take={latest} before={before} choices={choices} pick={aPick} onPick={setAPick} promptId={promptId} band={band} card={{ kind: "text", text_kind: level.kind, front: it.text }} onUseRange={useRange} onUpdate={(t) => setTakes((xs) => xs.map((x) => (x.id === t.id ? t : x)))} />}
                </li>
              );
            })}
          </ol>
          <p className="ve-end">{texts.note}</p>
        </article>
      </div>
      <Toast text={toast} />
    </>
  );
}

const Star = ({ on }: { on: boolean }) => <svg viewBox="0 0 16 16" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" /></svg>;

/** Which earlier take plays as A: the one just before (the default), your first, or one you picked. */
type APick = "last" | "first" | string;
const takeDate = (t: Take) => new Date(t.created_utc).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function ChapterTake({ take, before, choices, pick, onPick, promptId, band, card, onUseRange, onUpdate }: {
  take: Take; before: Take | null; choices: Take[]; pick: APick; onPick: (p: APick) => void; promptId: string;
  band: [number, number] | null; card: CardKind; onUseRange: (t: Take) => void; onUpdate: (t: Take) => void;
}) {
  useTakeStatus(take, onUpdate);
  const ready = take.status === "review_ready";
  return (
    <section className="ve-take" aria-label="Your take" onClick={(e) => e.stopPropagation()}>
      <div className="ve-take-head"><b>Your take</b><StatusBadge status={take.status} /><TakeFlags take={take} /></div>
      <TakeInsight take={take} band={band} card={card} />
      {before && (
        <div className="ve-ab-pick" role="group" aria-label="Play as A">
          <span>Compare with</span>
          <button aria-pressed={pick === "last"} onClick={() => onPick("last")}>Last time</button>
          {choices.length > 1 && <button aria-pressed={pick === "first"} onClick={() => onPick("first")}>First take</button>}
          {choices.length > 2 && (
            <select aria-label="Another take" value={pick === "last" || pick === "first" ? "" : pick} onChange={(e) => onPick(e.target.value || "last")}>
              <option value="">Another day…</option>
              {[...choices].reverse().map((t) => <option key={t.id} value={t.id}>{takeDate(t)}, {new Date(t.created_utc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}
            </select>
          )}
          <a className="ve-ab-all" href={`#/history?text=${encodeURIComponent(promptId)}`}>All {choices.length + 1} takes</a>
        </div>
      )}
      <div className={before ? "ab" : ""}>
        {before && <AudioPlayer key={before.id} src={before.audio_url} tag="A" label={`${before.id === choices[0]?.id && choices.length > 1 ? "first take" : before.id === choices.at(-1)?.id ? "last time" : "then"} · ${takeDate(before)}`} knownDuration={before.analysis_summary?.duration_s} pitchTakeId={before.id} band={band} compact />}
        <AudioPlayer key={`${take.id}-${ready}`} src={take.audio_url} tag={before ? "B" : undefined} label="this take" knownDuration={take.analysis_summary?.duration_s} pitchTakeId={ready ? take.id : undefined} band={band} compact={!!before} />
      </div>
      {!ready && take.status === "analysis_pending" && <p className="ve-small">Measuring your pitch line…</p>}
      {before && <p className="ve-small">Listen to both. Which feels more like you? Your ear decides.</p>}
      <ResonanceNote take={take} />
      <div className="ve-take-actions">
        <button className="ve-ghost" onClick={() => void api.patchTake(take.id, { favourite: !take.favourite }).then(onUpdate)} aria-pressed={take.favourite}><Star on={take.favourite} />{take.favourite ? "Favourite" : "I like this one"}</button>
        {ready && <button className="ve-ghost" onClick={() => onUseRange(take)}>Use this take's range as my comfortable range</button>}
        {before && <button className="ve-ghost" onClick={() => go(`/compare?a=${before.id}&b=${take.id}`)}>Detailed comparison</button>}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- today: the voice deck */

interface Result { item: DeckItem; rating: Rating | "saved" | "later"; median: number | null }
/** Cards that come every day (warm-up, reference, cool-down): no "Again", and no "next in…". */
/** One label for "this hurts", before a take and after it. */
const HURT = "It hurts or feels strained";
const everyDay = (it?: DeckItem) => !!it && (it.kind === "warmup" || it.kind === "daily" || it.kind === "cooldown");
/** After rating an eyes-off take, "reveal" shows its pitch before moving on (q: the queue to go on with). */
type Phase = { k: "say"; retryOf: string | null } | { k: "rate"; take: Take } | { k: "reveal"; take: Take; q: DeckItem[] } | { k: "end" } | { k: "hurt" };
const KIND_TAG: Partial<Record<DeckItem["kind"], string>> = { new: "New card", again: "Again", warmup: "Warm-up", cooldown: "Cool-down", before_after: "Before and after" };

/** How the before-and-after is answered: 1 to 5, the learner's own view. */
const BEFORE_AFTER_QS = [
  { id: "satisfied", q: "How happy are you with how it sounds?", lo: "Not yet", hi: "Very" },
  { id: "like_me", q: "Does it sound like you?", lo: "Not really", hi: "Completely" },
  { id: "ease", q: "How easy did it feel?", lo: "Hard work", hi: "Easy" },
];

/** A "before" text again, weeks later: your take now beside your very first one, and three questions. */
function BeforeAfter({ take, item, onDone, onAgain, onHurt }: { take: Take; item: DeckItem; onDone: () => void; onAgain: () => void; onHurt: () => void }) {
  const [first, setFirst] = useState<Take | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void api.history({ prompt_id: item.card.prompt_id, days: 3650 }).then(
      (h) => setFirst([...h.takes].filter((t) => t.id !== take.id).sort((a, b) => a.created_utc.localeCompare(b.created_utc))[0] ?? null),
      () => setFirst(null));
  }, [item.card.prompt_id, take.id]);
  const save = async () => {
    setBusy(true);
    try { await api.patchTake(take.id, { self_report: answers }); onDone(); } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const when = first && new Date(first.created_utc).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  return (
    <div className="prc ve-result ve-ba" onClick={(e) => e.stopPropagation()}>
      <p className="ve-ba-l">Now</p>
      <ListenBack src={take.audio_url} />
      {first && <><p className="ve-ba-l">Your first take, {when}</p><ListenBack src={first.audio_url} /></>}
      {first === null && <p className="ve-small">Your first take of this text isn't here any more, so there's nothing to play beside it.</p>}
      {BEFORE_AFTER_QS.map((x) => (
        <div className="ve-ba-q" key={x.id} role="group" aria-labelledby={`ba-${x.id}`}>
          <p className="ve-q" id={`ba-${x.id}`}>{x.q}</p>
          <div className="ve-ba-scale">
            <small>{x.lo}</small>
            {["1", "2", "3", "4", "5"].map((n) => (
              <button key={n} aria-pressed={answers[x.id] === n} onClick={() => setAnswers((a) => ({ ...a, [x.id]: n }))}>{n}</button>
            ))}
            <small>{x.hi}</small>
          </div>
        </div>
      ))}
      <div className="ve-rate-more">
        <button className="ve-next-go" onClick={() => void save()} disabled={busy}>Save and carry on</button>
        {first && <button className="ve-ghost" onClick={() => go(`/compare?a=${first.id}&b=${take.id}`)}>Detailed comparison</button>}
        <button className="ve-pill" onClick={onAgain} disabled={busy}>Record it again</button>
        <button className="ve-pill ouch" onClick={onHurt} disabled={busy}>{HURT}</button>
      </div>
      {err && <p role="alert" className="ve-err">{err}</p>}
    </div>
  );
}

const PlayIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /><rect x="7.1" y="1.5" width="2.4" height="9" rx=".8" fill="currentColor" /></svg>;
export function ListenBack({ src }: { src: string }) {
  const play = useTakeAudio(src);
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    let live = true;
    void loadPeaks(src, 72).then((p) => { if (!live || !p) return; const max = Math.max(0.01, ...Array.from(p)); setBars(Array.from(p, (v) => 0.12 + 0.88 * (v / max))); });
    return () => { live = false; };
  }, [src]);
  const pos = play.dur > 0 && !play.ended ? play.t / play.dur : 0;
  return (
    <div className="prc-player">
      <button className="play-btn" onClick={play.toggle} aria-label={play.playing ? "Pause" : "Play your recording"}>{play.playing ? <PauseIcon /> : <PlayIcon />}</button>
      <div className="prc-wave" aria-hidden="true">
        {(bars.length ? bars : Array(72).fill(0.15)).map((h, i, arr) => <i key={i} className={i / arr.length < pos ? "on" : ""} style={{ transform: `scaleY(${h.toFixed(3)})` }} />)}
      </div>
    </div>
  );
}

function TodayDoc({ first, band, onDeck, onRecording, onTake, onUseRange }: {
  first: string | null; band: [number, number] | null; onDeck: (d: Deck) => void; onRecording: (on: boolean) => void; onTake: (t: Take) => void;
  onUseRange: (lo: number, hi: number) => void;
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
  // The first card is up straight away: Record always records a card. (Free talk lives in Studio.)
  const [chosen, setChosen] = useState(true);

  const load = () => Promise.all([api.deck(), api.deckSession()]).then(([d, s]) => {
    setDeck(d); onDeck(d); setSession(s);
    setComfort(s.comfort?.comfort ?? null);
    const left = d.items.filter((i) => !i.done_today);
    const pick = first ? left.findIndex((i) => i.card.id === first) : -1;
    setQueue(pick > 0 ? [left[pick], ...left.slice(0, pick), ...left.slice(pick + 1)] : left);
    setIdx(0); setResults([]);
    setPhase(d.paused ? { k: "hurt" } : left.length ? { k: "say", retryOf: null } : { k: "end" });
  }, (e) => setErr(e.message));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const resume = () => void api.resumePlan().then(load, (e) => setErr(e.message));

  const item = queue[idx];
  useEffect(() => { curRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [idx, phase.k]);
  // A rating, a reveal or a before-and-after appears under the card: bring its top into view.
  useEffect(() => {
    if (phase.k !== "rate" && phase.k !== "reveal") return;
    const id = window.setTimeout(() => document.querySelector(".ve-item.on .ve-result")?.scrollIntoView({ block: "start", behavior: "smooth" }), 150);
    return () => window.clearTimeout(id);
  }, [phase.k]);

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
        // Back later today, but still before the cool-down that closes the day.
        const again: DeckItem = { ...fresh, kind: "again", done_today: false, eyes_off: false };
        const cool = queue.findIndex((x, j) => j > idx && x.kind === "cooldown");
        q = cool < 0 ? [...queue, again] : [...queue.slice(0, cool), again, ...queue.slice(cool)];
        setQueue(q);
      }
      // An eyes-off take shows its pitch once you've rated it; the others move straight on.
      if (item.eyes_off) setPhase({ k: "reveal", take: phase.take, q }); else advance(q);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const advance = (q: DeckItem[]) => { if (idx + 1 < q.length) { setIdx(idx + 1); setPhase({ k: "say", retryOf: null }); } else setPhase({ k: "end" }); };
  // A before-and-after isn't rated: its answers are kept with the take.
  // "Not today" on a before-and-after: put it off a week and move on.
  const notToday = () => void api.rateCard(item.card.id, null, "later").then((res) => {
    setDeck(res.deck); onDeck(res.deck);
    setResults((x) => [...x, { item, rating: "later", median: null }]);
    advance(queue);
  }, (e) => setErr(e.message));
  const beforeAfterDone = () => {
    setResults((x) => [...x, { item, rating: "saved", median: null }]);
    void api.deck().then((d) => { setDeck(d); onDeck(d); }, () => {});
    advance(queue);
  };
  const ouchNow = () => void api.rateCard(item.card.id, null, "ouch").then((res) => { setDeck(res.deck); onDeck(res.deck); setPhase({ k: "hurt" }); }, (e) => setErr(e.message));

  // Keys 1–4 rate, like Anki.
  useEffect(() => {
    if (phase.k !== "rate" || item?.kind === "before_after") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && !(n === 1 && everyDay(item))) { e.preventDefault(); void rate(RATINGS[n - 1].r); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // The cat in the room follows along.
  useEffect(() => {
    const k = phase.k;
    setRoom({ mode: recOn ? "watch" : k === "rate" || k === "reveal" ? "awake" : k === "end" ? "happy" : "sleep",
      say: k === "hurt" ? "take a break, sip some water" : k === "end" ? "all done! drink water :3" : recOn ? "i'm listening :3" : k === "rate" ? "let's listen :3" : "zzz… press record" });
  }, [phase.k, recOn]);

  if (err && !deck) return <div className="ve-page"><article className="ve-col"><p role="alert" className="ve-err">{err}</p></article></div>;
  if (!deck || !session) return <div className="ve-page"><article className="ve-col"><p className="ve-subtitle">Getting your cards…</p></article></div>;

  const ended = phase.k === "end" || phase.k === "hurt";
  const earlier = deck.items.filter((i) => i.done_today && !results.some((r) => r.item.card.id === i.card.id));
  const total = earlier.length + results.length + (ended ? 0 : queue.length - idx);
  const doneCount = earlier.length + results.length;
  const label = (r: Result["rating"]) => (r === "saved" ? "Saved" : r === "later" ? "Another day" : RATINGS.find((x) => x.r === r)?.label ?? r);
  const setFeel = async (c: string) => { setComfort(c); try { await api.patchSession(session.id, { comfort: { comfort: c }, complete: true }); } catch (e: any) { setErr(e.message); } };
  const meta: TakeMeta | null = item && phase.k === "say" ? {
    session_id: session.id,
    role: phase.retryOf ? "retry" : item.card.kind === "reference" ? "reference" : item.card.kind === "exercise" ? "exercise" : "free",
    prompt_id: item.card.prompt_id, prompt_text: item.card.front,
    exercise_id: item.card.exercise_id, exercise_version: item.card.exercise_version, retry_of: phase.retryOf,
  } : null;
  const date = new Date(`${deck.local_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  // Listen back, the measured pitch and the rating: under the card, or in the right half when split.
  const rateView = phase.k === "reveal" ? (
    <div className="prc ve-result" onClick={(e) => e.stopPropagation()} key={`r-${phase.take.id}`}>
      <p className="ve-ba-l">Here's what the pitch did. Did it match what you heard?</p>
      <Measures key={phase.take.id} take={phase.take} band={band} card={item?.card} onUseRange={onUseRange} onMeasured={(m: Measured) => setMeasured((x) => ({ ...x, [phase.take.id]: m.median }))} />
      <div className="ve-rate-more"><button className="ve-next-go" onClick={() => advance(phase.q)}>Next card</button></div>
    </div>
  ) : phase.k === "rate" && item.kind === "before_after" ? (
    <BeforeAfter key={phase.take.id} take={phase.take} item={item} onDone={beforeAfterDone} onAgain={() => setPhase({ k: "say", retryOf: phase.take.id })} onHurt={ouchNow} />
  ) : phase.k === "rate" && (
    <div className="prc ve-result" onClick={(e) => e.stopPropagation()} key={phase.take.id}>
      <ListenBack src={phase.take.audio_url} />
      {/* Rate straight after listening; the measured details follow, folded to one line. */}
      <div className="ve-rate-box">
        <p className="ve-q" id="feel-q">How did that feel?</p>
        <div className="vc-rate ve-rate" role="group" aria-labelledby="feel-q">
          {RATINGS.map((r, i) => (everyDay(item) && r.r === "again") ? null : (
            <button key={r.r} onClick={() => void rate(r.r)} disabled={busy} aria-keyshortcuts={String(i + 1)} aria-label={everyDay(item) ? r.label : `${r.label}, next ${item.preview[r.r]}`}>
              <span className="face" aria-hidden="true">{r.face}</span>
              <span className="l">{r.label}<kbd aria-hidden="true">{i + 1}</kbd></span>
              {!everyDay(item) && <small>{item.preview[r.r] === "later today" ? "in a few min" : item.preview[r.r]}</small>}
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
            {HURT}
          </button>
        </div>
      </div>
      {item.eyes_off
        ? <p className="ve-small">An eyes-off take: rate it by what you heard. Lilt shows the pitch once you've rated it.</p>
        : <FoldedMeasures key={phase.take.id} take={phase.take} band={band} card={item.card} onUseRange={everyDay(item) ? undefined : onUseRange}
            onMeasured={(m: Measured) => setMeasured((x) => ({ ...x, [phase.take.id]: m.median }))} />}
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
            <p className="ve-meta">{phase.k === "hurt" ? "Paused" : `${doneCount} of ${total} done`}{deck.next_due && phase.k === "end" ? `, next ones come back ${friendlyDate(deck.next_due, deck.local_date)}` : ""}</p>
          </header>
          {phase.k === "hurt" ? (
            <>
              <blockquote className="ve-how warn"><b>Rest your voice</b>
                That card is paused and so is your plan. Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.</blockquote>
              <div className="ve-endbox">
                <p className="ve-small">When speaking feels easy again, pick up where you left off. The paused card comes back gently.</p>
                <div className="ve-rate-more">
                  <button className="ve-next-go" onClick={resume}>I feel fine, resume</button>
                  <button className="ve-ghost" onClick={() => go("/")}>Back to the room</button>
                </div>
              </div>
            </>
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
              <p className="ve-small">Your takes are in <a href="#/history">your recordings</a>. Anything more today is a bonus{deck.open_chapter ? <>: read the steps in <a href={`#/studio/${deck.open_chapter.id}`}>{deck.open_chapter.title}</a>, your newest chapter</> : ": try a chapter on the left"}.</p>
              <div className="ve-rate-more"><button className="ve-ghost" onClick={() => go("/")}>Back to the room</button></div>
            </div>
          ) : (
            <blockquote className="ve-how"><b>How to do it</b>
              Say each card the way its note asks, listen back, then rate how it felt. Your rating decides when a card comes back; pitch numbers never do. The chapter name above a card opens its steps.</blockquote>
          )}
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
                  <p className="ve-kind">{it.card.kind === "reference" ? deckName(it) : <a href={`#/studio/${it.card.level_id}`} onClick={(e) => e.stopPropagation()} title={`Open ${deckName(it)}: how this chapter works`}>{deckName(it)}</a>}{KIND_TAG[it.kind] && it.card.deck_title !== KIND_TAG[it.kind] && <span className="ve-tag next">{KIND_TAG[it.kind]}</span>}
                    {it.eyes_off && <span className="ve-tag">Eyes off</span>}
                    {!chosen && k === 0 && phase.k === "say" && <span className="ve-tag start">Start here</span>}</p>
                  {on && it.card.kind !== "exercise"
                    ? <ReadAlong text={it.card.front} levelId={it.card.level_id} hint={it.card.hint} kind={it.card.text_kind} stream={mic.stream} active={recOn} />
                    : <p className="readtext ve-read" aria-label={on ? it.card.front : undefined}>{it.card.front}</p>}
                  {/* The little numbers in the text point to these notes, as in the chapters. */}
                  {on && it.card.kind !== "exercise" && <ReadNotes text={it.card.front} levelId={it.card.level_id} hint={it.card.hint} withHint={false} />}
                  {it.card.hint && <p className="ve-hint">{cardHint(it.card.hint)}</p>}
                  {!on && <button className="ve-pick sr-only" onClick={() => choose(j)} disabled={phase.k !== "say" || recOn}>Practise {it.card.front.slice(0, 40)} next</button>}
                  {on && item && (
                    <Dock key={`${item.card.id}-${idx}-${phase.k === "say" ? phase.retryOf ?? "" : "rated"}`} meta={meta} band={band} allowRetake={false} quiet={phase.k !== "say"} eyesOff={!!item.eyes_off && phase.k === "say"}
                      onSaved={(t) => { onTake(t); setPhase({ k: "rate", take: t }); }} onRecording={(on) => { setRecOn(on); onRecording(on); }}
                      idleHint={phase.k === "reveal" ? "Have a look, then carry on" : phase.k === "rate" ? (item.kind === "before_after" ? "Listen to both, then answer" : "Listen back, then rate how it felt") : "Press record and say the card"}>
                      {phase.k === "say" && !recOn && item.kind === "before_after" && <button className="ve-link" onClick={notToday}>Not today</button>}
                      {phase.k === "say" && !recOn && <button className="ve-link ouch" onClick={ouchNow}>{HURT}</button>}
                    </Dock>
                  )}
                  {on && rateView}
                </li>
              );
            })}
          </ol>
          {err && <p role="alert" className="ve-err">{err}</p>}
        </article>
      </div>
    </>
  );
}
