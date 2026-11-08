import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import { practice } from "../ui/practice";
import { animate, AnimatePresence, motion, type PanInfo, useIsPresent, useMotionValue, useTransform } from "motion/react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Take, TextLevel, Texts } from "../api";
import { go } from "../App";
import { Markdown } from "../components/Markdown";
import { byPart, chapterSteps, isCare, isLong } from "../chapters";
import { DEFAULT_COURSE, textId } from "../courseIds";
import { flashcardsPath, practicePath, validCourseId } from "../courseNavigation";
import { chapterCards, EMPTY, Flashcard, loadRuns, pile, progress, Run, saveRun, swipe } from "../flashcards";
import { Art, Illustration, wash } from "../components/Illustrations";
import { ChapterVideo, Dock, FoldedMeasures, ListenBack } from "./Voice";
import { OptionalCourseRecorder } from "./CourseRecording";

/**
 * Flashcards: a chapter dealt out as the room's cards, one at a time, full screen. Swipe right when
 * you've got it, left to see it again later in this run. A voice text's card won't swipe until you've
 * recorded it with the recorder docked below (Practice's, with the live pitch line); its tips and
 * your take sit on the card. Apart from Today: nothing is rated or scheduled, and where you are is
 * kept in this browser.
 */

const HEART = "M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 018 4.7a2.8 2.8 0 015.5 1.6C13.5 10.2 8 13.5 8 13.5z";
const HURT = "It hurts or feels strained";

export function FlashcardsPage({ chapter, course = DEFAULT_COURSE }: { chapter?: string; course?: string }) {
  if (!validCourseId(course)) return <div className="p-6"><p role="alert">This course address isn't valid.</p><a href="#/courses">All courses</a></div>;
  return <CourseFlashcards key={course} chapter={chapter} course={course} />;
}

function CourseFlashcards({ chapter, course }: { chapter?: string; course: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    setErr(null);
    void api.texts(course).then(t => { if (!ignore) setTexts(t); }, (e: Error) => {
      if (!ignore) setErr(`Lilt couldn't load the chapters: ${e.message}`);
    });
    if (course === DEFAULT_COURSE) void api.profile().then(p => { if (!ignore) setBand(p.comfort_range_hz ?? null); }, () => {});
    return () => { ignore = true; };
  }, [course, attempt]);
  const level = texts ? texts.levels.find(l => l.id === (chapter ?? loadRuns(course).last)) ?? (chapter ? null : texts.levels[0]) : null;
  return (
    <div className={cx("fc", practice["fc"])}>
      {err ? <div className={practice["fc-msg"]}><p role="alert">{err}</p><button className={`btn ${shared.btn} ${shared["btn-secondary"]}`} onClick={() => setAttempt(n => n + 1)}>Try again</button></div>
        : !texts ? <p role="status" className={practice["fc-msg"]}>Dealing the cards…</p>
        : !level ? <div className={practice["fc-msg"]}><p>{chapter ? "This chapter isn't in the course." : "This course has no chapters yet."}</p><a href={`#${practicePath(course)}`}>Back to the course</a></div>
        : <ChapterDeck key={`${course}:${level.id}`} course={course} texts={texts} level={level} band={band} />}
    </div>
  );
}

function ChapterDeck({ texts, level, band, course }: { texts: Texts; level: TextLevel; band: [number, number] | null; course: string }) {
  const voice = course === DEFAULT_COURSE;
  const cards = useMemo(() => chapterCards(level, course), [level, course]);
  const tips = useMemo(() => voice ? chapterSteps(level.basis)?.tips ?? [] : [], [level, voice]);
  const next = texts.levels[texts.levels.indexOf(level) + 1] ?? null;
  const [run, setRun] = useState<Run>(() => loadRuns(course).runs[level.id] ?? EMPTY);
  // Takes recorded on this visit, by card: a text's card swipes only once it has one.
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [recording, setRecording] = useState(false);
  const [undo, setUndo] = useState<{ run: Run; label: string } | null>(null);
  const [hurt, setHurt] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => { saveRun(level.id, run, course); }, [level.id, run, course]);
  useEffect(() => { if (voice) void api.studioSession().then((s) => setSessionId(s.id), () => {}); }, [voice]);
  useEffect(() => { if (!undo) return; const id = window.setTimeout(() => setUndo(null), 6000); return () => window.clearTimeout(id); }, [undo]);

  const left = pile(cards, run);
  const top = left[0] ?? null;
  const { got, total } = progress(cards, run);
  const locked = voice && !!top && top.kind === "text" && !takes[top.id];
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

  const full = `#${practicePath(course, level.id, top?.kind === "text" ? top.item.id : undefined)}`;

  return (
    <>
      <header className={cx("fc-top", practice["fc-top"])}>
        <button className={cx("fc-close", practice["fc-close"])} disabled={recording} onClick={() => go("/desk")} aria-label="Close Flashcards" title="Close (Esc)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <ChapterMenu course={course} texts={texts} level={level} locked={recording} />
        <div className={cx("fc-progress", practice["fc-progress"])} aria-label={`${got} of ${total} cards done`}>
          <span className={cx("fc-segs", practice["fc-segs"])} aria-hidden="true">{cards.map((c) => <i key={c.id} className={run.got.includes(c.id) ? "on" : c.id === top?.id ? "now" : undefined} />)}</span>
          <span className={cx("fc-count", practice["fc-count"])} title="Cards gone through this time. Your takes stay in Recordings."><b>{got}</b> of {total} this time</span>
        </div>
        <a className={cx("fc-full", practice["fc-full"])} href={full} aria-disabled={recording} onClick={event => { if (recording) event.preventDefault(); }}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3.5h4a2 2 0 012 2v8a1.5 1.5 0 00-1.5-1.5H2zM14 3.5h-4a2 2 0 00-2 2v8a1.5 1.5 0 011.5-1.5H14z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          <span>Full chapter</span>
        </a>
      </header>

      <main className={cx("fc-stage", practice["fc-stage"])}>
        {hurt ? (
          <EndCard art="tea" chip="Resting" title="Let's stop here"
            body="Sip water, breathe, talk normally. If discomfort lasts more than a couple of days, or speaking hurts, please check in with a GP or a speech and language therapist.">
            <button className={cx("fc-primary", practice["fc-primary"])} onClick={() => go("/")}>Back to the room</button>
            <button className={cx("fc-ghost", practice["fc-ghost"])} onClick={() => setHurt(false)}>I feel fine, carry on</button>
          </EndCard>
        ) : !top ? (
          <EndCard art="medal" chip="Chapter done" title={`That's ${level.title}`}
            body={voice ? <>Every card is done. Your takes are in <a href="#/history">Recordings</a>; go through it again any time.</> : "Every card is done. Go through this chapter again any time."}>
            {next && <button className={cx("fc-primary", practice["fc-primary"])} onClick={() => go(flashcardsPath(course, next.id))}>Next: {next.title}</button>}
            <button className={cx(next ? "fc-ghost" : "fc-primary", practice["fc-primary"], practice["fc-ghost"])} onClick={() => { setUndo(null); setRun(EMPTY); }}>Go through it again</button>
          </EndCard>
        ) : (
          <div className={cx("fc-table", practice["fc-table"])}>
            <SideButton dir="again" locked={locked} disabled={recording} onClick={() => move("again")} />
            <div className={cx("fc-pile", practice["fc-pile"])}>
              <AnimatePresence initial={false} custom={flung}>
                {left.slice(0, 3).map((c, d) => d === 0
                  ? <TopCard key={c.id} dir={flung} locked={locked} nudge={nudge} recording={recording} onSwipe={move} label={cardTitle(c, level)}>
                      <CardFace course={course} chapters={texts.levels.map(l => l.id)} card={c} level={level} tips={tips} take={takes[c.id] ?? null} band={band} onHurt={() => setHurt(true)} />
                    </TopCard>
                  : <motion.article key={c.id} className={cx("fc-card under", practice["fc-card"])} aria-hidden="true"
                      initial={false} animate={{ y: -d * 16, scale: 1 - d * 0.05, rotate: d % 2 ? -1.2 : 1 }} exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }} style={{ zIndex: 5 - d }}>
                    </motion.article>)}
              </AnimatePresence>
            </div>
            <SideButton dir="got" locked={locked} disabled={recording} onClick={() => move("got")} />
          </div>
        )}
      </main>

      <footer className={cx("fc-dock", practice["fc-dock"])}>
        {undo && (
          <div className={cx("fc-undo", practice["fc-undo"])} role="status">
            {undo.label}
            <button disabled={recording} onClick={() => { setRun(undo.run); setUndo(null); }}>Undo</button>
          </div>
        )}
        {voice && !hurt && top?.kind === "text" ? (
          <><div className={cx("ve fc-ve", practice["ve"], practice["fc-ve"])}>
            <Dock key={top.id} band={band} allowRetake retake={!!takes[top.id]}
              meta={sessionId ? { session_id: sessionId, role: "free", prompt_id: textId(DEFAULT_COURSE, level.id, top.item.id), prompt_text: top.item.text } : null}
              onSaved={(t) => setTakes((x) => ({ ...x, [top.id]: t }))} onRecording={setRecording}
              idleHint={takes[top.id] ? "Listen back on the card, then swipe" : "Press record and say the card"} />
            </div>
            <p className={cx(`fc-say-first${locked ? "" : " ok"}`, practice["fc-say-first"])} aria-live="polite">
              {locked
                ? <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {locked ? "Say it to unlock the swipe" : "Swipe right when you've got it"}
            </p>
          </>
        ) : !voice && top?.kind === "text" ? (
          <div className="mx-auto max-w-[640px] px-5"><OptionalCourseRecorder key={top.id} course={course} promptId={textId(course, level.id, top.item.id)} promptText={top.item.text} showPlayback={false}
            onBusy={setRecording} onSaved={take => setTakes(previous => ({ ...previous, [top.id]: take }))} /></div>
        ) : !hurt && top ? (
          <p className={cx("fc-keys", practice["fc-keys"])}><kbd>←</kbd> Again later <span aria-hidden="true">·</span> swipe the card or use the arrows <span aria-hidden="true">·</span> Got it <kbd>→</kbd></p>
        ) : null}
      </footer>
    </>
  );
}

/** The chapter's name as a menu: every chapter by part, with how far through each you are. */
function ChapterMenu({ texts, level, locked, course }: { texts: Texts; level: TextLevel; locked: boolean; course: string }) {
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
  const runs = loadRuns(course).runs;
  return (
    <div className={cx(`fc-menu${open ? " open" : ""}`, practice["fc-menu"])} ref={box}>
      <button className={cx("fc-menu-btn", practice["fc-menu-btn"])} onClick={() => setOpen((o) => !o)} disabled={locked} aria-expanded={open} aria-haspopup="menu">
        <span><b>{level.title}</b>{level.subtitle && <small>{level.subtitle}</small>}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5L6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className={cx("fc-menu-list", practice["fc-menu-list"])} role="menu">
          {byPart(texts.levels).map((g, i) => (
            <div key={i} className={cx("fc-menu-part", practice["fc-menu-part"])}>
              {g.part && <p>{g.part}</p>}
              {g.levels.map((l) => {
                const p = progress(chapterCards(l, course), runs[l.id] ?? EMPTY);
                return (
                  <button key={l.id} role="menuitem" aria-current={l.id === level.id ? "true" : undefined} onClick={() => { setOpen(false); go(flashcardsPath(course, l.id)); }}>
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
    <button className={cx(`fc-side ${dir}`, practice["fc-side"])} onClick={onClick} disabled={disabled} aria-disabled={locked} aria-keyshortcuts={got ? "ArrowRight" : "ArrowLeft"}
      title={locked ? "Say it first" : got ? "Got it (→)" : "Again later (←)"}>
      <span className={cx("fc-side-ic", practice["fc-side-ic"])} aria-hidden="true">
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
    <motion.article className={cx(`fc-card z-[6]${present ? " top" : " leaving"}${locked ? " locked" : ""}`, practice["fc-card"])} style={{ x, rotate }}
      aria-label={`Card: ${label}`} aria-hidden={!present} {...({ inert: present ? undefined : "" } as object)}
      custom={dir} variants={FLY} initial={{ y: -18, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit="away"
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag={recording ? false : "x"} dragMomentum={false} dragElastic={locked ? 0.12 : 0.9} onDragEnd={onDragEnd}>
      <motion.span className={cx("fc-stamp got", practice["fc-stamp"])} style={{ opacity: gotO }} aria-hidden="true">Got it</motion.span>
      <motion.span className={cx("fc-stamp again", practice["fc-stamp"])} style={{ opacity: againO }} aria-hidden="true">Again</motion.span>
      {children}
    </motion.article>
  );
}

/** Which drawing a card has. */
const artFor = (c: Flashcard): Art => c.kind === "lede" ? "book" : c.kind === "step" ? (c.care ? "care" : "bulb") : c.kind === "video" ? "video" : "mic";

/** A drawing at the top of a card, on a warm wash that melts into the card, with its chip. */
function CardArt({ art, chip, care }: { art: Art; chip: string; care?: boolean }) {
  return (
    <div className={cx("fc-head", practice["fc-head"])}>
      <div className={cx("fc-art", practice["fc-art"])} style={{ background: wash(art) }} />
      <Illustration art={art} className={cx("fc-illo", practice["fc-illo"])} />
      <span className={cx(`fc-chip${care ? " care" : ""}`, practice["fc-chip"])}>
        {care && <svg viewBox="0 0 16 16" aria-hidden="true"><path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>}
        {chip}
      </span>
    </div>
  );
}

function CardFace({ card, level, tips, take, band, onHurt, course, chapters }: {
  course: string; chapters: string[];
  card: Flashcard; level: TextLevel; tips: { label: string; body: string }[];
  take: Take | null; band: [number, number] | null; onHurt: () => void;
}) {
  const [showTips, setShowTips] = useState(false);
  return (
    <>
      <CardArt art={course !== DEFAULT_COURSE && card.kind === "text" ? "book" : artFor(card)} chip={course !== DEFAULT_COURSE && card.kind === "text" ? "Practise" : kicker(card, !!take)} care={card.kind === "step" && card.care} />
      <div className={cx(`fc-body ${card.kind}`, practice["fc-body"])}>
        {card.kind === "lede" && <><h2 className={cx("fc-title", practice["fc-title"])}>{level.title}</h2><Markdown course={course} chapters={chapters} src={card.markdown} className={cx("fc-md", practice["fc-md"])} headingOffset={2} /></>}
        {card.kind === "step" && <><h2 className={cx("fc-title", practice["fc-title"])}>{card.label}</h2><Markdown course={course} chapters={chapters} src={card.body} className={cx("fc-md", practice["fc-md"])} headingOffset={2} /></>}
        {card.kind === "video" && <><h2 className={cx("fc-title", practice["fc-title"])}>Watch first</h2><ChapterVideo video={card.video} course={course} /></>}
        {card.kind === "text" && <>
          {course === DEFAULT_COURSE ? <p className={cx(`fc-say${isLong(card.item.text) ? " long" : ""}`, practice["fc-say"])}>{card.item.text}</p>
            : <Markdown course={course} chapters={chapters} src={card.item.text} className={`fc-md ${practice["fc-md"]}`} headingOffset={2} />}
          {card.item.hint && (course === DEFAULT_COURSE ? <p className={cx("fc-hint", practice["fc-hint"])}>{card.item.hint}</p>
            : <Markdown course={course} chapters={chapters} src={card.item.hint} className={`fc-md small ${practice["fc-md"]}`} headingOffset={2} />)}
          {take && (
            <section className={cx("fc-take", practice["fc-take"])} aria-label="Your take">
              <div className={cx("prc", practice["prc"])}><ListenBack src={take.audio_url} /></div>
              {course === DEFAULT_COURSE && <FoldedMeasures key={take.id} take={take} band={band} />}
            </section>
          )}
          {(tips.length > 0 || course === DEFAULT_COURSE) && (
            <div className={cx("fc-tips", practice["fc-tips"])}>
              <div className={cx("fc-foot", practice["fc-foot"])}>
                {tips.length > 0 && (
                  <button className={cx("fc-tips-btn", practice["fc-tips-btn"])} aria-expanded={showTips} onClick={() => setShowTips((v) => !v)}>
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.3 4.3 0 00-2.6 7.7c.5.4.8 1 .8 1.6v.4h3.6v-.4c0-.6.3-1.2.8-1.6A4.3 4.3 0 008 1.8zM6.4 13.6h3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {showTips ? "Hide tips" : <span>Tips<span className="fc-tips-for"> for {level.title.toLowerCase()}</span> ({tips.length})</span>}
                  </button>
                )}
                {course === DEFAULT_COURSE && (
                  <button className={cx("fc-hurt", practice["fc-hurt"])} onClick={onHurt}>
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                    {HURT}
                  </button>
                )}
              </div>
              {showTips && (
                <ol>
                  {tips.map((t, i) => (
                    <li key={i} className={isCare(t.label) ? "care" : undefined}>
                      <b>{t.label}</b>
                      <Markdown course={course} chapters={chapters} src={t.body} className={cx(cx("fc-md small", practice["fc-md"]), shared["small"])} headingOffset={2} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>}
      </div>
    </>
  );
}

function EndCard({ art, chip, title, body, children }: { art: Art; chip: string; title: string; body: ReactNode; children: ReactNode }) {
  return (
    <motion.article className={cx("fc-card end", practice["fc-card"])} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <CardArt art={art} chip={chip} />
      <div className={cx("fc-body", practice["fc-body"])}>
        <h2 className={cx("fc-title", practice["fc-title"])}>{title}</h2>
        <p className={cx("fc-md", practice["fc-md"])}>{body}</p>
        <div className={cx("fc-row", practice["fc-row"])}>{children}</div>
      </div>
    </motion.article>
  );
}
