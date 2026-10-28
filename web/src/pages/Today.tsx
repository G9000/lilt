import "../styles/voice.css";
import { useEffect, useState } from "react";
import { api, Today } from "../api";
import { go } from "../App";
import { Callout } from "../components/bits";
import { Device3D } from "../components/Device3D";

const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>;

function useReminder(t: Today | null) {
  useEffect(() => {
    if (!t?.reminder.due || typeof Notification === "undefined") return;
    let shown: string | null = null;
    try { shown = localStorage.getItem("lilt.reminded"); } catch { /* ignore */ }
    // One reminder per day at most; a backlog of missed reminders is never replayed.
    if (shown === t.local_date || Notification.permission !== "granted") return;
    new Notification("Lilt", { body: `A few minutes for today's practice: ${t.exercise.title}.`, tag: "lilt-daily" });
    try { localStorage.setItem("lilt.reminded", t.local_date); } catch { /* ignore */ }
  }, [t]);
}

type DayState = "ready" | "in_progress" | "checked_in" | "done" | "paused";

export function TodayPage({ recovered }: { recovered: number }) {
  const [t, setT] = useState<Today | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.today().then(setT, (e) => setErr(e.message));
  useEffect(() => {
    void load();
  }, []);
  useReminder(t);

  if (err) return <Callout kind="warn"><p>Lilt's server isn't reachable: {err}</p><p className="small">Start it with <code>./lilt.sh</code> (or <code>docker compose up</code>) and reload.</p></Callout>;
  if (!t) return <p className="vloading" aria-busy="true">Loading…</p>;

  const start = async (kind: "full" | "check_in") => {
    setBusy(true);
    try {
      const s = await api.createSession(kind);
      go(`/practice/${s.id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  const ex = t.exercise;
  const p = t.participation;
  const dayName = new Date(t.local_date + "T00:00:00Z").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const pointer = t.latest_review?.active_pointer;

  // ---- what state is today in? ----
  const todays = t.today_sessions ?? [];
  // An unfinished session counts only if something was recorded in it.
  const resume = t.unfinished_session && (todays.find((s) => s.id === t.unfinished_session!.id)?.take_count ?? 0) > 0 ? t.unfinished_session : null;
  const doneFull = todays.find((s) => s.kind === "full" && s.state === "completed");
  const doneCheck = todays.find((s) => s.kind === "check_in" && s.state === "completed");
  const state: DayState = t.plan.paused ? "paused" : resume ? "in_progress" : doneFull ? "done" : doneCheck ? "checked_in" : "ready";
  const current = resume ? todays.find((s) => s.id === resume.id) : undefined;

  // ---- today's script: the session as a setlist ----
  const task = t.ladder_step ? t.ladder_step.text : ex.practice_task.prompt_text;
  const has = (pred: (r: { role: string; phase: string; self_report: boolean }) => boolean) => !!current?.roles.some(pred);
  const checkInOnly = current?.kind === "check_in";
  const allSteps = [
    { k: "mic", text: "Check your microphone", done: !!current && current.take_count > 0 },
    { k: "ref", text: "Say the reference phrase (count 1 to 10)", done: has((r) => r.role === "reference" && r.phase === "pre") },
    { k: "ex", text: task.replace(/\.$/, ""), done: has((r) => r.role === "exercise") },
    { k: "chk", text: "Listen back and check in", done: has((r) => r.role === "exercise" && r.self_report) },
    { k: "again", text: "Say the reference phrase again", done: has((r) => r.role === "reference" && r.phase === "post") },
    { k: "own", text: "Answer a short question", done: has((r) => r.role === "spontaneous") },
    { k: "comfort", text: "Note how it felt", done: !!current?.comfort },
  ];
  const steps = checkInOnly ? allSteps.filter((s) => ["mic", "ref", "comfort"].includes(s.k)) : allSteps;
  const all = state === "done";
  const nowIdx = all ? -1 : steps.findIndex((s) => !s.done);

  const screenFor = () => {
    if (state === "paused") return (
      <div className="vplan-note">
        <h2>Give your voice a break</h2>
        <p>You mentioned strain or discomfort last time. Come back when speaking feels comfortable again.</p>
      </div>
    );
    if (state === "done") return (
      <div className="vplan-note">
        <h2>Nice work</h2>
        <p>You saved {doneFull!.take_count} recording{doneFull!.take_count === 1 ? "" : "s"} today.</p>
        <p>Next time: {pointer?.next_action?.summary.replace(/^./, (c) => c.toLowerCase()) ?? "same exercise, gently."}</p>
      </div>
    );
    return (
      <>
        <p className="vplan-head">
          {state === "in_progress" ? `You're partway through: step ${nowIdx + 1} of ${steps.length}` : state === "checked_in" ? "You checked in today. The full session is still here." : "Today's plan"}
        </p>
        <ol className="setlist" aria-label="Today's script">
          {steps.map((s, i) => (
            <li key={s.k} className={s.done ? "done" : i === nowIdx ? "now" : ""}>
              <span className="mk">{s.done ? <><Check /><span className="sr-only">Done:</span></> : i + 1}</span>
              <span className="tx">{s.text}</span>
              {i === nowIdx && <span className="vpill next">Up next</span>}
            </li>
          ))}
        </ol>
      </>
    );
  };

  const press = () => {
    if (state === "paused") void api.resumePlan().then(load);
    else if (state === "in_progress") go(`/practice/${resume!.id}`);
    else if (state === "done") go("/studio");
    else void start("full");
  };
  const pressLabel = { ready: "Start today", checked_in: "Start today", in_progress: "Continue today's session", done: "Free practice", paused: "I feel fine, resume gently" }[state];
  const pressHint = { ready: "Start", checked_in: "Start", in_progress: "Continue", done: "Practise more", paused: "I'm ready" }[state];

  return (
    <div className="vpage vtoday">
      {recovered > 0 && <Callout kind="ok"><p>Recovered {recovered} recording{recovered > 1 ? "s" : ""} from an interrupted session, saved and marked as interrupted.</p></Callout>}

      <header className="vtoday-head">
        <h1 id="focus-h">
          {state === "done" ? "All done for today" : state === "paused" ? "Rest today" : ex.title}
        </h1>
        {state !== "done" && state !== "paused" && t.cue && <p className="vlede">{t.cue.text}</p>}
        {state === "done" && <p className="vlede">Anything more today is a bonus, never a requirement.</p>}
        <p className="vcap">
          {dayName}{p.days_this_week > 0 ? `. You've practised ${p.days_this_week} day${p.days_this_week === 1 ? "" : "s"} this week` : ""}. About {t.session_minutes} minutes, nothing is graded.
        </p>
        {t.reminder.due && state !== "done" && <p className="vreminder"><i aria-hidden="true" />Reminder for {t.reminder.time}. A short session or a check-in both count.</p>}
      </header>

      <Device3D screen={screenFor()} onPress={press} pressLabel={pressLabel} pressHint={pressHint} led={state === "in_progress"} busy={busy} />

      <nav className="vlinks" aria-label="More">
        {state !== "in_progress" && <button className="textlink" onClick={() => void start("check_in")} disabled={busy} aria-label="Quick check-in (1 min)">Quick check-in</button>}
        {(state === "in_progress" || state === "done") && <button className="textlink" onClick={() => void start("full")} disabled={busy}>{state === "done" ? "Do the full session again" : "Start over"}</button>}
      </nav>

      {pointer && (
        <section className="vmemo" aria-labelledby="memo-h">
          <h2 id="memo-h">{state === "done" ? "Today's feedback" : "From last time"}</h2>
          <p>{pointer.observation}</p>
          {pointer.next_action && <p className="ink2">Next: {pointer.next_action.summary}</p>}
          <a className="textlink" href={`#/review/${t.latest_review!.id}`}>Open feedback</a>
        </section>
      )}
      {!pointer && t.latest_review?.abstention && (
        <section className="vmemo" aria-labelledby="memo-h">
          <h2 id="memo-h">From last time</h2>
          <p className="ink2">{t.latest_review.abstention.reason} Next: {t.latest_review.abstention.next_action}</p>
        </section>
      )}

      <details className="why">
        <summary>{state === "paused" ? "Why paused?" : "Why this exercise?"}</summary>
        <div className="body">{t.plan.rationale} Source: <a href={ex.source.url} target="_blank" rel="noreferrer">{ex.source.title}</a> ({ex.review.status.replace("_", " ")}, not clinician-reviewed).</div>
      </details>
      {t.pending_jobs > 0 && <p className="vcap">{t.pending_jobs} recording{t.pending_jobs > 1 ? "s are" : " is"} still being analysed. They're saved and playable.</p>}
    </div>
  );
}
