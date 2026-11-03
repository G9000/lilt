import "../styles/deck.css";
import "../styles/voice.css";
import "../styles/editor.css";
import "../styles/flashcards.css";
import { animate, AnimatePresence, motion, type PanInfo, useIsPresent, useMotionValue, useTransform } from "motion/react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { Markdown } from "../components/Markdown";
import { byPart, chapterSteps, isCare, isLong } from "../chapters";
import { DEFAULT_COURSE, textId } from "../courses";
import { chapterCards, EMPTY, Flashcard, loadRuns, pile, progress, Run, saveRun, swipe } from "../flashcards";
import { PICTURES } from "../desk/pictures";
import { currentLight } from "../room/scene";
import { ChapterVideo, Dock, FoldedMeasures, ListenBack } from "./Voice";

/**
 * Flashcards: a chapter dealt out as the room's cards, one at a time, full screen. Swipe right when
 * you've got it, left to see it again later in this run. A text's card won't swipe until you've
 * recorded it with the recorder docked below (Practice's, with the live pitch line); its tips and
 * your take sit on the card. Apart from Today: nothing is rated or scheduled, and where you are is
 * kept in this browser.
 */

const HEART = "M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 018 4.7a2.8 2.8 0 015.5 1.6C13.5 10.2 8 13.5 8 13.5z";
const HURT = "It hurts or feels strained";
/** The room card's outline: a strip for the picture, then the body with a tab rising on the right. */
const SHAPE = "M0 18 Q0 0 18 0 L160 0 Q172 0 181 8 L197 23 Q205 30 217 30 L282 30 Q300 30 300 48 L300 146 L0 146 Z";
type Pic = (typeof PICTURES)[number];

export function FlashcardsPage({ chapter }: { chapter?: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void api.texts().then(setTexts, (e: any) => setErr(`Lilt couldn't load the chapters: ${e.message}. Is the Lilt server running?`));
    void api.profile().then((p) => setBand(p.comfort_range_hz ?? null), () => {});
  }, []);
  // The chapter in the address, else the one you were last on, else the first.
  const level = texts ? texts.levels.find((l) => l.id === (chapter ?? loadRuns().last)) ?? texts.levels[0] : null;
  return (
    <div className="fc">
      {err ? <p role="alert" className="fc-err fc-msg">{err}</p>
        : !texts || !level ? <p className="fc-quiet fc-msg">Dealing the cards…</p>
        : <ChapterDeck key={level.id} texts={texts} level={level} band={band} />}
    </div>
  );
}

function ChapterDeck({ texts, level, band }: { texts: Texts; level: TextLevel; band: [number, number] | null }) {
  const cards = useMemo(() => chapterCards(level), [level]);
  const tips = useMemo(() => chapterSteps(level.basis)?.tips ?? [], [level]);
  const next = texts.levels[texts.levels.indexOf(level) + 1] ?? null;
  const [run, setRun] = useState<Run>(() => loadRuns().runs[level.id] ?? EMPTY);
  // Takes recorded on this visit, by card: a text's card swipes only once it has one.
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [recording, setRecording] = useState(false);
  const [undo, setUndo] = useState<{ run: Run; label: string } | null>(null);
  const [hurt, setHurt] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => { saveRun(level.id, run); }, [level.id, run]);
  useEffect(() => { void api.studioSession().then((s) => setSessionId(s.id), () => {}); }, []);
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
      if (e.key === "Escape" && !recording) go("/desk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const pic = (c: Flashcard) => PICTURES[(texts.levels.indexOf(level) * 3 + cards.indexOf(c)) % PICTURES.length];
  const full = `#/studio/${level.id}${top?.kind === "text" ? `/${top.item.id}` : ""}`;

  return (
    <>
      <header className="fc-top">
        <button className="fc-close" onClick={() => go("/desk")} aria-label="Close Flashcards" title="Close (Esc)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <ChapterMenu texts={texts} level={level} locked={recording} />
        <div className="fc-progress" aria-label={`${got} of ${total} cards done`}>
          <span className="fc-segs" aria-hidden="true">{cards.map((c) => <i key={c.id} className={run.got.includes(c.id) ? "on" : c.id === top?.id ? "now" : undefined} />)}</span>
          <span className="fc-count"><b>{got}</b> of {total}</span>
        </div>
        <a className="fc-full" href={full}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h4a2 2 0 012 2v8a1.5 1.5 0 00-1.5-1.5H2zM14 3.5h-4a2 2 0 00-2 2v8a1.5 1.5 0 011.5-1.5H14z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          <span>Full chapter</span>
        </a>
      </header>

      <main className="fc-stage">
        {hurt ? (
          <EndCard pic={PICTURES[3]} chip="Resting" title="Let's stop here"
            body="Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.">
            <button className="fc-primary" onClick={() => go("/")}>Back to the room</button>
            <button className="fc-ghost" onClick={() => setHurt(false)}>I feel fine, carry on</button>
          </EndCard>
        ) : !top ? (
          <EndCard pic={PICTURES[5]} chip="Chapter done" title={`That's ${level.title}`}
            body={<>Every card is done. Your takes are in <a href="#/history">Recordings</a>; go through it again any time.</>}>
            {next && <button className="fc-primary" onClick={() => go(`/flashcards/${next.id}`)}>Next: {next.title}</button>}
            <button className={next ? "fc-ghost" : "fc-primary"} onClick={() => { setUndo(null); setRun(EMPTY); }}>Go through it again</button>
          </EndCard>
        ) : (
          <div className="fc-table">
            <SideButton dir="again" locked={locked} disabled={recording} onClick={() => move("again")} />
            <div className="fc-pile">
              <AnimatePresence initial={false} custom={flung}>
                {left.slice(0, 3).map((c, d) => d === 0
                  ? <TopCard key={c.id} dir={flung} locked={locked} nudge={nudge} recording={recording} onSwipe={move} label={cardTitle(c, level)}>
                      <CardFace card={c} level={level} pic={pic(c)} tips={tips} take={takes[c.id] ?? null} band={band} onHurt={() => setHurt(true)} />
                    </TopCard>
                  : <motion.article key={c.id} className="fc-card under" aria-hidden="true"
                      initial={false} animate={{ y: -d * 16, scale: 1 - d * 0.05, rotate: d % 2 ? -1.2 : 1 }} exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }} style={{ zIndex: 5 - d }}>
                      <CardArt pic={pic(c)} chip={kicker(c, false)} />
                    </motion.article>)}
              </AnimatePresence>
            </div>
            <SideButton dir="got" locked={locked} disabled={recording} onClick={() => move("got")} />
          </div>
        )}
        {undo && (
          <div className="fc-undo" role="status">
            {undo.label}
            <button onClick={() => { setRun(undo.run); setUndo(null); }}>Undo</button>
          </div>
        )}
      </main>

      <footer className="fc-dock">
        {!hurt && top?.kind === "text" ? (
          <div className="ve fc-ve">
            <Dock key={top.id} band={band} allowRetake retake={!!takes[top.id]}
              meta={sessionId ? { session_id: sessionId, role: "free", prompt_id: textId(DEFAULT_COURSE, level.id, top.item.id), prompt_text: top.item.text } : null}
              onSaved={(t) => setTakes((x) => ({ ...x, [top.id]: t }))} onRecording={setRecording}
              idleHint={takes[top.id] ? "Listen back on the card, then swipe" : "Press record and say the card"}>
              <span className={`fc-say-first${locked ? "" : " ok"}`} aria-live="polite">
                {locked ? "Say it to unlock the swipe" : "Swipe right when you've got it"}
              </span>
            </Dock>
          </div>
        ) : !hurt && top ? (
          <p className="fc-keys"><kbd>←</kbd> Again later <span aria-hidden="true">·</span> swipe the card or use the arrows <span aria-hidden="true">·</span> Got it <kbd>→</kbd></p>
        ) : null}
      </footer>
    </>
  );
}

/** The chapter's name as a menu: every chapter by part, with how far through each you are. */
function ChapterMenu({ texts, level, locked }: { texts: Texts; level: TextLevel; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    // Escape closes the menu, not the window.
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc, true); };
  }, [open]);
  const runs = loadRuns().runs;
  return (
    <div className={`fc-menu${open ? " open" : ""}`} ref={box}>
      <button className="fc-menu-btn" onClick={() => setOpen((o) => !o)} disabled={locked} aria-expanded={open} aria-haspopup="menu">
        <span><b>{level.title}</b>{level.subtitle && <small>{level.subtitle}</small>}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5L6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="fc-menu-list" role="menu">
          {byPart(texts.levels).map((g, i) => (
            <div key={i} className="fc-menu-part">
              {g.part && <p>{g.part}</p>}
              {g.levels.map((l) => {
                const p = progress(chapterCards(l), runs[l.id] ?? EMPTY);
                return (
                  <button key={l.id} role="menuitem" aria-current={l.id === level.id ? "true" : undefined} onClick={() => { setOpen(false); go(`/flashcards/${l.id}`); }}>
                    <span>{l.title}</span>
                    <i className={p.got === p.total ? "done" : undefined}>{p.got === p.total ? "Done" : p.got ? `${p.got}/${p.total}` : `${p.total} cards`}</i>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SideButton({ dir, locked, disabled, onClick }: { dir: "got" | "again"; locked: boolean; disabled: boolean; onClick: () => void }) {
  const got = dir === "got";
  return (
    <button className={`fc-side ${dir}`} onClick={onClick} disabled={disabled} aria-disabled={locked} aria-keyshortcuts={got ? "ArrowRight" : "ArrowLeft"}
      title={locked ? "Say it first" : got ? "Got it (→)" : "Again later (←)"}>
      <span className="fc-side-ic" aria-hidden="true">
        {got
          ? <svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : <svg viewBox="0 0 16 16"><path d="M3.2 8a4.8 4.8 0 104.8-4.8H5.4M7 1.4L5.2 3.2 7 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span className="fc-side-l">{got ? "Got it" : "Again"}</span>
    </button>
  );
}

const cardTitle = (c: Flashcard, level: TextLevel) => c.kind === "text" ? c.item.text : c.kind === "step" ? c.label : c.kind === "video" ? c.video.title : level.title;
const kicker = (c: Flashcard, said: boolean) => c.kind === "lede" ? "About this chapter"
  : c.kind === "step" ? (c.care ? "Voice care" : `Step ${c.n} of ${c.of}`)
  : c.kind === "video" ? "Watch" : said ? "Said" : "Say it";

const FLY = { away: (d: number) => ({ x: d * 620, rotate: d * 16, opacity: 0, transition: { duration: 0.3, ease: [0.3, 0.6, 0.4, 1] as const } }) };

/** The card on top: it follows your finger, tilts, and flies off past a threshold (unless it's locked). */
function TopCard({ dir, locked, nudge, recording, onSwipe, label, children }: {
  dir: number; locked: boolean; nudge: number; recording: boolean; onSwipe: (dir: "got" | "again") => void; label: string; children: ReactNode;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-12, 0, 12]);
  const gotO = useTransform(x, [24, 120], [0, 1]);
  const againO = useTransform(x, [-120, -24], [1, 0]);
  // On its way out it's no longer the card on top: no clicks, and the next one takes over.
  const present = useIsPresent();
  // A locked card shakes its head when you try.
  useEffect(() => {
    if (!nudge || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    void animate(x, [0, -16, 13, -8, 5, 0], { duration: 0.45 });
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > 120, fast = Math.abs(info.velocity.x) > 500;
    // Past the line it goes (the exit carries it off from where you let go); short of it, it springs back.
    if (far || fast) onSwipe((Math.sign(info.offset.x || info.velocity.x) || 1) > 0 ? "got" : "again");
    if (locked || !(far || fast)) void animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
  };
  return (
    <motion.article className={`fc-card${present ? " top" : " leaving"}${locked ? " locked" : ""}`} style={{ x, rotate, zIndex: 6 }}
      aria-label={`Card: ${label}`} aria-hidden={!present} {...({ inert: present ? undefined : "" } as object)}
      custom={dir} variants={FLY} initial={{ y: -18, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit="away"
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag={recording ? false : "x"} dragMomentum={false} dragElastic={locked ? 0.12 : 0.9} onDragEnd={onDragEnd}>
      <motion.span className="fc-stamp got" style={{ opacity: gotO }} aria-hidden="true">Got it</motion.span>
      <motion.span className="fc-stamp again" style={{ opacity: againO }} aria-hidden="true">Again</motion.span>
      {children}
    </motion.article>
  );
}

/** The picture strip at the top of a card, as on the room's cards, with its chip. */
function CardArt({ pic, chip, care }: { pic: Pic; chip: string; care?: boolean }) {
  return (
    <div className="fc-head">
      <div className="fc-art" style={{ backgroundImage: `url(${pic.url(currentLight())})`, ...pic.card }} />
      <svg className="fc-shape" viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true"><path d={SHAPE} /></svg>
      <span className={`fc-chip${care ? " care" : ""}`}>
        {care && <svg viewBox="0 0 16 16" aria-hidden="true"><path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>}
        {chip}
      </span>
    </div>
  );
}

function CardFace({ card, level, pic, tips, take, band, onHurt }: {
  card: Flashcard; level: TextLevel; pic: Pic; tips: { label: string; body: string }[];
  take: Take | null; band: [number, number] | null; onHurt: () => void;
}) {
  const [showTips, setShowTips] = useState(false);
  return (
    <>
      <CardArt pic={pic} chip={kicker(card, !!take)} care={card.kind === "step" && card.care} />
      <div className={`fc-body ${card.kind}`}>
        {card.kind === "lede" && <><h2 className="fc-title">{level.title}</h2><Markdown src={card.markdown} className="fc-md" headingOffset={2} /></>}
        {card.kind === "step" && <><h2 className="fc-title">{card.label}</h2><Markdown src={card.body} className="fc-md" headingOffset={2} /></>}
        {card.kind === "video" && <><h2 className="fc-title">Watch first</h2><ChapterVideo video={card.video} /></>}
        {card.kind === "text" && <>
          <p className={`fc-say${isLong(card.item.text) ? " long" : ""}`}>{card.item.text}</p>
          {card.item.hint && <p className="fc-hint">{card.item.hint}</p>}
          {take && (
            <section className="fc-take" aria-label="Your take">
              <div className="prc"><ListenBack src={take.audio_url} /></div>
              <FoldedMeasures key={take.id} take={take} band={band} />
            </section>
          )}
          {tips.length > 0 && (
            <div className="fc-tips">
              <button className="fc-tips-btn" aria-expanded={showTips} onClick={() => setShowTips((v) => !v)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.3 4.3 0 00-2.6 7.7c.5.4.8 1 .8 1.6v.4h3.6v-.4c0-.6.3-1.2.8-1.6A4.3 4.3 0 008 1.8zM6.4 13.6h3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {showTips ? "Hide tips" : `Tips for ${level.title.toLowerCase()} (${tips.length})`}
              </button>
              {showTips && (
                <ol>
                  {tips.map((t, i) => (
                    <li key={i} className={isCare(t.label) ? "care" : undefined}>
                      <b>{t.label}</b>
                      <Markdown src={t.body} className="fc-md small" headingOffset={2} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <button className="fc-hurt" onClick={onHurt}>{HURT}</button>
        </>}
      </div>
    </>
  );
}

function EndCard({ pic, chip, title, body, children }: { pic: Pic; chip: string; title: string; body: ReactNode; children: ReactNode }) {
  return (
    <motion.article className="fc-card end" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <CardArt pic={pic} chip={chip} />
      <div className="fc-body">
        <h2 className="fc-title">{title}</h2>
        <p className="fc-md">{body}</p>
        <div className="fc-row">{children}</div>
      </div>
    </motion.article>
  );
}
