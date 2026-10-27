import "../styles/data.css";
import { useEffect, useState } from "react";
import { api, AREA_LABEL, Evidence, Exercise, Pointer, Review, Take } from "../api";
import { go } from "../App";
import { AudioPlayer } from "../components/AudioPlayer";
import { Callout, Choices, Icon, StatusBadge, useToast, Toast } from "../components/bits";
import { RecordPanel } from "../components/Recording";

const KIND_LABEL: Record<Pointer["kind"], string> = {
  pause: "Paused for comfort", capture: "Recording tip", practice_focus: "Practice focus", progress: "Supported progress",
  stable: "Stable", more_evidence: "More evidence needed", descriptive: "Description",
};

const CLASS_LABEL: Record<Evidence["class"], string> = {
  measured: "Measured", self_reported: "Your own report", human_perceived: "Listener judgement",
  model_perceived: "Model judgement", inferred: "Inferred",
};

export function FeedbackPage({ reviewId }: { reviewId: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toast, setToast] = useToast();

  useEffect(() => {
    setFocusId(null);
    setReview(null);
    api.review(reviewId).then(setReview, (e) => setErr(e.message));
    api.exercises().then((x) => setExercises(x.exercises), () => undefined);
  }, [reviewId]);

  if (err) return <div className="dv"><Callout kind="warn" icon="!"><p>{err}</p></Callout></div>;
  if (!review) return <p className="dv-loading">Loading feedback…</p>;

  const pointers = [review.active_pointer, ...review.other_observations].filter(Boolean) as Pointer[];
  const pointer = pointers.find((p) => p.id === focusId) ?? review.active_pointer;
  const others = pointers.filter((p) => p !== pointer);

  return (
    <div className="dv fb">
      <a href="#/desk" className="dv-back">{Icon.back}Today</a>
      {review.evidence_deleted.length > 0 && (
        <Callout kind="warn" icon="!"><p>Some evidence for this review was deleted ({review.evidence_deleted.length} recording{review.evidence_deleted.length > 1 ? "s" : ""}). The review is kept as it was written.</p></Callout>
      )}
      {pointer ? (
        <PointerView pointer={pointer} review={review} exercises={exercises} isActive={pointer === review.active_pointer} onChanged={(r, msg) => { setReview(r); setToast(msg); }} />
      ) : review.abstention ? (
        <section className="dv-head fb-head" aria-labelledby="abs-h">
          <h1 id="abs-h">{review.abstention.reason}</h1>
          <p className="fb-tags"><span className="badge">No pointer this time</span></p>
          <p className="dv-lede"><span className="fb-next">Next:</span> {review.abstention.next_action}</p>
          <div><a className="btn btn-primary" href="#/desk">Back to today</a></div>
        </section>
      ) : <p className="dv-empty">Nothing to show.</p>}

      {others.length > 0 && (
        <details className="dv-quiet">
          <summary>Other observations ({others.length})</summary>
          <div className="body">
            <ul className="fb-others">
              {others.map((p) => (
                <li key={p.id}>
                  <p className="fb-tags"><span className="badge">{KIND_LABEL[p.kind]}</span><span>{AREA_LABEL[p.area] ?? p.area}</span></p>
                  <p>{p.observation}</p>
                  {p.evidence.some((e) => e.take_id) && <div><button className="dv-mini" onClick={() => { setFocusId(p.id); window.scrollTo(0, 0); document.getElementById("main")?.scrollTo(0, 0); }}>Open with evidence</button></div>}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <p className="dv-cap fb-by">Reviewed by {review.author.kind === "rules" ? "Lilt's built-in rules" : `${review.author.name}${review.author.model ? ` (${review.author.model})` : ""}`} on {new Date(review.created_utc).toLocaleString(undefined, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}. {review.author.received_audio ? "" : "This review did not listen to audio."}</p>
      <Toast text={toast} />
    </div>
  );
}

function PointerView({ pointer, review, exercises, isActive, onChanged }: {
  pointer: Pointer; review: Review; exercises: Exercise[]; isActive: boolean; onChanged: (r: Review, msg: string) => void;
}) {
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [hearSignal, setHearSignal] = useState(0);
  const [mode, setMode] = useState<"view" | "retry" | "compare">("view");
  const [retryTake, setRetryTake] = useState<Take | null>(null);
  const [retrySession, setRetrySession] = useState<string | null>(null);
  const ex = exercises.find((e) => e.id === pointer.next_action?.exercise_id);
  const audioEv = pointer.evidence.find((e) => e.take_id);
  const original = audioEv?.take_id ? takes[audioEv.take_id] : undefined;

  useEffect(() => {
    const ids = pointer.evidence.flatMap((e) => [e.take_id, e.comparison_take_id]).filter((x): x is string => !!x);
    void Promise.all(ids.map((id) => api.take(id).catch(() => null))).then((ts) => {
      const m: Record<string, Take> = {};
      ts.forEach((t) => { if (t) m[t.id] = t; });
      setTakes(m);
    });
    setMode("view");
  }, [pointer.id, review.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRetry = async () => {
    window.dispatchEvent(new Event("lilt:stop-playback"));
    // Retry in the same session if it's from today; otherwise start a new one.
    const today = await api.today();
    const s = await api.session(review.session_id);
    let sid = review.session_id;
    if (s.session.local_date !== today.local_date) sid = (await api.createSession("full")).id;
    setRetrySession(sid);
    setMode("retry");
  };

  return (
    <>
      <section className="dv-head fb-head" aria-labelledby="obs-h">
        <h1 id="obs-h">{pointer.observation}</h1>
        <p className="fb-tags"><span className={`badge${isActive ? " now" : ""}`}>{KIND_LABEL[pointer.kind]}</span><span>{AREA_LABEL[pointer.area] ?? pointer.area}</span></p>
        <p className="dv-lede">{pointer.goal_connection}</p>
      </section>

      {/* 1. Hear the moment */}
      <section className="card fb-step" aria-labelledby="hear-h">
        <h2 id="hear-h">1 · Hear the moment</h2>
        {pointer.evidence.length === 0 && <p className="fb-text">There's no recording behind this observation yet.</p>}
        {pointer.evidence.map((e, i) => (
          <div key={i} className="fb-ev">
            <p className="fb-ev-desc"><span className="badge">{CLASS_LABEL[e.class]}</span> {e.description}</p>
            {e.measure && <p className="dv-cap">{e.measure.name.replace(/_/g, " ")}: {e.measure.value}{e.measure.unit ? ` ${e.measure.unit}` : ""}</p>}
            {e.take_id && takes[e.take_id] && (
              <>
                <AudioPlayer src={takes[e.take_id].audio_url} tag={e.comparison_take_id ? "A" : undefined}
                  label={`${takes[e.take_id].prompt_text.slice(0, 60)}`}
                  segment={e.segment} segmentLabel="evidence" playSegmentSignal={hearSignal} knownDuration={takes[e.take_id].analysis_summary?.duration_s} />
                {!e.segment && <p className="dv-cap">This is based on the whole recording{e.class === "self_reported" ? " and your own answer" : ""}, so no moment is marked.</p>}
              </>
            )}
            {e.take_id && !takes[e.take_id] && review.evidence_deleted.includes(e.take_id) && <p className="dv-cap">This recording was deleted.</p>}
            {e.comparison_take_id && takes[e.comparison_take_id] && (
              <AudioPlayer src={takes[e.comparison_take_id].audio_url} tag="B" label="Compared with" segment={e.comparison_segment} segmentLabel="evidence" playSegmentSignal={hearSignal} knownDuration={takes[e.comparison_take_id].analysis_summary?.duration_s} />
            )}
          </div>
        ))}
        {pointer.evidence.some((e) => e.segment) && (
          <div><button className="btn-secondary" onClick={() => setHearSignal((x) => x + 1)}>{Icon.play}Play the marked moment</button></div>
        )}
      </section>

      {/* 2. Try this cue */}
      {pointer.next_action && (
        <section className="fb-step" aria-labelledby="cue-h">
          <h2 id="cue-h">2 · Try this</h2>
          {pointer.next_action.cue_text ? <p className="cue">{pointer.next_action.cue_text}</p> : <p className="fb-text">{pointer.next_action.summary}</p>}
          <details className="dv-quiet fb-why">
            <summary>Why this, source and limits</summary>
            <div className="body">
              <p><strong>Confidence basis.</strong> {pointer.confidence_basis.data_quality} {pointer.confidence_basis.comparability} {pointer.confidence_basis.method_status} {pointer.confidence_basis.uncertainty}</p>
              {ex && <>
                <p><strong>From:</strong> {ex.title} (v{ex.version}). <a href={ex.source.url} target="_blank" rel="noreferrer">{ex.source.title}<span className="sr-only"> (opens in a new tab)</span></a>, {ex.source.section}. {ex.review.status.replace(/_/g, " ")}; {ex.review.reviewer}.</p>
                <ul>{ex.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
                <p><strong>Stop if:</strong> {ex.stop_conditions[0]}</p>
              </>}
            </div>
          </details>
        </section>
      )}

      {/* 3. Try again → 4. Compare */}
      {pointer.recheck && pointer.kind !== "pause" && original && (
        <section className="fb-step" aria-labelledby="retry-h">
          <h2 id="retry-h">3 · Try again</h2>
          {mode === "view" && (
            <>
              <p className="fb-text">Record the same task again with the cue in mind. Your earlier take stays exactly as it is.</p>
              <div><button className="btn-primary" onClick={() => void startRetry()}>Try again</button></div>
            </>
          )}
          {mode === "retry" && retrySession && (
            <>
              <RecordPanel
                label="retry" title={original.prompt_text.toLowerCase()} cue={pointer.next_action?.cue_text ? `cue: ${pointer.next_action.cue_text}` : undefined}
                meta={{
                  session_id: retrySession, role: "retry", prompt_id: original.prompt_id, prompt_text: original.prompt_text,
                  exercise_id: original.exercise_id, exercise_version: original.exercise_version,
                  cue_id: pointer.next_action?.cue_id ?? original.cue_id, retry_of: original.id,
                  triggered_by_review: review.id, triggered_by_pointer: pointer.id,
                }}
                onSaved={(t) => { setRetryTake(t); setMode("compare"); }}
              />
              <div><button className="btn-ghost" onClick={() => setMode("view")}>Cancel</button></div>
            </>
          )}
          {mode === "compare" && retryTake && (
            <RetryCompare original={original} retry={retryTake} exercise={ex} pointer={pointer} onSaved={async (sid) => {
              const r = await api.reviewSession(sid);
              go(`/review/${r.id}`);
            }} />
          )}
        </section>
      )}
      {pointer.kind === "pause" && (
        <Callout kind="warn" icon="!"><p>{pointer.next_action?.summary}</p><p className="small">{pointer.confidence_basis.uncertainty}</p></Callout>
      )}

      {isActive && <Responses review={review} pointer={pointer} exercises={exercises} onChanged={onChanged} />}
    </>
  );
}

function RetryCompare({ original, retry, exercise, pointer, onSaved }: { original: Take; retry: Take; exercise?: Exercise; pointer: Pointer; onSaved: (sessionId: string) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pref, setPref] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(retry);
  useEffect(() => {
    const id = setInterval(async () => { const t = await api.take(retry.id); setStatus(t); }, 1500);
    return () => clearInterval(id);
  }, [retry.id]);

  const save = async () => {
    setBusy(true);
    const prefNote = pref === "retry" ? "Preferred the retry over the original." : pref === "original" ? "Preferred the original." : pref === "same" ? "No preference between original and retry." : "";
    await api.patchTake(retry.id, {
      self_report: Object.keys(answers).length ? answers : undefined,
      note: [prefNote, note].filter(Boolean).join(" ") || undefined,
      favourite: pref === "retry" ? true : undefined,
    });
    if (pref === "original") await api.patchTake(original.id, { favourite: true });
    await onSaved(retry.session_id);
  };

  return (
    <div className="fb-compare">
      <h2>4 · Compare</h2>
      <div className="fb-status"><StatusBadge status={status.status} /><span className="dv-cap">Your retry is saved as a separate take, linked to the original.</span></div>
      <p className="dv-cap">Press <kbd>A</kbd> or <kbd>B</kbd> to play either take.</p>
      <div className="ab">
        <AudioPlayer src={original.audio_url} tag="A" label="Original" knownDuration={original.analysis_summary?.duration_s} />
        <AudioPlayer src={retry.audio_url} tag="B" label="Retry with the cue" />
      </div>
      <div><a className="dv-link" href={`#/compare?a=${original.id}&b=${retry.id}`}>Open the detailed comparison</a></div>
      {exercise?.check_questions.map((q) => (
        <fieldset key={q.id} className="fb-q">
          <legend>{pointer.recheck?.ask === q.text ? "Recheck: " : ""}{q.text}</legend>
          <Choices name={`r-${q.id}`} options={q.options} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        </fieldset>
      ))}
      <fieldset className="fb-q">
        <legend>Which do you prefer? (optional)</legend>
        <Choices name="pref" value={pref} onChange={setPref} options={[{ id: "retry", label: "B, the retry" }, { id: "original", label: "A, the original" }, { id: "same", label: "No preference" }]} />
      </fieldset>
      <div className="fb-field">
        <label htmlFor="retry-note">Note (optional)</label>
        <textarea id="retry-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did it feel? Any strain?" />
      </div>
      <p className="dv-cap">If anything felt strained or painful, say so in your next comfort check. Lilt will pause the activity.</p>
      <div><button className="btn-primary" disabled={busy} onClick={() => void save()}>Save and see what's next</button></div>
    </div>
  );
}

function Responses({ review, pointer, exercises, onChanged }: { review: Review; pointer: Pointer; exercises: Exercise[]; onChanged: (r: Review, msg: string) => void }) {
  const [open, setOpen] = useState<"disagree" | "choose" | null>(null);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<string | undefined>();
  const send = async (response: string, msg: string, extra: Record<string, string> = {}) => {
    const r = await api.respond(review.id, { pointer_id: pointer.id, response, note: note || undefined, ...extra });
    setOpen(null);
    setNote("");
    onChanged(r.review, msg);
  };
  const disagreed = review.responses.filter((r) => r.response === "disagree");

  return (
    <section className="fb-step" aria-labelledby="resp-h">
      <h2 id="resp-h">Your say</h2>
      {review.proposed_plan && !review.responses.some((r) => r.response === "accept") && (
        <Callout kind="pink" icon="→">
          <p><strong>Suggested next:</strong> {review.proposed_plan.rationale}</p>
          <div><button className="btn-primary" onClick={() => void send("accept", "Plan updated")}>Make this my next focus</button></div>
        </Callout>
      )}
      {disagreed.map((d, i) => <p key={i} className="fb-text">You marked this as not matching what you hear or feel{d.note ? `: “${d.note}”` : ""}. That's kept for the next assessment.</p>)}
      <div className="fb-actions">
        <button className="btn-secondary" onClick={() => setOpen("disagree")}>Doesn't match what I hear or feel</button>
        <button className="btn-ghost" onClick={() => void send("keep_focus", "Keeping your current focus")}>Keep current focus</button>
        <button className="btn-ghost" onClick={() => setOpen("choose")}>Choose another activity</button>
      </div>
      {open === "disagree" && (
        <div className="fb-field">
          <label htmlFor="dis-note">What do you hear or feel instead? (optional)</label>
          <textarea id="dis-note" value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="dv-cap">Your note stays attached to this review. Nothing gets re-scored right away, and the original evidence isn't changed.</p>
          <div><button className="btn-primary" onClick={() => void send("disagree", "Noted. Kept with this review")}>Save note</button></div>
        </div>
      )}
      {open === "choose" && (
        <div className="fb-field">
          <Choices name="choose-ex" value={choice} onChange={setChoice} options={exercises.map((e) => ({ id: e.id, label: e.title }))} />
          <div><button className="btn-primary" disabled={!choice} onClick={() => void send("choose_other", "Plan updated", { chosen_exercise_id: choice! })}>Use this next</button></div>
        </div>
      )}
    </section>
  );
}
