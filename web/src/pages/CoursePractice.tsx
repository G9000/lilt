import { useEffect, useRef, useState } from "react";
import { api, type Course, type Deck, type Rating, type Take, type TextLevel, type Texts } from "../api";
import { byPart, idLabel } from "../chapters";
import { Markdown, picture } from "../components/Markdown";
import { dailyPath, flashcardsPath, guidedPath, practicePath, recordingsPath, validCourseId } from "../courseNavigation";
import { parseTextId, textId } from "../courseIds";
import { shared } from "../ui/shared";
import { practice } from "../ui/practice";
import { cx } from "../ui/cx";
import { ChapterVideo } from "./Voice";
import { CourseNav, CourseRecorder, OptionalCourseRecorder } from "./CourseRecording";

const primary = `btn ${shared.btn} ${shared["btn-primary"]}`;
const secondary = `btn ${shared.btn} ${shared["btn-secondary"]}`;
const quiet = `textlink ${shared.textlink}`;
const heading = "mb-2 text-title font-semibold leading-tight tracking-tight text-pretty";
type Props = { course: string; view?: string; chapter?: string; item?: string; first?: string | null };

export function CoursePracticePage(props: Props) {
  if (!validCourseId(props.course)) return <div className="p-6"><p role="alert">This course address isn't valid.</p><a href="#/courses">All courses</a></div>;
  // Changing course starts fresh before any request or previous course content can be used.
  return <CoursePractice key={props.course} {...props} />;
}

function CoursePractice({ course, view, chapter, item, first }: Props) {
  const [data, setData] = useState<{ texts: Texts; course: Course } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let ignore = false;
    setError(null);
    void Promise.all([api.texts(course), api.courses()]).then(([texts, result]) => {
      if (ignore) return;
      const selected = result.courses.find(c => c.id === course);
      if (!selected) { setError("This course isn't installed."); return; }
      setData({ texts, course: selected });
    }, (e: Error) => { if (!ignore) setError(`Lilt couldn't load this course: ${e.message}`); });
    return () => { ignore = true; };
  }, [course, attempt]);

  const level = data?.texts.levels.find(l => l.id === chapter);
  return (
    <main className="h-full min-h-0 w-full flex-1 overflow-auto bg-page text-ink" aria-label="Course practice" onClickCapture={event => {
      if (locked && (event.target as HTMLElement).closest("a")) { event.preventDefault(); event.stopPropagation(); }
    }}>
      {/* The same centred 960px column as voice practice. */}
      <div className="mx-auto w-full max-w-[960px] px-[18px] py-6 sm:px-10 sm:py-8">
        <CourseNav course={course} title={data?.course.title} current={view === "today" ? "today" : !view && !chapter ? "home" : null} />
        {error ? <><p role="alert">{error}</p><button className={secondary} onClick={() => setAttempt(n => n + 1)}>Try again</button></>
          : !data ? <p role="status">Opening your course…</p>
          : view === "today" ? <DailyCards key={first ?? "today"} course={course} first={first} texts={data.texts} onBusy={setLocked} />
          : chapter ? level ? <CourseChapter key={level.id} course={course} level={level} texts={data.texts} item={item} onBusy={setLocked} />
            : <><h1 className={heading}>Chapter not found</h1><p>This chapter isn't in the course. Choose one from the course home.</p></>
          : <CourseHome course={data.course} texts={data.texts} />}
      </div>
    </main>
  );
}

function CourseHome({ course, texts }: { course: Course; texts: Texts }) {
  const cover = texts.home_cover && picture(texts.home_cover, course.id);
  return <>
    <header className="mb-6"><h1 className={heading}>{course.title}</h1><p className="text-ink-2">{course.summary}</p></header>
    {cover && <img className="mb-6 h-[clamp(140px,22vw,220px)] w-full rounded-[16px] object-cover shadow-[0_0_0_1px_var(--hair)]" src={cover} alt="Course cover" />}
    <div className="mb-6 flex flex-wrap gap-3">
      <a className={primary} href={`#${dailyPath(course.id)}`}>Start today's cards</a>
      {texts.levels[0] && <a className={secondary} href={`#${practicePath(course.id, texts.levels[0].id)}`}>First chapter</a>}
      <a className={secondary} href={`#${guidedPath(course.id)}`}>Guided practice</a>
      <a className={secondary} href={`#${recordingsPath(course.id)}`}>Recordings</a>
    </div>
    {texts.home && <details className="mb-6 border-y border-hair py-3 [&[open]>summary]:mb-4"><summary className="cursor-pointer font-medium">Course guide</summary><Markdown src={texts.home} course={course.id} chapters={texts.levels.map(l => l.id)} headingOffset={1} /></details>}
    {/* Chapters as tiles by part, the same as voice practice's Chapters page. */}
    <section aria-label="Course chapters">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">The chapters</h2>
      {!texts.levels.length && <p className="text-ink-2">This course has no chapters yet.</p>}
      {byPart(texts.levels).map((group, i) => <div key={i}>
        {group.part && <h3 className={cx("ve-cpart-h", practice["ve-cpart-h"])}>{group.part}</h3>}
        <ul className={cx("ve-cgrid", practice["ve-cgrid"], group.part ? "" : "mt-3")}>
          {group.levels.map(level => <li key={level.id}>
            <a className={cx("ve-ctile", practice["ve-ctile"])} href={`#${practicePath(course.id, level.id)}`}>
              <span className="n">{level.level}</span><b>{level.title}</b>{level.subtitle && <small>{level.subtitle}</small>}
              <span className="m">{level.items.length} {level.items.length === 1 ? "text" : "texts"}</span>
            </a>
          </li>)}
        </ul>
      </div>)}
    </section>
    {texts.edition?.mine && <p className="mt-6 text-sm text-ink-2">You're using your own copy of this course. <a href={`#/courses/${encodeURIComponent(course.id)}`}>See your changes</a>.</p>}
  </>;
}

function CourseChapter({ course, texts, level, item, onBusy }: { course: string; texts: Texts; level: TextLevel; item?: string; onBusy: (busy: boolean) => void }) {
  const selected = useRef<HTMLElement>(null);
  const [recordingItem, setRecordingItem] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  // Learn (the chapter's notes and video) or Practise (its texts), as in voice practice. A link to a
  // text, or a chapter with nothing to learn first, opens on Practise.
  const learnable = !!level.basis || !!level.video;
  const [tab, setTab] = useState<"learn" | "practise">(() => (item || !learnable ? "practise" : "learn"));
  useEffect(() => { if (item) setTab("practise"); }, [item]);
  useEffect(() => { onBusy(recording); return () => onBusy(false); }, [recording, onBusy]);
  useEffect(() => { if (item && tab === "practise") selected.current?.scrollIntoView({ block: "start" }); }, [item, tab]);
  const chapters = texts.levels.map(l => l.id);
  const index = texts.levels.indexOf(level);
  const next = texts.levels[index + 1];
  const tabClass = "h-9 min-h-0 rounded-[9px] px-4 text-sm font-medium text-ink-2 hover:text-ink aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-[0_0_0_1px_var(--hair)]";
  return <article>
    <header className="mb-6"><h1 className={heading}>{level.title}</h1>{level.subtitle && <p className="text-ink-2">{level.subtitle}</p>}</header>
    {learnable && <div className="mb-7 inline-flex gap-[2px] rounded-[12px] bg-fill p-[3px]" role="tablist" aria-label="Chapter">
      <button role="tab" className={tabClass} aria-selected={tab === "learn"} disabled={recording} onClick={() => setTab("learn")}>Learn</button>
      <button role="tab" className={tabClass} aria-selected={tab === "practise"} aria-label={`Practise, ${level.items.length} texts`} disabled={recording} onClick={() => setTab("practise")}>Practise <span className="text-xs font-normal text-ink-3">{level.items.length} texts</span></button>
    </div>}
    {tab === "learn" ? <>
      {level.basis && <div className="my-6 max-w-[68ch]"><Markdown src={level.basis} course={course} chapters={chapters} headingOffset={1} /></div>}
      {level.video && <div className="my-6"><ChapterVideo video={level.video} course={course} /></div>}
      <div className="mt-7 flex flex-wrap gap-3">
        <button className={primary} onClick={() => setTab("practise")}>Start practising</button>
        <a className={secondary} href={`#${flashcardsPath(course, level.id)}`}>Chapter cards</a>
      </div>
    </> : <>
      {!learnable && <a className={secondary} href={`#${flashcardsPath(course, level.id)}`}>Chapter cards</a>}
      {item && !level.items.some(text => text.id === item) && <p role="status">That text isn't in this chapter. You can read the other texts below.</p>}
      {level.items.map(text => <section key={text.id} ref={item === text.id ? selected : undefined} className="scroll-mt-6 border-t border-hair py-6 first:border-t-0 first:pt-0" aria-label={idLabel(text.id)}>
        <h2 className="mb-3 text-lg font-medium">{idLabel(text.id)}</h2>
        <div className="max-w-[68ch] [--md-body-size:18px]"><Markdown src={text.text} course={course} chapters={chapters} headingOffset={2} /></div>
        {text.hint && <div className="mt-3 max-w-[68ch] border-l border-hair pl-4 text-ink-2 [--md-body-size:14px]"><Markdown src={text.hint} course={course} chapters={chapters} headingOffset={2} /></div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <a className={secondary} href={`#${guidedPath(course, textId(course, level.id, text.id))}`} onClick={event => { if (recording) event.preventDefault(); }} aria-disabled={recording}>Guided practice</a>
          <button className={secondary} disabled={recording} aria-expanded={recordingItem === text.id} onClick={() => setRecordingItem(current => current === text.id ? null : text.id)}>{recordingItem === text.id ? "Hide recorder" : "Record this practice"}</button>
        </div>
        {recordingItem === text.id && <CourseRecorder course={course} promptId={textId(course, level.id, text.id)} promptText={text.text} onBusy={setRecording} />}
      </section>)}
      {!level.items.length && <p className="text-ink-2">This chapter has no practice texts yet.</p>}
    </>}
    {level.source_url && /^https?:\/\//i.test(level.source_url) && <p className="text-sm text-ink-2"><a href={level.source_url} target="_blank" rel="noreferrer">Course source</a></p>}
    <nav className="mt-8 flex flex-wrap gap-4 border-t border-hair pt-4" aria-label="Chapter navigation">
      <a className={quiet} href={`#${practicePath(course)}`}>All chapters</a>
      {next && <a className={quiet} href={`#${practicePath(course, next.id)}`}>Next: {next.title}</a>}
    </nav>
  </article>;
}

const ratings: { rating: Rating; label: string; help: string }[] = [
  { rating: "again", label: "Again", help: "I'd like another try" },
  { rating: "hard", label: "Hard", help: "It took some effort" },
  { rating: "good", label: "Good", help: "I could do it" },
  { rating: "easy", label: "Easy", help: "It felt familiar" },
];

function DailyCards({ course, texts, first, onBusy }: { course: string; texts: Texts; first?: string | null; onBusy: (busy: boolean) => void }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [selected, setSelected] = useState<string | null>(first ?? null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failedRating, setFailedRating] = useState<Rating | null>(null);
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [recording, setRecording] = useState(false);
  const recordingBusy = useRef(false);
  useEffect(() => { onBusy(busy || recording); return () => onBusy(false); }, [busy, recording, onBusy]);
  const active = useRef(false);
  const saving = useRef(false);
  const operation = useRef<{ card: string; rating: Rating; id: string; take: string | null } | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    let ignore = false;
    setError(null);
    void api.deck(course).then(result => { if (!ignore) setDeck(result); }, (e: Error) => {
      if (!ignore) setError(`Lilt couldn't load your cards: ${e.message}`);
    });
    return () => { ignore = true; };
  }, [course, attempt]);
  const remaining = deck?.items.filter(item => !item.done_today) ?? [];
  const current = remaining.find(item => item.card.id === selected) ?? remaining[0];
  const rate = async (rating: Rating) => {
    if (!current || saving.current || recordingBusy.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    setFailedRating(null);
    try {
      if (operation.current?.card !== current.card.id || operation.current.rating !== rating) {
        const take = takes[current.card.id];
        operation.current = { card: current.card.id, rating, id: crypto.randomUUID(), take: take?.course === course && take.prompt_id === current.card.prompt_id && take.original ? take.id : null };
      }
      const result = await api.rateCard(current.card.id, operation.current.take, rating, course, operation.current.id);
      operation.current = null;
      window.dispatchEvent(new CustomEvent("lilt:deck-changed", { detail: course }));
      if (!active.current) return;
      // A saved take is evidence for this rating only; the next visit can be silent.
      setTakes(previous => { const next = { ...previous }; delete next[current.card.id]; return next; });
      setDeck(result.deck);
      setSelected(rating === "again" ? result.deck.items.find(item => !item.done_today && item.card.id !== current.card.id)?.card.id ?? null : null);
      setRevealed(false);
    } catch (e) {
      if (active.current) {
        setError(`Lilt couldn't save your choice: ${e instanceof Error ? e.message : "Please try again."}`);
        setFailedRating(rating);
      }
    } finally {
      saving.current = false;
      if (active.current) setBusy(false);
    }
  };
  const prompt = current && parseTextId(current.card.prompt_id);
  const chapters = texts.levels.map(l => l.id);
  return <section aria-label="Today's course cards" aria-busy={busy}>
    <header className="mb-8"><h1 className={heading}>Today's cards</h1><p className="text-ink-2">Read, try it in your own time, then choose how it felt.</p></header>
    {error && <div className="mb-6"><p role="alert">{error}</p><button className={secondary} disabled={busy || recording} onClick={() => failedRating ? void rate(failedRating) : setAttempt(n => n + 1)}>Try again</button></div>}
    {!deck ? !error && <p role="status">Finding your cards…</p>
      : !current ? <div role="status"><h2 className="text-lg font-semibold">{deck.all_done || deck.items.some(item => item.done_today) ? "That's today's cards" : "No cards for today"}</h2><p className="text-ink-2">{deck.message || (deck.next_due ? `Your next cards are due ${deck.next_due}.` : "You can explore a chapter any time.")}</p><a className={secondary} href={`#${practicePath(course)}`}>Back to the course</a></div>
      : <article>
        <p className="text-sm text-ink-2">{current.card.deck_title} · {remaining.length} {remaining.length === 1 ? "card" : "cards"} to go</p>
        <div className="my-6 text-xl leading-relaxed"><Markdown src={current.card.front} course={course} chapters={chapters} headingOffset={1} /></div>
        <fieldset disabled={busy} className="m-0 border-0 p-0"><OptionalCourseRecorder key={current.card.id} course={course} promptId={current.card.prompt_id} promptText={current.card.front}
          onBusy={value => { recordingBusy.current = value; setRecording(value); }}
          onSaved={take => { if (take.course === course && take.prompt_id === current.card.prompt_id) setTakes(previous => ({ ...previous, [current.card.id]: take })); }} /></fieldset>
        {!revealed ? <button className={primary} disabled={recording || busy} onClick={() => setRevealed(true)}>{current.card.hint ? "Show hint" : "I've tried it"}</button> : <>
          {current.card.hint && <div className="mb-6 border-y border-hair py-4 text-ink-2"><Markdown src={current.card.hint} course={course} chapters={chapters} headingOffset={2} /></div>}
          <fieldset disabled={busy || recording} className="m-0 border-0 p-0"><legend className="mb-3 text-lg font-medium">How did it feel?</legend><p className="mb-4 text-sm text-ink-2">Your choice helps Lilt decide when to show this card again.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{ratings.map(({ rating, label, help }) => <button key={rating} className={`${secondary} flex-col items-start text-left`} onClick={() => void rate(rating)} title={current.preview[rating]}><span className="font-medium">{label}</span><span className="text-sm font-normal text-ink-2">{help}</span></button>)}</div>
          </fieldset>
        </>}
        {busy && <p role="status" className="mt-4 text-ink-2">Saving your choice…</p>}
        {recording && <p role="status" className="mt-4 text-ink-2">Let your recording save before choosing the next card.</p>}
        {prompt && prompt.course === course && <p className="mt-8"><a className={quiet} href={`#${practicePath(course, prompt.chapter, prompt.text)}`} aria-disabled={busy || recording} onClick={event => { if (busy || recording) event.preventDefault(); }}>Read the chapter</a></p>}
      </article>}
  </section>;
}
