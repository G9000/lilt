import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, type Session, type Take, type Texts } from "../api";
import { idLabel } from "../chapters";
import { Markdown } from "../components/Markdown";
import { RecordPanel, useMic } from "../components/Recording";
import { DEFAULT_COURSE, textId } from "../courseIds";
import { guidedPath, practicePath, recordingsPath, validCourseId } from "../courseNavigation";
import { acquireRecordingLock } from "../recordingLock";
import { shared } from "../ui/shared";

const primary = `btn ${shared.btn} ${shared["btn-primary"]}`;
const secondary = `btn ${shared.btn} ${shared["btn-secondary"]}`;
const sessionPath = (course: string, id: string) => `/learn/${encodeURIComponent(course)}/practice/${encodeURIComponent(id)}`;
const message = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

async function deleteCourseTake(course: string, take: Take): Promise<boolean> {
  if (take.course !== course) throw new Error("This recording doesn't belong to this course.");
  if (!window.confirm("Delete this recording? This can't be undone. Exported or backed-up copies aren't affected.")) return false;
  // Hold the same lock as capture so another tab cannot start while this take is removed.
  const release = await acquireRecordingLock();
  try {
    const current = await api.take(take.id);
    if (current.course !== course || current.session_id !== take.session_id) throw new Error("This recording doesn't belong to this course. Refresh the list and try again.");
    await api.deleteTake(take.id, false);
    return true;
  } finally { release(); }
}

function CourseFrame({ course, children }: { course: string; children: ReactNode }) {
  return <main className="course-frame h-full min-h-0 w-full flex-1 overflow-auto bg-page text-ink">
    <div className="mx-auto w-full max-w-[var(--content-width)] px-[18px] py-6 sm:px-10 sm:py-8">
      <nav className="mb-8 flex flex-wrap gap-x-5 gap-y-2 border-b border-hair pb-4" aria-label="Course navigation">
        <a href={`#${practicePath(course)}`}>Course home</a>
        <a href={`#${guidedPath(course)}`}>Guided practice</a>
        <a href={`#${recordingsPath(course)}`}>Recordings</a>
      </nav>
      {children}
    </div>
  </main>;
}

type RecorderProps = {
  course: string; promptId?: string; promptText?: string; sessionId?: string;
  onSaved?: (take: Take) => void; onBusy?: (busy: boolean) => void;
  showPlayback?: boolean;
};

/** Recording is opt-in; opening this component never requests the microphone. */
export function CourseRecorder(props: RecorderProps) {
  return <Recorder key={`${props.course}:${props.sessionId ?? "studio"}:${props.promptId ?? "free"}`} {...props} />;
}

function Recorder({ course, promptId = "free", promptText = "", sessionId, onSaved, onBusy, showPlayback = true }: RecorderProps) {
  const [id, setId] = useState(sessionId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);
  const mic = useMic();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (sessionId) return;
    let ignore = false;
    setError(null);
    void api.studioSession(course).then(session => {
      if (ignore) return;
      if (session.course !== course) { setError("This recorder belongs to another course. Please reopen it."); return; }
      setId(session.id);
    }, error => { if (!ignore) setError(message(error)); });
    return () => { ignore = true; };
  }, [course, sessionId, attempt]);
  return <section className="my-5 border-y border-hair py-5" aria-label="Optional practice recording">
    <p className="mb-4 text-sm text-ink-2">Recording is optional. You can practise without it, or record a short explanation to listen back to. Stop whenever you need a break.</p>
    {error ? <><p role="alert">{error}</p><button className={secondary} onClick={() => setAttempt(n => n + 1)}>Try again</button></>
      : !id ? <p role="status">Opening your recorder…</p>
      : <RecordPanel meta={{ session_id: id, role: "free", prompt_id: promptId, prompt_text: promptText }} live={false}
        hint="Record when you're ready" onBusyChange={busy => { if (active.current) onBusy?.(busy); }} onSaved={saved => { if (active.current) { setTake(saved); onSaved?.(saved); } }} />}
    {mic.error && <p role="alert" className="mt-3">{mic.error}</p>}
    {take && showPlayback && <div className="mt-4"><p role="status">Recording saved.</p><SavedAudio take={take} /></div>}
  </section>;
}

export function OptionalCourseRecorder({ disabled = false, ...props }: RecorderProps & { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <div className="my-4">
    <button className={secondary} disabled={busy || disabled} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Hide recorder" : "Record this practice"}</button>
    {open && <CourseRecorder {...props} onBusy={value => { setBusy(value); props.onBusy?.(value); }} />}
  </div>;
}

function SavedAudio({ take }: { take: Take }) {
  return take.original ? <audio className="max-w-full" controls preload="none" src={take.audio_url} aria-label="Play saved recording" />
    : <p className="text-sm text-ink-2">This recording has no saved audio yet.</p>;
}

export function CourseGuidedPage({ course, sessionId, promptId }: { course: string; sessionId?: string; promptId?: string }) {
  if (!validCourseId(course) || course === DEFAULT_COURSE) return <p role="alert">Choose a course from All courses to open this practice.</p>;
  return <CourseFrame course={course}>{sessionId
    ? <GuidedSession key={`${course}:${sessionId}`} course={course} sessionId={sessionId} />
    : <GuidedChooser key={`${course}:${promptId ?? ""}`} course={course} promptId={promptId} />}</CourseFrame>;
}

function GuidedChooser({ course, promptId }: { course: string; promptId?: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [selected, setSelected] = useState(promptId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const creating = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let ignore = false;
    setError(null);
    void api.texts(course).then(result => { if (!ignore) setTexts(result); }, error => { if (!ignore) setError(message(error)); });
    return () => { ignore = true; };
  }, [course, attempt]);
  const choices = texts?.levels.flatMap(level => level.items.map(item => ({
    id: textId(course, level.id, item.id), label: `${level.title} · ${idLabel(item.id)}`, item,
  }))) ?? [];
  const choice = choices.find(item => item.id === selected) ?? (selected ? undefined : choices[0]);
  const start = async () => {
    if (!choice || creating.current) return;
    creating.current = true;
    setBusy(true);
    setError(null);
    try {
      const session = await api.courseSession(course, choice.id);
      if (active.current) window.location.hash = sessionPath(course, session.id);
    } catch (error) { if (active.current) setError(message(error)); }
    finally { creating.current = false; if (active.current) setBusy(false); }
  };
  return <>
    <h1 className="text-title font-semibold leading-tight">Guided practice</h1>
    <p className="my-4 text-ink-2">Choose one of your course's texts, try it in your own time, then save a reflection. Recording is optional.</p>
    {error && <div className="my-4"><p role="alert">{error}</p>{!texts && <button className={secondary} onClick={() => setAttempt(n => n + 1)}>Try again</button>}</div>}
    {!texts ? !error && <p role="status">Finding your practice texts…</p> : !choices.length ? <p>This course has no practice texts yet. You can still make an <a href={`#${recordingsPath(course)}`}>open recording</a>.</p> : <>
      <label className="my-4 block">Choose a practice text
        <select className="mt-2 block w-full rounded-control border border-hair bg-page p-3 text-ink" value={choice?.id ?? ""} disabled={busy} onChange={event => setSelected(event.target.value)}>
          {!choice && <option value="">Choose a text</option>}
          {choices.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {selected && !choice && <p role="status">That text isn't in this course any more. Choose another one.</p>}
      {choice && <div className="my-6"><Markdown src={choice.item.text} course={course} headingOffset={1} />{choice.item.hint && <div className="mt-4 text-ink-2"><Markdown src={choice.item.hint} course={course} headingOffset={2} /></div>}</div>}
      <button className={primary} disabled={busy || !choice} onClick={() => void start()}>{busy ? "Opening practice…" : "Start practice"}</button>
    </>}
    <p className="mt-8 text-sm text-ink-2">Your saved and unfinished practices are in <a href={`#${recordingsPath(course)}`}>Recordings</a>.</p>
  </>;
}

function GuidedSession({ course, sessionId }: { course: string; sessionId: string }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const removing = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const saving = useRef(false);
  const recordingBusy = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let ignore = false;
    setError(null);
    void api.session(sessionId).then(result => {
      if (ignore) return;
      if (result.session.course !== course || result.session.kind !== "course_guided" || !result.session.task) {
        setError("This practice doesn't belong to this course. Open it from its course's Recordings."); return;
      }
      setSession(result.session);
      setNotes(result.session.notes ?? "");
      setTakes(result.takes.filter(take => take.course === course));
    }, error => { if (!ignore) setError(message(error)); });
    return () => { ignore = true; };
  }, [course, sessionId, attempt]);
  const save = async (complete: boolean) => {
    if (!session || saving.current || recordingBusy.current || removing.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.patchSession(sessionId, { notes: notes.trim(), complete });
      if (active.current) { setSession(result); setSaved(true); }
    } catch (error) { if (active.current) setError(message(error)); }
    finally { saving.current = false; if (active.current) setBusy(false); }
  };
  const remove = async (take: Take) => {
    if (saving.current || recordingBusy.current || removing.current) return;
    removing.current = true;
    setDeleting(take.id);
    setError(null);
    try {
      if (await deleteCourseTake(course, take) && active.current) setTakes(previous => previous.filter(item => item.id !== take.id));
    } catch (error) { if (active.current) setError(message(error)); }
    finally { removing.current = false; if (active.current) setDeleting(null); }
  };
  return <>
    {error && <div className="my-4"><p role="alert">{error}</p>{!session && <button className={secondary} onClick={() => setAttempt(n => n + 1)}>Try again</button>}</div>}
    {!session ? !error && <p role="status">Opening your practice…</p> : <>
      <h1 className="text-title font-semibold leading-tight">{session.task!.title}</h1>
      <p className="my-4 text-sm text-ink-2">{session.local_date} · {session.state === "completed" ? "Completed practice" : "Your practice"}</p>
      <div className="my-6 text-lg leading-relaxed"><Markdown src={session.task!.text} course={course} headingOffset={1} /></div>
      {session.task!.hint && <div className="my-6 border-y border-hair py-4 text-ink-2"><Markdown src={session.task!.hint} course={course} headingOffset={2} /></div>}
      <p className="my-4 text-ink-2">Try this at your own pace. Pause or stop whenever you need to.</p>
      {session.state !== "completed" && <fieldset disabled={busy || deleting !== null} className="m-0 border-0 p-0"><OptionalCourseRecorder showPlayback={false} disabled={busy || deleting !== null} course={course} sessionId={session.id} promptId={session.task!.prompt_id} promptText={session.task!.text}
        onBusy={value => { recordingBusy.current = value; setRecording(value); }} onSaved={take => setTakes(previous => [...previous.filter(item => item.id !== take.id), take])} /></fieldset>}
      {takes.length > 0 && <section className="my-6" aria-label="Practice recordings"><h2 className="text-lg font-medium">Your recordings</h2>{takes.map(take => <div key={take.id} className="my-4"><SavedAudio take={take} />
        <button className={`${secondary} mt-3`} disabled={busy || recording || deleting !== null} onClick={() => void remove(take)} aria-label="Delete recording">{deleting === take.id ? "Deleting…" : "Delete recording"}</button>
      </div>)}</section>}
      <label className="my-6 block">Your reflection (optional)<textarea className="mt-2 block min-h-32 w-full rounded-control border border-hair bg-page p-3 text-ink" value={notes} disabled={busy} maxLength={10000}
        placeholder="What did you notice? What would you like to try next?" onChange={event => { setNotes(event.target.value); setSaved(false); }} /></label>
      <div className="flex flex-wrap gap-3">
        <button className={session.state === "completed" ? primary : secondary} disabled={busy || recording || deleting !== null} onClick={() => void save(false)}>Save reflection</button>
        {session.state !== "completed" && <><button className={primary} disabled={busy || recording || deleting !== null} onClick={() => void save(true)}>Finish practice</button>
          <button className={secondary} disabled={busy || recording || deleting !== null} onClick={() => void save(true)}>Stop here</button></>}
      </div>
      {busy && <p role="status" className="mt-4">Saving your practice…</p>}
      {recording && <p role="status" className="mt-4 text-ink-2">Stop the recording and let it save before finishing your practice.</p>}
      {!error && (saved || (session.state === "completed" && notes.trim() === (session.notes ?? ""))) && <p role="status" className="mt-4">{session.state === "completed" ? "Practice saved" : "Reflection saved"}</p>}
    </>}
  </>;
}

export function CourseRecordingsPage({ course }: { course: string }) {
  if (!validCourseId(course) || course === DEFAULT_COURSE) return <p role="alert">Choose a course from All courses to open its recordings.</p>;
  return <CourseFrame course={course}><CourseRecordings key={course} course={course} /></CourseFrame>;
}

function CourseRecordings({ course }: { course: string }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const removing = useRef(false);
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let ignore = false;
    setError(null);
    void Promise.all([api.history({ course, days: 36500 }), api.sessions(0, course)]).then(([history, result]) => {
      if (ignore) return;
      setTakes(history.takes.filter(take => take.course === course).sort((a, b) => b.created_utc.localeCompare(a.created_utc)));
      setSessions(result.sessions.filter(session => session.course === course));
      setCursor(result.next_cursor);
    }, error => { if (!ignore) setError(message(error)); });
    return () => { ignore = true; };
  }, [course, attempt]);
  const more = async () => {
    if (cursor === null || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await api.sessions(cursor, course);
      if (active.current) { setSessions(previous => [...previous, ...result.sessions.filter(session => session.course === course)]); setCursor(result.next_cursor); }
    } catch (error) { if (active.current) setError(message(error)); }
    finally { if (active.current) setBusy(false); }
  };
  const guided = sessions.filter(session => session.kind === "course_guided");
  const studio = sessions.filter(session => session.kind === "studio");
  const remove = async (take: Take) => {
    if (recording || removing.current || take.course !== course) return;
    removing.current = true;
    setDeleting(take.id);
    setError(null);
    try {
      if (await deleteCourseTake(course, take) && active.current) {
        setTakes(previous => previous?.filter(item => item.id !== take.id) ?? null);
        setAttempt(value => value + 1);
      }
    } catch (error) { if (active.current) setError(message(error)); }
    finally { removing.current = false; if (active.current) setDeleting(null); }
  };
  return <>
    <h1 className="text-title font-semibold leading-tight">Recordings</h1>
    <p className="my-4 text-ink-2">Your audio and guided practice for this course.</p>
    <div className="flex flex-wrap gap-3"><button className={secondary} disabled={recording || deleting !== null} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Hide recorder" : "Open recorder"}</button>
      <button className={secondary} disabled={busy || recording || deleting !== null} onClick={() => setAttempt(value => value + 1)}>Refresh recordings</button></div>
    {open && <fieldset disabled={deleting !== null} className="m-0 border-0 p-0"><CourseRecorder course={course} showPlayback={false} onBusy={setRecording} onSaved={take => { setTakes(previous => [take, ...(previous ?? []).filter(item => item.id !== take.id)]); setAttempt(value => value + 1); }} /></fieldset>}
    {error && <div className="my-4"><p role="alert">{error}</p><button className={secondary} disabled={busy || recording} onClick={() => setAttempt(n => n + 1)}>Try again</button></div>}
    {takes === null ? !error && <p role="status" className="my-6">Finding your recordings…</p> : <>
      <section className="my-8" aria-label="Saved course recordings">
        <h2 className="text-lg font-medium">Your audio</h2>
        {!takes.length ? <p className="text-ink-2">No recordings yet. You can record here or while practising a course text.</p> : <ol className="m-0 list-none p-0">{takes.map(take => <li key={take.id} className="border-b border-hair py-5">
          <p className="mb-2 font-medium">{take.prompt_id === "free" ? "Free recording" : take.prompt_text || "Practice recording"}</p>
          <p className="mb-3 text-sm text-ink-2">{new Date(take.created_utc).toLocaleString()}</p><SavedAudio take={take} />
          <button className={`${secondary} mt-3`} disabled={recording || deleting !== null} onClick={() => void remove(take)} aria-label="Delete recording">{deleting === take.id ? "Deleting…" : "Delete recording"}</button>
        </li>)}</ol>}
      </section>
      <section className="my-8" aria-label="Recording sessions">
        <h2 className="text-lg font-medium">Recording sessions</h2>
        <p className="my-3 text-sm text-ink-2">Open a session to find every take, including recordings that didn't finish saving.</p>
        {!studio.length && <p className="text-ink-2">No recording sessions on this page.</p>}
        {studio.map(session => <StudioRecordings key={session.id} course={course} session={session} refresh={attempt} disabled={recording || deleting !== null} deleting={deleting} onDelete={remove} />)}
      </section>
      <section className="my-8" aria-label="Saved guided practices">
        <h2 className="text-lg font-medium">Guided practices</h2>
        {!guided.length && <p className="text-ink-2">No guided practices on this page. <a href={`#${guidedPath(course)}`}>Choose a text to try</a>.</p>}
        <ol className="m-0 list-none p-0">{guided.map(session => <li key={session.id} className="border-b border-hair py-4">
          <a href={`#${sessionPath(course, session.id)}`}>{session.task?.title ?? "Guided practice"}</a>
          <p className="mt-1 text-sm text-ink-2">{session.local_date} · {session.state === "completed" ? "Completed" : "Continue practice"}</p>
        </li>)}</ol>
        {cursor !== null && <button className={`${secondary} mt-4`} disabled={busy} onClick={() => void more()}>{busy ? "Loading…" : "Older practices"}</button>}
      </section>
    </>}
  </>;
}

function StudioRecordings({ course, session, refresh, disabled, deleting, onDelete }: {
  course: string; session: Session; refresh: number; disabled: boolean; deleting: string | null; onDelete: (take: Take) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    setError(null);
    setTakes(null);
    void api.session(session.id).then(result => {
      if (ignore) return;
      if (result.session.course !== course || result.session.id !== session.id || result.session.kind !== "studio") {
        setError("This recording session doesn't belong to this course."); return;
      }
      if (result.takes.some(take => take.course !== course || take.session_id !== session.id)) {
        setError("These recordings don't match this course. Refresh the list and try again."); return;
      }
      setTakes(result.takes);
    }, error => { if (!ignore) setError(message(error)); });
    return () => { ignore = true; };
  }, [open, course, session.id, refresh, attempt]);
  return <details className="border-b border-hair py-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">Recording session · {session.local_date}</summary>
    {open && <div className="mt-4">
      {error ? <><p role="alert">{error}</p><button className={secondary} disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Try again</button></>
        : takes === null ? <p role="status">Opening this session's recordings…</p>
        : !takes.length ? <p className="text-ink-2">No recordings in this session.</p>
        : <ol className="m-0 list-none p-0">{takes.map(take => <li className="border-t border-hair py-4" key={take.id}>
          <p className="font-medium">{take.prompt_id === "free" ? "Free recording" : take.prompt_text || "Practice recording"}</p>
          <p className="my-2 text-sm text-ink-2">{new Date(take.created_utc).toLocaleString()} · {take.original ? "Audio saved" : "No saved audio"}</p>
          {!take.original && <p className="mb-3 text-sm text-ink-2">This take hasn't finished saving. If recording has stopped, you can remove it here.</p>}
          {take.original && <SavedAudio take={take} />}
          <button className={`${secondary} mt-3`} disabled={disabled} aria-label="Delete recording" onClick={() => void onDelete(take)}>{deleting === take.id ? "Deleting…" : "Delete recording"}</button>
        </li>)}</ol>}
    </div>}
  </details>;
}
