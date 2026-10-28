import "../styles/deck.css";
import "../styles/voice.css";
import "../styles/editor.css";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Deck, DeckItem, Profile, Rating, Session, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { setRoom } from "../room/Room";
import { currentLight } from "../room/scene";
import { AudioPlayer, loadPeaks, useTakePitch } from "../components/AudioPlayer";
import { StatusBadge, TakeFlags, Toast, useTakeStatus, useToast } from "../components/bits";
import { Measured, TakeResult as Measures } from "../components/DeckPitch";
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

const RATINGS: { r: Rating; label: string }[] = [
  { r: "again", label: "Again" }, { r: "hard", label: "Hard" }, { r: "good", label: "Good" }, { r: "easy", label: "Easy" },
];
const deckName = (it: DeckItem) => (it.card.kind === "reference" ? "Reference" : it.card.deck_title);
const friendlyDate = (d: string, today: string) => {
  const days = Math.round((Date.parse(d) - Date.parse(today)) / 86400000);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const howTo = (basis: string) => cap(basis.replace(/^(NHS Fife( progression)?|Lilt's choice):\s*/i, ""));

export function VoicePage({ doc, levelId, itemId, first }: { doc: "today" | "chapter"; levelId?: string; itemId?: string; first?: string | null }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practised, setPractised] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    void Promise.all([api.texts(), api.deck(), api.profile(), api.history({ days: 3650 })]).then(([t, d, p, h]) => {
      setTexts(t); setDeck(d); setProfile(p);
      setPractised(new Set(h.takes.map((x) => x.prompt_id)));
    });
  }, []);
  const level = texts ? texts.levels.find((l) => l.id === levelId) ?? texts.levels[0] : null;
  const chips = useRef<HTMLElement>(null);
  useEffect(() => { chips.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" }); }, [texts, doc, level?.id]);

  return (
    <div className="ve">
      <Sidebar texts={texts} deck={deck} practised={practised} current={doc === "today" ? "today" : level?.id ?? ""} locked={recording} />
      <main className="ve-doc">
        {texts && (
          <nav className="ve-chips" aria-label="Chapters" ref={chips}>
            <button aria-current={doc === "today" ? "page" : undefined} onClick={() => go("/deck")} disabled={recording}>Today</button>
            {texts.levels.map((l) => <button key={l.id} aria-current={doc === "chapter" && l.id === level?.id ? "page" : undefined} onClick={() => go(`/studio/${l.id}`)} disabled={recording}>{l.title}</button>)}
          </nav>
        )}
        {doc === "today"
          ? <TodayDoc first={first ?? null} band={profile?.comfort_range_hz ?? null} onDeck={setDeck} onRecording={setRecording} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />
          : texts && level && profile && <ChapterDoc key={level.id} texts={texts} level={level} itemId={itemId} profile={profile} onProfile={setProfile} onRecording={setRecording}
              practised={practised} onTake={(t) => setPractised((s) => new Set([...s, t.prompt_id]))} />}
      </main>
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

function Ring({ p, n }: { p: number; n: number }) {
  const r = 6.5, c = 2 * Math.PI * r;
  if (p <= 0) return <span className="ve-num" aria-hidden="true">{n}</span>;
  if (p >= 1) return <Medal className="ve-ring done" />;
  return (
    <svg className="ve-ring" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--fill-2)" strokeWidth="2" />
      {<circle cx="8" cy="8" r={r} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 8 8)" />}
    </svg>
  );
}

function Sidebar({ texts, deck, practised, current, locked }: { texts: Texts | null; deck: Deck | null; practised: Set<string>; current: string; locked: boolean }) {
  const left = deck ? deck.items.filter((i) => !i.done_today) : [];
  const total = deck?.items.length ?? 0;
  const done = deck && !deck.paused && left.length === 0;
  return (
    <nav className="ve-side" aria-label="Chapters">
      <button className={`ve-today${current === "today" ? " on" : ""}`} onClick={() => go("/deck")} disabled={locked} aria-current={current === "today" ? "page" : undefined}>
        <span className="ve-today-h"><b>Today</b>{deck && !deck.paused && <span>{total - left.length}/{total}</span>}</span>
        <small>{!deck ? "Getting your cards…" : deck.paused ? "Resting today" : done ? "All done. Nice work." : `${left.length} card${left.length === 1 ? "" : "s"}, about ${Math.max(1, left.length)} min`}</small>
        <span className="ve-today-bar" aria-hidden="true"><i style={{ width: `${total ? ((total - left.length) / total) * 100 : 0}%` }} /></span>
      </button>
      <h6>Chapters{texts && <span>{texts.levels.filter((l) => chapterDone(l, practised)).length} of {texts.levels.length} complete</span>}</h6>
      <ul className="ve-nav">
        {texts?.levels.map((l) => {
          const n = l.items.length, d = l.items.filter((it) => practised.has(`text.${l.id}.${it.id}`)).length;
          return (
            <li key={l.id}>
              <button aria-current={current === l.id ? "page" : undefined} onClick={() => go(`/studio/${l.id}`)} disabled={locked}>
                <Ring p={d / n} n={l.level} /><span className="t">{l.title}</span><span className="c">{d}/{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="ve-side-foot">
        <a href="#/guided">Guided session with feedback</a>
        <a href="#/texts">All practice texts</a>
        <a href="#/">Back to the room</a>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- the dock */

interface Pt { t: number; hz: number | null }
const LO = 80, HI = 400;
const fy = (hz: number, h: number) => { const pad = h * 0.1; return h - pad - (Math.log(hz / LO) / Math.log(HI / LO)) * (h - 2 * pad); };

/**
 * The room's cat asleep on its blanket, filling the right half while the recorder is idle: the whole
 * painting, anchored bottom-left and scaled to cover, with the three cat layers placed where the room
 * draws them (x 0–375, y 710–881 of 1672×941).
 */
function SleepingCat({ hint }: { hint: string }) {
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
      <p className="ve-art-copy"><b>Ready when you are</b><span>{hint}</span></p>
    </div>
  );
}

/** The recorder at the bottom: one button, the waveform with the pitch line on it, and the numbers. */
function Dock({ meta, band, allowRetake, onSaved, onRecording, children, idleHint, quiet = false }: {
  meta: TakeMeta | null; band: [number, number] | null; allowRetake: boolean; quiet?: boolean;
  onSaved: (t: Take) => void; onRecording: (on: boolean) => void; children?: ReactNode; idleHint: string;
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
  const status = recording ? "Recording" : listening ? "Live" : state === "saving" ? "Saving…" : state === "error" ? "Not saved" : state === "saved" ? "Saved" : "Ready";
  return (
    <section className={`ve-dock${recording ? " rec" : ""}${listening ? " live" : ""}${idle ? " idle" : ""}${quiet ? " quiet" : ""}`} aria-label="Recorder">
      <SleepingCat hint={idleHint} />
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
      {(err || mic.error) && <p className="ve-err" role="alert">{err ?? mic.error}</p>}
      {state === "error" && <button className="btn-secondary" onClick={() => void rec.current!.retrySave().then(onSaved, (e) => setErr(e.message))}>Retry saving</button>}
    </section>
  );
}

/* ---------------------------------------------------------------- a chapter: practice texts */

function ChapterDoc({ texts, level, itemId, profile, onProfile, onRecording, practised, onTake }: {
  texts: Texts; level: TextLevel; itemId?: string; profile: Profile; onProfile: (p: Profile) => void;
  onRecording: (on: boolean) => void; practised: Set<string>; onTake: (t: Take) => void;
}) {
  const mic = useMic();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sel, setSel] = useState(() => Math.max(0, level.items.findIndex((i) => i.id === itemId)));
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
  const item = level.items[sel];
  const promptId = `text.${level.id}.${item.id}`;
  const isPrompt = level.kind === "prompt";
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    void api.studioSession().then((s) => { setSessionId(s.id); void api.session(s.id).then((d) => setTakes(d.takes.filter((x) => x.role === "free"))); });
  }, []);
  useEffect(() => { void api.history({ prompt_id: promptId, days: 365 }).then((h) => setPrevious(h.takes.length ? h.takes[h.takes.length - 1] : null)); }, [promptId]);
  useEffect(() => { itemRefs.current[sel]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [sel]);

  const choose = (i: number) => { if (!recording) setSel(Math.max(0, Math.min(level.items.length - 1, i))); };
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
    if (starts.current && !isPrompt) saved = await api.patchTake(t.id, { read_along: { starts: starts.current, text: item.text } }).catch(() => t);
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
      <Dock key={promptId} meta={sessionId ? { session_id: sessionId, role: "free", prompt_id: promptId, prompt_text: item.text } : null}
        band={band} allowRetake onSaved={(t) => void onSaved(t)} onRecording={(on) => { setRec(on); onRecording(on); }}
        idleHint="Press record and read the highlighted text">
        <button className="ve-link" onClick={() => choose(sel + 1)} disabled={recording || sel >= n - 1}>Next text <kbd>↓</kbd></button>
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

const Tick = () => <svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
    if (phase.k !== "say" || recOn || j <= idx) return;
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
              Say each card in your practice voice, listen back, then rate how it felt. Your rating decides when a card comes back; pitch numbers never do.</blockquote>
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
              const j = idx + k, on = k === 0;
              return (
                <li key={`q-${j}-${it.card.id}`} ref={on ? curRef : undefined} className={`ve-item${on ? " on" : ""}`} onClick={() => { if (!on) choose(j); }}>
                  <span className="ve-mk num" aria-hidden="true">{doneCount + k + 1}.</span>
                  <p className="ve-kind">{deckName(it)}{(it.kind === "new" || it.kind === "again") && <span className="ve-tag next">{it.kind === "new" ? "New card" : "Again"}</span>}</p>
                  {on && it.card.kind !== "exercise"
                    ? <ReadAlong text={it.card.front} levelId={it.card.level_id} hint={it.card.hint} kind={it.card.text_kind} stream={mic.stream} active={recOn} />
                    : <p className="readtext ve-read" aria-label={on ? it.card.front : undefined}>{it.card.front}</p>}
                  {it.card.hint && <p className="ve-hint">{it.card.hint}</p>}
                  {!on && <button className="ve-pick sr-only" onClick={() => choose(j)} disabled={phase.k !== "say" || recOn}>Practise {it.card.front.slice(0, 40)} next</button>}
                  {on && phase.k === "rate" && (
                    <div className="prc ve-result" onClick={(e) => e.stopPropagation()} key={phase.take.id}>
                      <ListenBack src={phase.take.audio_url} />
                      <Measures key={phase.take.id} take={phase.take} band={band} onMeasured={(m: Measured) => setMeasured((x) => ({ ...x, [phase.take.id]: m.median }))} />
                      <div className="ve-rate-box">
                        <p className="ve-q" id="feel-q">How did that feel?</p>
                        <div className="vc-rate ve-rate" role="group" aria-labelledby="feel-q">
                          {RATINGS.map((r, i) => (
                            <button key={r.r} onClick={() => void rate(r.r)} disabled={busy} aria-keyshortcuts={String(i + 1)} aria-label={`${r.label}, next ${item.preview[r.r]}`}>
                              <span className="l">{r.label}<kbd aria-hidden="true">{i + 1}</kbd></span>
                              <small>{item.preview[r.r] === "later today" ? "in a few minutes" : item.preview[r.r]}</small>
                            </button>
                          ))}
                        </div>
                        <div className="ve-rate-more">
                          <button className="ve-link" onClick={() => setPhase({ k: "say", retryOf: phase.take.id })} disabled={busy}>Record it again</button>
                          <button className="ve-link ouch" onClick={() => void rate("ouch")} disabled={busy}>It hurt or felt strained</button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {err && <p role="alert" className="ve-err">{err}</p>}
        </article>
      </div>
      {!ended && item && (
        <Dock key={`${item.card.id}-${idx}-${phase.k === "say" ? phase.retryOf ?? "" : "rated"}`} meta={meta} band={band} allowRetake={false} quiet={phase.k === "rate"}
          onSaved={(t) => { onTake(t); setPhase({ k: "rate", take: t }); }} onRecording={(on) => { setRecOn(on); onRecording(on); }}
          idleHint="Press record and say the card">
          {phase.k === "say" && !recOn && <button className="ve-link ouch" onClick={ouchNow}>Stop, my voice hurts</button>}
        </Dock>
      )}
    </>
  );
}
