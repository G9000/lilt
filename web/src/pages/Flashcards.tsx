import "../styles/deck.css";
import "../styles/flashcards.css";
import { animate, AnimatePresence, motion, type PanInfo, useIsPresent, useMotionValue, useTransform } from "motion/react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { Markdown } from "../components/Markdown";
import { useMic } from "../components/Recording";
import { isLong } from "../chapters";
import { DEFAULT_COURSE, textId } from "../courses";
import { chapterCards, EMPTY, Flashcard, loadRuns, pile, progress, Run, saveRun, swipe } from "../flashcards";
import { levelMeter, RecState, TakeRecorder } from "../recorder";
import { ChapterVideo, ListenBack } from "./Voice";

/**
 * Flashcards: a chapter dealt out as cards, one at a time. Swipe right when you've got it, left to
 * see it again later in this run. A text to say won't swipe until you've recorded it. Apart from
 * Today: nothing here is rated or scheduled, and where you are is kept in this browser.
 */

const HEART = "M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 018 4.7a2.8 2.8 0 015.5 1.6C13.5 10.2 8 13.5 8 13.5z";
const HURT = "It hurts or feels strained";

export function FlashcardsPage({ chapter }: { chapter?: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void api.texts().then(setTexts, (e: any) => setErr(`Lilt couldn't load the chapters: ${e.message}. Is the Lilt server running?`));
  }, []);
  // The chapter in the address, else the one you were last on, else the first.
  const level = texts ? texts.levels.find((l) => l.id === (chapter ?? loadRuns().last)) ?? texts.levels[0] : null;
  const [recording, setRecording] = useState(false);
  if (err) return <div className="fc"><p role="alert" className="fc-err">{err}</p></div>;
  if (!texts || !level) return <div className="fc"><p className="fc-quiet">Dealing the cards…</p></div>;
  return (
    <div className="fc">
      <nav className="fc-chips" aria-label="Chapters">
        {texts.levels.map((l) => (
          <button key={l.id} aria-current={l.id === level.id ? "page" : undefined} disabled={recording}
            onClick={() => go(`/flashcards/${l.id}`)}>{l.title}</button>
        ))}
      </nav>
      <ChapterDeck key={level.id} level={level} next={texts.levels[texts.levels.indexOf(level) + 1] ?? null} onRecording={setRecording} />
    </div>
  );
}

function ChapterDeck({ level, next, onRecording }: { level: TextLevel; next: TextLevel | null; onRecording: (on: boolean) => void }) {
  const cards = useMemo(() => chapterCards(level), [level]);
  const [run, setRun] = useState<Run>(() => loadRuns().runs[level.id] ?? EMPTY);
  // Takes recorded on this visit, by card: a text's card swipes only once it has one.
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [recording, setRecording] = useState(false);
  const [undo, setUndo] = useState<{ run: Run; label: string } | null>(null);
  const [hurt, setHurt] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => { saveRun(level.id, run); }, [level.id, run]);
  useEffect(() => { void api.studioSession().then((s) => setSessionId(s.id), () => {}); }, []);
  useEffect(() => { onRecording(recording); }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!undo) return; const id = window.setTimeout(() => setUndo(null), 6000); return () => window.clearTimeout(id); }, [undo]);

  const left = pile(cards, run);
  const top = left[0] ?? null;
  const { got, total } = progress(cards, run);
  const locked = !!top && top.kind === "text" && !takes[top.id];
  const [nudge, setNudge] = useState(0);
  // Which way the last card went, so it flies off that way whether swiped, clicked or keyed.
  const [flung, setFlung] = useState(1);
  const move = (dir: "got" | "again") => {
    if (!top || recording) return;
    // A text not yet said shakes its head, and the reason replaces any Undo still showing.
    if (locked) { setUndo(null); setNudge((n) => n + 1); return; }
    setFlung(dir === "got" ? 1 : -1);
    setUndo({ run, label: dir === "got" ? "Got it" : "Again later" });
    setRun(swipe(cards, run, dir));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || hurt) return;
      if (e.key === "ArrowRight") { e.preventDefault(); move("got"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move("again"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (hurt) return (
    <section className="fc-end" aria-live="polite">
      <h2>Let's stop here</h2>
      <p>Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.</p>
      <div className="fc-row">
        <button className="fc-primary" onClick={() => go("/")}>Back to the room</button>
        <button className="fc-ghost" onClick={() => setHurt(false)}>I feel fine, carry on</button>
      </div>
    </section>
  );

  return (
    <>
      <header className="fc-head">
        <div>
          <h1>{level.title}</h1>
          {level.subtitle && <p>{level.subtitle}</p>}
        </div>
        <span className="fc-count" aria-label={`${got} of ${total} cards done`}>{got}<small>/{total}</small></span>
      </header>
      <div className="fc-bar" aria-hidden="true"><i style={{ width: `${total ? (got / total) * 100 : 0}%` }} /></div>

      {!top ? (
        <section className="fc-end">
          <h2>That's the chapter</h2>
          <p>Every card of {level.title} is done. Go through it again any time; your takes are in <a href="#/history">Recordings</a>.</p>
          <div className="fc-row">
            {next && <button className="fc-primary" onClick={() => go(`/flashcards/${next.id}`)}>Next: {next.title}</button>}
            <button className={next ? "fc-ghost" : "fc-primary"} onClick={() => { setUndo(null); setRun(EMPTY); }}>Go through it again</button>
          </div>
        </section>
      ) : (
        <div className="fc-table">
          <div className="fc-pile">
            <AnimatePresence initial={false} custom={flung}>
              {left.slice(0, 3).map((c, d) => d === 0
                ? <TopCard key={c.id} card={c} level={level} dir={flung} locked={locked} nudge={nudge} recording={recording} onSwipe={move}>
                    <CardFace card={c} level={level} top take={takes[c.id] ?? null} sessionId={sessionId}
                      onRecording={setRecording} onSaved={(t) => setTakes((x) => ({ ...x, [c.id]: t }))} onHurt={() => setHurt(true)} />
                  </TopCard>
                : <motion.article key={c.id} className="fc-card under" aria-hidden="true"
                    initial={false} animate={{ y: d * 10, scale: 1 - d * 0.04, rotate: d % 2 ? -1.6 : 1.4 }} exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }} style={{ zIndex: 5 - d }}>
                    <CardFace card={c} level={level} top={false} take={null} sessionId={null} onRecording={() => {}} onSaved={() => {}} onHurt={() => {}} />
                  </motion.article>)}
            </AnimatePresence>
          </div>
          <div className="fc-controls">
            <button className="fc-swipe again" onClick={() => move("again")} disabled={recording} aria-disabled={locked} aria-keyshortcuts="ArrowLeft">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 105-5H5M7 1L5 3l2 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Again later<kbd aria-hidden="true">←</kbd>
            </button>
            <button className="fc-swipe got" onClick={() => move("got")} disabled={recording} aria-disabled={locked} aria-keyshortcuts="ArrowRight">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Got it<kbd aria-hidden="true">→</kbd>
            </button>
          </div>
          <p className="fc-quiet fc-tip" aria-live="polite" style={{ visibility: undo ? "hidden" : undefined }}>
            {locked ? "Say it first: record a take, then swipe." : "Swipe right when you've got it, left to see it again."}
          </p>
        </div>
      )}
      {undo && (
        <div className="fc-undo" role="status">
          {undo.label}
          <button onClick={() => { setRun(undo.run); setUndo(null); }}>Undo</button>
        </div>
      )}
    </>
  );
}

const FLY = { away: (d: number) => ({ x: d * 560, rotate: d * 14, opacity: 0, transition: { duration: 0.28, ease: [0.3, 0.6, 0.4, 1] as const } }) };

/** The card on top: it follows your finger, tilts, and flies off past a threshold (unless it's locked). */
function TopCard({ card, level, dir, locked, nudge, recording, onSwipe, children }: {
  card: Flashcard; level: TextLevel; dir: number; locked: boolean; nudge: number; recording: boolean;
  onSwipe: (dir: "got" | "again") => void; children: ReactNode;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-12, 0, 12]);
  const gotO = useTransform(x, [20, 110], [0, 1]);
  const againO = useTransform(x, [-110, -20], [1, 0]);
  // On its way out it's no longer the card on top: no clicks, and the next one takes over.
  const present = useIsPresent();
  // A locked card shakes its head when you try.
  useEffect(() => {
    if (!nudge || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    void animate(x, [0, -14, 12, -8, 5, 0], { duration: 0.45 });
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > 110, fast = Math.abs(info.velocity.x) > 500;
    // Past the line it goes (the exit carries it off from where you let go); short of it, it springs back.
    if (far || fast) onSwipe((Math.sign(info.offset.x || info.velocity.x) || 1) > 0 ? "got" : "again");
    if (locked || !(far || fast)) void animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
  };
  const title = card.kind === "text" ? card.item.text : card.kind === "step" ? card.label : card.kind === "video" ? card.video.title : level.title;
  return (
    <motion.article className={`fc-card${present ? " top" : " leaving"}${locked ? " locked" : ""}`} style={{ x, rotate, zIndex: 6 }}
      aria-label={`Card: ${title}`} aria-hidden={!present} {...({ inert: present ? undefined : "" } as object)}
      custom={dir} variants={FLY} initial={{ y: 10, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit="away"
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag={recording ? false : "x"} dragMomentum={false} dragElastic={locked ? 0.12 : 0.9} onDragEnd={onDragEnd}>
      <motion.span className="fc-stamp got" style={{ opacity: gotO }} aria-hidden="true">Got it</motion.span>
      <motion.span className="fc-stamp again" style={{ opacity: againO }} aria-hidden="true">Again</motion.span>
      {children}
    </motion.article>
  );
}

function CardFace({ card, level, top, take, sessionId, onRecording, onSaved, onHurt }: {
  card: Flashcard; level: TextLevel; top: boolean; take: Take | null; sessionId: string | null;
  onRecording: (on: boolean) => void; onSaved: (t: Take) => void; onHurt: () => void;
}) {
  const full = `#/studio/${level.id}${card.kind === "text" ? `/${card.item.id}` : ""}`;
  const kicker = card.kind === "lede" ? "About this chapter"
    : card.kind === "step" ? (card.care ? "Voice care" : `Step ${card.n} of ${card.of}`)
    : card.kind === "video" ? "Watch" : take ? "Listen back" : "Say it";
  return (
    <div className={`fc-face ${card.kind}${card.kind === "step" && card.care ? " care" : ""}`}>
      <p className="fc-kicker">
        {card.kind === "step" && card.care && <svg viewBox="0 0 16 16" aria-hidden="true"><path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>}
        {kicker}
      </p>
      <div className="fc-content">
        {card.kind === "lede" && <Markdown src={card.markdown} className="fc-md lede" headingOffset={2} />}
        {card.kind === "step" && <><h2>{card.label}</h2><Markdown src={card.body} className="fc-md" headingOffset={2} /></>}
        {card.kind === "video" && (top ? <ChapterVideo video={card.video} /> : <h2>{card.video.title}</h2>)}
        {card.kind === "text" && <>
          <p className={`fc-say${isLong(card.item.text) ? " long" : ""}`}>{card.item.text}</p>
          {card.item.hint && <p className="fc-hint">{card.item.hint}</p>}
          {top && <CardRecorder key={card.id} level={level} card={card} take={take} sessionId={sessionId} onRecording={onRecording} onSaved={onSaved} />}
        </>}
      </div>
      {top && (
        <footer className="fc-foot">
          <a href={full}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h4a2 2 0 012 2v8a1.5 1.5 0 00-1.5-1.5H2zM14 3.5h-4a2 2 0 00-2 2v8a1.5 1.5 0 011.5-1.5H14z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            Open the full chapter
          </a>
          {card.kind === "text" && <button className="fc-hurt" onClick={onHurt}>{HURT}</button>}
        </footer>
      )}
    </div>
  );
}

/** Record a text on its card: Record, Stop, then the take to listen back to (and Record again). */
function CardRecorder({ level, card, take, sessionId, onRecording, onSaved }: {
  level: TextLevel; card: Extract<Flashcard, { kind: "text" }>; take: Take | null; sessionId: string | null;
  onRecording: (on: boolean) => void; onSaved: (t: Take) => void;
}) {
  const mic = useMic();
  const [state, setState] = useState<RecState>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level01, setLevel] = useState(0);
  const rec = useRef<TakeRecorder | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (rec.current?.state === "recording") void rec.current.stop().catch(() => {});
      onRecording(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const recording = state === "recording";
  useEffect(() => { onRecording(recording); }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!recording || !mic.stream) return;
    const id = window.setInterval(() => {
      const s = (performance.now() - (rec.current?.startedAt ?? 0)) / 1000;
      setElapsed(s);
      if (s > 120) void stop();
    }, 200);
    const off = levelMeter(mic.stream, (rms) => setLevel(Math.min(1, Math.sqrt(rms) * 2.4)));
    return () => { window.clearInterval(id); off(); setLevel(0); };
  }, [recording, mic.stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    if (!sessionId || recording || state === "saving") return;
    try {
      setErr(null);
      const stream = mic.stream ?? (await mic.request());
      if (!stream || !mounted.current) return;
      const r = new TakeRecorder(stream, (x) => { if (mounted.current) { setState(x.state); if (x.error) setErr(x.error); } });
      rec.current = r;
      setElapsed(0);
      await r.start({ session_id: sessionId, role: "free", prompt_id: textId(DEFAULT_COURSE, level.id, card.item.id), prompt_text: card.item.text });
    } catch (e: any) { setState("idle"); setErr(e.message); }
  };
  const stop = async () => {
    try { const t = await rec.current!.stop(); if (mounted.current) onSaved(t); } catch (e: any) { setErr(e.message); }
  };
  // Space records and stops, as in Practice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || e.repeat || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName)) return;
      e.preventDefault();
      void (recording ? stop() : start());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const clock = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
  return (
    <div className="fc-rec">
      {take && !recording && state !== "saving" && <div className="prc fc-listen"><ListenBack src={take.audio_url} /></div>}
      <div className="fc-rec-row">
        <button className={`fc-recbtn${recording ? " on" : ""}`} onClick={() => void (recording ? stop() : start())} disabled={!sessionId || state === "saving"}
          aria-label={recording ? "Stop recording" : take ? "Record it again" : "Start recording"}>
          <i aria-hidden="true" />
          {recording ? <>Stop<span className="fc-clock">{clock}</span></> : state === "saving" ? "Saving…" : take ? "Record again" : "Record"}
          {!recording && state !== "saving" && <kbd aria-hidden="true">Space</kbd>}
        </button>
        {recording && <span className="fc-level" aria-hidden="true">{[0.2, 0.45, 0.7, 0.95, 0.7, 0.45, 0.2].map((w, i) => <i key={i} style={{ transform: `scaleY(${(0.15 + level01 * w * 1.1).toFixed(3)})` }} />)}</span>}
      </div>
      {(mic.error || err) && <p className="fc-err" role="alert">{mic.error ?? err}</p>}
    </div>
  );
}
