import "../styles/voice.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, Exercise, Prompts, Review, Session, Take } from "../api";
import { go } from "../App";
import { AudioPlayer } from "../components/AudioPlayer";
import { Callout, Choices, StatusBadge, Steps, TakeFlags, useTakeStatus } from "../components/bits";
import { MicCheck, RecordPanel, useMic } from "../components/Recording";
import { ReadAlong, ReadNotes } from "../components/ReadAlong";

const Ext = () => <svg className="vext" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 2.5h5v5M9.5 2.5l-7 7" /></svg>;

// Which reading-cue set fits each exercise's practice text.
const READ_LEVEL: Record<string, string> = {
  "nhsfife.forward-hum": "resonance", "nhsfife.smile-brighten": "phrases", "nhsfife.gentle-pitch-count": "automatic",
  "nhsfife.real-phrases-intonation": "phrases", "nhsfife.progression-ladder": "automatic",
};

type Step = "mic" | "reference" | "exercise" | "check" | "followup" | "spontaneous" | "comfort" | "done";
const FULL: Step[] = ["mic", "reference", "exercise", "check", "followup", "spontaneous", "comfort", "done"];
const CHECKIN: Step[] = ["mic", "reference", "comfort", "done"];

function stepKey(id: string) { return `lilt.step.${id}`; }

export function PracticePage({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [cueId, setCueId] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [step, setStepState] = useState<Step>("mic");
  const [review, setReview] = useState<Review | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    const d = await api.session(sessionId);
    setSession(d.session);
    setExercise(d.exercise);
    setTakes(d.takes);
    if (d.reviews.length) setReview(d.reviews[d.reviews.length - 1]);
    return d;
  };

  useEffect(() => {
    void (async () => {
      try {
        const d = await reload();
        const today = await api.today();
        setPrompts(today.prompts);
        setCueId(today.plan.exercise_id === d.session.exercise_id ? today.plan.cue_id : null);
        let saved: Step | null = null;
        try { saved = sessionStorage.getItem(stepKey(sessionId)) as Step | null; } catch { /* ignore */ }
        if (d.session.state === "completed") setStepState("done");
        else if (saved && saved !== "mic") setStepState(saved);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = session?.kind === "check_in" ? CHECKIN : FULL;
  const setStep = (s: Step) => {
    setStepState(s);
    try { sessionStorage.setItem(stepKey(sessionId), s); } catch { /* ignore */ }
    window.scrollTo(0, 0);
    document.querySelector(".ds-body")?.scrollTo(0, 0);
  };
  const next = () => setStep(steps[Math.min(steps.length - 1, steps.indexOf(step) + 1)]);
  const addTake = (t: Take) => setTakes((xs) => [...xs.filter((x) => x.id !== t.id), t]);

  if (err) return <Callout kind="warn"><p>{err}</p></Callout>;
  if (!session || !prompts) return <p className="vloading">Loading session…</p>;

  const ladder = exercise?.ladder?.length ? exercise.ladder[session.ladder_step ?? 0] : null;
  const cue = exercise ? (exercise.cues.find((c) => c.id === cueId) ?? exercise.primary_cue) : null;
  const refTakes = takes.filter((t) => t.role === "reference");
  const exTakes = takes.filter((t) => t.role === "exercise" || t.role === "retry");
  const pre = refTakes.find((t) => t.phase === "pre");
  const post = refTakes.find((t) => t.phase === "post");

  return (
    <div className="vpage vpractice">
      <div className="vprogress">
        <span className="vcap">{session.kind === "check_in" ? "Quick check-in" : "Practice session"}{step !== "done" ? `, step ${Math.min(steps.indexOf(step), steps.length - 2) + 1} of ${steps.length - 1}` : ""}</span>
        {step !== "done" && <a className="textlink" href="#/">Save &amp; leave</a>}
        <Steps total={steps.length - 1} current={Math.min(steps.indexOf(step), steps.length - 1)} />
      </div>

      {step === "mic" && <MicCheck onReady={next} />}

      {step === "reference" && (
        <section className="vstep">
          <h2 className="vh vh-sm">Reference phrase</h2>
          <p className="vphrase">{prompts.reference.text}</p>
          <p className="vtip">This is your baseline, not a test. Nothing here is graded.</p>
          {pre ? (
            <TakeRow take={pre} label="Your reference" onUpdate={addTake} />
          ) : (
            <RecordPanel
              label="reference · before"
              meta={{ session_id: session.id, role: "reference", phase: "pre", prompt_id: prompts.reference.prompt_id, prompt_text: prompts.reference.text }}
              onSaved={addTake}
            />
          )}
          <details className="why"><summary>Why the same phrase every time?</summary><div className="body">{prompts.reference.source_note}</div></details>
          <div className="vactions">
            <button className="btn-primary" onClick={next} disabled={!pre}>{session.kind === "check_in" ? "Continue" : "On to the exercise"}</button>
            {pre && <button className="btn-ghost" onClick={() => setTakes((x) => x.filter((t) => t.id !== pre.id))}>Record another take</button>}
          </div>
        </section>
      )}

      {step === "exercise" && exercise && (
        <ExerciseStep exercise={exercise} session={session} cue={cue} ladderText={ladder?.text ?? null} takes={exTakes} onTake={addTake} onNext={next} />
      )}

      {step === "check" && exercise && (
        <CheckStep exercise={exercise} takes={exTakes} onUpdate={addTake} onNext={next} />
      )}

      {step === "followup" && (
        <section className="vstep">
          <h2 className="vh vh-sm">Reference phrase again</h2>
          {!post && <p className="vphrase">{prompts.reference.text}</p>}
          <p className="vtip">Say the same phrase once more, now that you've practised. You'll hear before and after side by side. A change straight after practice is useful to hear, but it doesn't mean the change has become a habit yet.</p>
          {post ? (
            <div className="ab">
              {pre && <AudioPlayer src={pre.audio_url} label="Before practice" tag="A" />}
              <TakeRow take={post} label="After practice" tag="B" onUpdate={addTake} />
            </div>
          ) : (
            <RecordPanel label="reference · after"
              meta={{ session_id: session.id, role: "reference", phase: "post", prompt_id: prompts.reference.prompt_id, prompt_text: prompts.reference.text }} onSaved={addTake} />
          )}
          <div className="vactions">
            <button className="btn-primary" onClick={next} disabled={!post}>Continue</button>
            {!post && <button className="btn-ghost" onClick={next}>Skip</button>}
          </div>
        </section>
      )}

      {step === "spontaneous" && (
        <SpontaneousStep session={session} prompts={prompts} takes={takes.filter((t) => t.role === "spontaneous")} onTake={addTake} onNext={next} />
      )}

      {step === "comfort" && (
        <ComfortStep session={session} onDone={async () => {
          const r = await api.reviewSession(session.id);
          setReview(r);
          await reload();
          setStep("done");
        }} />
      )}

      {step === "done" && <DoneStep session={session} takes={takes} review={review} onUpdate={addTake} />}
    </div>
  );
}

function TakeRow({ take, label, onUpdate, tag }: { take: Take; label: string; onUpdate: (t: Take) => void; tag?: string }) {
  useTakeStatus(take, onUpdate);
  return (
    <div className="vtake">
      <AudioPlayer src={take.audio_url} label={label} tag={tag} knownDuration={take.analysis_summary?.duration_s} />
      <div className="vbadges">
        <StatusBadge status={take.status} />
        <TakeFlags take={take} />
      </div>
    </div>
  );
}

function ExerciseStep({ exercise, session, cue, ladderText, takes, onTake, onNext }: {
  exercise: Exercise; session: Session; cue: { id: string; text: string } | null; ladderText: string | null;
  takes: Take[]; onTake: (t: Take) => void; onNext: () => void;
}) {
  const variants = exercise.practice_task.variants;
  const nextVariant = variants.length ? variants[Math.min(takes.length, variants.length - 1)] : null;
  const allVariantsDone = variants.length === 0 ? takes.length > 0 : variants.every((v) => takes.some((t) => t.cue_id === v.id));
  const promptText = ladderText ?? exercise.practice_task.prompt_text;
  const promptId = ladderText ? `${exercise.practice_task.prompt_id}.${exercise.ladder![session.ladder_step ?? 0].id}` : exercise.practice_task.prompt_id;
  const ladderStep = exercise.ladder?.[session.ladder_step ?? 0];
  const mic = useMic();
  const starts = useRef<(number | null)[] | null>(null);
  const saved = async (t: Take) => {
    let out = t;
    if (starts.current) out = await api.patchTake(t.id, { read_along: { starts: starts.current, text: promptText } }).catch(() => t);
    starts.current = null;
    onTake(out);
  };
  const readable = !ladderStep || ladderStep.recordable;

  return (
    <section className="vstep">
      <h2 className="vh">{exercise.title}</h2>
      <p className="vtip">{exercise.purpose}</p>
      {exercise.areas.length > 0 && <p className="vpills">{exercise.areas.map((a) => <span key={a} className="vpill">{a.replace(/^./, (c) => c.toUpperCase())}</span>)}</p>}
      <details open>
        <summary>Steps</summary>
        <ol className="body vinstr">
          {exercise.instructions.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </details>
      {!readable && <p className="vtip">This step happens away from Lilt. Afterwards, record a short spoken note about how it went.</p>}
      {exercise.examples.length > 0 && <p className="vexamples">{exercise.examples.map((e) => (
        <a key={e.url} href={e.url} target="_blank" rel="noreferrer">{e.label}<Ext /></a>
      ))}</p>}
      <details>
        <summary>Safety, source and limits</summary>
        <div className="body small stack">
          <div><strong>Stop if:</strong><ul>{exercise.stop_conditions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          {exercise.dose_guidance && <p><strong>How much:</strong> {exercise.dose_guidance.text}</p>}
          <p><strong>Source:</strong> <a href={exercise.source.url} target="_blank" rel="noreferrer">{exercise.source.title}</a>, {exercise.source.section}. {exercise.source.organization}, checked {exercise.source.date_checked}.</p>
          <p><strong>Review status:</strong> {exercise.review.status.replace(/_/g, " ")}. {exercise.review.reviewer}.</p>
          <ul>{exercise.limitations.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </details>

      {takes.map((t, i) => (
        <TakeRow key={t.id} take={t} onUpdate={onTake} label={variants.length ? (variants.find((v) => v.id === t.cue_id)?.label ?? `Attempt ${i + 1}`) : `Attempt ${i + 1}`} />
      ))}

      {!allVariantsDone || variants.length === 0 ? (
        <RecordPanel
          key={takes.length}
          hint={nextVariant ? nextVariant.label : takes.length ? "Another attempt? Each one is saved separately." : "Record when you're ready. Example audio stops when recording starts."}
          meta={{
            session_id: session.id,
            role: ladderStep && !ladderStep.recordable ? "spontaneous" : "exercise",
            prompt_id: promptId,
            prompt_text: promptText,
            exercise_id: exercise.id,
            exercise_version: exercise.version,
            cue_id: nextVariant ? nextVariant.id : cue?.id ?? null,
          }}
          label={exercise.areas.join(" · ")}
          cue={cue ? `Cue: ${cue.text}` : undefined}
          screen={(rec) => readable
            ? <ReadAlong text={promptText} levelId={READ_LEVEL[exercise.id] ?? "phrases"} hint={nextVariant ? nextVariant.label : ""} kind="phrases"
                stream={mic.stream} active={rec} onStarts={(x) => { starts.current = x; }} />
            : <p className="readtext">{promptText}</p>}
          steadiness={exercise.id === "nhsfife.forward-hum"}
          live={exercise.id === "nhsfife.forward-hum" || !readable}
          onSaved={(t) => void saved(t)}
        />
      ) : null}
      {readable && <ReadNotes text={promptText} levelId={READ_LEVEL[exercise.id] ?? "phrases"} hint={nextVariant ? nextVariant.label : ""} />}
      <div className="vactions">
        <button className="btn-primary" onClick={onNext} disabled={!allVariantsDone}>Listen back and check in</button>
      </div>
    </section>
  );
}

function CheckStep({ exercise, takes, onUpdate, onNext }: { exercise: Exercise; takes: Take[]; onUpdate: (t: Take) => void; onNext: () => void }) {
  const target = takes[takes.length - 1];
  const variants = exercise.practice_task.variants;
  const [answers, setAnswers] = useState<Record<string, string>>(target?.self_report?.answers ?? {});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState(target?.note ?? "");
  if (!target) return <p>No exercise take yet.</p>;
  const pair = variants.length >= 2
    ? variants.map((v) => takes.filter((t) => t.cue_id === v.id).slice(-1)[0]).filter(Boolean)
    : takes.slice(-2);

  const save = async () => {
    setSaving(true);
    try {
      const t = await api.patchTake(target.id, { self_report: answers, note });
      onUpdate(t);
      onNext();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vstep">
      <h2 className="vh">Listen back</h2>
      <p className="vtip">Play your take{pair.length > 1 ? "s" : ""}. What you notice is the evidence here. Lilt can't hear resonance or lightness for you.</p>
      <div className="ab">
        {pair.map((t, i) => (
          <AudioPlayer key={t.id} src={t.audio_url} tag={pair.length > 1 ? "AB"[i] : undefined}
            label={variants.find((v) => v.id === t.cue_id)?.label ?? (pair.length > 1 ? `Attempt ${takes.indexOf(t) + 1}` : "Your attempt")} />
        ))}
      </div>
      {exercise.check_questions.map((q) => (
        <fieldset key={q.id} className="card soft">
          <legend>{q.text}</legend>
          <Choices name={q.id} options={q.options} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        </fieldset>
      ))}
      <div>
        <label htmlFor="take-note">What were you trying? (optional)</label>
        <textarea id="take-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. smiling more, thinking of the sound going forward" />
      </div>
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
      <div className="vactions">
        <button className="btn-primary" onClick={() => void save()} disabled={saving || !answers[exercise.check_questions[0].id]}>Save and continue</button>
        <button className="btn-ghost" onClick={onNext}>Skip the check</button>
      </div>
    </section>
  );
}

function SpontaneousStep({ session, prompts, takes, onTake, onNext }: { session: Session; prompts: Prompts; takes: Take[]; onTake: (t: Take) => void; onNext: () => void }) {
  const q = useMemo(() => prompts.spontaneous.questions[Math.floor(Math.random() * prompts.spontaneous.questions.length)], [prompts]);
  const take = takes[takes.length - 1];
  return (
    <section className="vstep">
      <h2 className="vh vh-sm">A short answer in your own words</h2>
      {!take && <p className="vphrase">{q}</p>}
      <p className="vtip">Optional. Answer in a few sentences and let your practised voice come along if it can. This is how carryover into everyday speech is checked; reading alone can't show it.</p>
      {take ? <TakeRow take={take} label="Your answer" onUpdate={onTake} /> : (
        <RecordPanel label="your own words" hint="Answer in a few sentences"
          meta={{ session_id: session.id, role: "spontaneous", prompt_id: prompts.spontaneous.prompt_id, prompt_text: q }} onSaved={onTake} />
      )}
      <div className="vactions">
        <button className="btn-primary" onClick={onNext} disabled={!take}>Continue</button>
        {!take && <button className="btn-ghost" onClick={onNext}>Skip today</button>}
      </div>
    </section>
  );
}

function ComfortStep({ session, onDone }: { session: Session; onDone: () => Promise<void> }) {
  const [comfort, setComfort] = useState<string | undefined>(session.comfort?.comfort);
  const [effort, setEffort] = useState<string | undefined>(session.comfort?.effort?.toString());
  const [hoarse, setHoarse] = useState(session.comfort?.hoarseness ?? false);
  const [likes, setLikes] = useState<string | undefined>(session.comfort?.likes_sound ?? undefined);
  const [note, setNote] = useState(session.comfort?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const finish = async () => {
    setBusy(true);
    try {
      await api.patchSession(session.id, {
        comfort: { comfort, effort: effort ? Number(effort) : null, hoarseness: hoarse, likes_sound: likes ?? null, note: note || null },
        complete: true,
      });
      await onDone();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <section className="vstep vcomfort">
      <h2 className="vh">How did that feel?</h2>
      <fieldset className="card soft">
        <legend>Comfort</legend>
        <Choices name="comfort" value={comfort} onChange={setComfort} options={[
          { id: "comfortable", label: "Comfortable" }, { id: "some_effort", label: "Some effort" },
          { id: "strain", label: "Strained" }, { id: "pain", label: "Painful" }]} />
        <label className="vcheck">
          <input type="checkbox" checked={hoarse} onChange={(e) => setHoarse(e.target.checked)} />
          I noticed new hoarseness
        </label>
      </fieldset>
      <fieldset className="card soft">
        <legend>Effort (1 = very easy, 5 = very effortful)</legend>
        <Choices name="effort" value={effort} onChange={setEffort} options={["1", "2", "3", "4", "5"].map((x) => ({ id: x, label: x }))} />
      </fieldset>
      <fieldset className="card soft">
        <legend>Do you like how it sounded? (optional)</legend>
        <Choices name="likes" value={likes} onChange={setLikes} options={[{ id: "yes", label: "Yes" }, { id: "somewhat", label: "Somewhat" }, { id: "no", label: "Not yet" }, { id: "unsure", label: "Not sure" }]} />
      </fieldset>
      <div>
        <label htmlFor="session-note">Anything else? (optional)</label>
        <textarea id="session-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {(comfort === "strain" || comfort === "pain" || hoarse) && (
        <Callout kind="warn"><p>Thank you for saying so. Lilt will pause this activity. Rest your voice; if it persists or keeps coming back, talk to a voice professional.</p></Callout>
      )}
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
      <button className="btn-primary btn-big" onClick={() => void finish()} disabled={!comfort || busy}>Finish session</button>
    </section>
  );
}

function Celebrate() {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, hue: ["var(--accent)", "#f2a65a", "#ffc53d", "var(--ok)", "#f4d6c8"][i % 5],
  })), []);
  const [on, setOn] = useState(true);
  useEffect(() => { const id = setTimeout(() => setOn(false), 3200); return () => clearTimeout(id); }, []);
  if (!on) return null;
  return <div className="celebrate" aria-hidden="true">{pieces.map((p, i) => <i key={i} style={{ left: `${p.left}%`, background: p.hue, animationDelay: `${p.delay}s` }} />)}</div>;
}

function DoneStep({ session, takes, review, onUpdate }: { session: Session; takes: Take[]; review: Review | null; onUpdate: (t: Take) => void }) {
  const allSaved = takes.length > 0 && takes.every((t) => t.original);
  return (
    <section className="vstep vdone">
      {allSaved && <Celebrate />}
      <h1 className="vh">{session.kind === "check_in" ? "Check-in saved" : "Session complete"}</h1>
      <Callout kind={allSaved ? "ok" : "warn"}>
        <p>{allSaved ? `All ${takes.length} recording${takes.length > 1 ? "s are" : " is"} saved on your computer.` : "Some recordings are not confirmed as saved yet."}</p>
      </Callout>
      <ul className="list" aria-label="Recordings in this session">
        {takes.map((t) => <DoneTake key={t.id} take={t} onUpdate={onUpdate} />)}
      </ul>
      {review?.active_pointer && (
        <div className="card vnext">
          <h2>One thing to work on next</h2>
          <p>{review.active_pointer.observation}</p>
          {review.active_pointer.next_action && <p className="ink2"><strong>Next:</strong> {review.active_pointer.next_action.summary}</p>}
          <div className="vactions">
            <button className="btn-primary" onClick={() => go(`/review/${review.id}`)}>Hear it and try again</button>
            <a className="btn btn-secondary" href="#/">Done for today</a>
          </div>
        </div>
      )}
      {review && !review.active_pointer && review.abstention && (
        <div className="card vnext">
          <p>{review.abstention.reason}</p>
          <p className="ink2"><strong>Next:</strong> {review.abstention.next_action}</p>
          <a className="btn btn-primary" href="#/">Back to today</a>
        </div>
      )}
      <p className="vcap">Showing up counts. Short, regular practice matters more than long sessions.</p>
    </section>
  );
}

function DoneTake({ take, onUpdate }: { take: Take; onUpdate: (t: Take) => void }) {
  useTakeStatus(take, onUpdate);
  const role = { reference: take.phase === "post" ? "Reference (after)" : "Reference", exercise: "Exercise", retry: "Retry", follow_up: "Follow-up", spontaneous: "Spontaneous answer", free: "Chapter" }[take.role];
  return (
    <li className="vdone-row">
      <span className="vdone-role">{role}</span>
      <StatusBadge status={take.status} />
      <TakeFlags take={take} />
      {take.status === "analysis_failed" && <button className="btn-ghost" onClick={() => void api.reanalyze(take.id).then(onUpdate)}>Retry analysis</button>}
    </li>
  );
}
