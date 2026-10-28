import "../styles/data.css";
import { useEffect, useMemo, useState } from "react";
import { api, AREA_LABEL, SkillCard, Take } from "../api";
import { go } from "../App";
import { AudioPlayer } from "../components/AudioPlayer";
import { Icon, SkillState, TakeFlags, takeName } from "../components/bits";

type ProgressData = Awaited<ReturnType<typeof api.progress>>;

const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "";

export function ProgressPage() {
  const [p, setP] = useState<ProgressData | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [days, setDays] = useState(7);
  const [prompt, setPrompt] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => { void api.progress().then(setP); }, []);
  useEffect(() => { void api.history({ days }).then((h) => setTakes(h.takes)); }, [days]);

  const prompts = useMemo(() => {
    const m = new Map<string, { text: string; n: number }>();
    takes.forEach((t) => m.set(t.prompt_id, { text: t.prompt_text, n: (m.get(t.prompt_id)?.n ?? 0) + 1 }));
    return [...m.entries()];
  }, [takes]);
  useEffect(() => { if (!prompt && prompts.length) setPrompt(prompts[0][0]); }, [prompts, prompt]);
  const shown = takes.filter((t) => t.prompt_id === prompt);

  if (!p) return <p className="dv-loading">Loading progress…</p>;

  const togglePick = (id: string) => setPicked((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x.slice(-1), id]);
  const week = p.participation?.days_this_week ?? 0;
  const assessed = p.skills.filter((s) => s.state !== "not_assessed").length;

  return (
    <div className="dv dv-progress">
      <header className="dv-head">
        <h1>Skill notebook</h1>
        <p className="dv-lede">Where each skill stands, described in the task you practised it in. Nothing here is scored, and a missed day, a new exercise or a recording problem never counts against you.</p>
      </header>

      <dl className="dv-tiles">
        <div><dt>This week</dt><dd>{week} <small>{week === 1 ? "day" : "days"}</small></dd></div>
        <div><dt>Recordings, last {days} days</dt><dd>{takes.length}</dd></div>
        <div><dt>Skills with evidence</dt><dd>{assessed} <small>of {p.skills.length}</small></dd></div>
      </dl>

      <section className="dv-sec" aria-labelledby="skills-h">
        <h2 id="skills-h">Skills</h2>
        <ol className="pg-skills">
          {p.skills.map((s) => <SkillRow key={s.area} s={s} />)}
        </ol>
      </section>

      <section className="dv-sec pg-recs" aria-labelledby="hist-h">
        <div className="dv-sec-head">
          <h2 id="hist-h">Recordings by task</h2>
          <label htmlFor="days" className="sr-only">Window</label>
          <select id="days" className="dv-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </div>
        {prompts.length === 0 ? <p className="dv-empty">No recordings in this window yet. Takes from the deck, chapters and guided sessions show up here.</p> : (
          <>
            <div className="pg-task">
              <label htmlFor="prompt">Task</label>
              <select id="prompt" value={prompt} onChange={(e) => { setPrompt(e.target.value); setPicked([]); }}>
                {prompts.map(([id, v]) => <option key={id} value={id}>{v.text.slice(0, 70)} ({v.n})</option>)}
              </select>
              <p className="dv-cap">Only recordings of the same task are listed together, so any two can be compared. The pitch describes the recording; it's never a grade.</p>
            </div>
            <ul className="pg-takes">
              {shown.slice().reverse().map((t) => {
                const name = `${takeName(t)}, ${shortDate(t.local_date)}`;
                const on = picked.includes(t.id);
                return (
                  <li key={t.id} className={on ? "picked" : undefined}>
                    <label className="pg-pick">
                      <input type="checkbox" checked={on} onChange={() => togglePick(t.id)} aria-label={`Pick ${name} to compare`} />
                    </label>
                    <div className="pg-take">
                      <AudioPlayer src={t.audio_url} label={takeName(t)} compact knownDuration={t.analysis_summary?.duration_s} />
                      <div className="pg-take-meta">
                        <span>{shortDate(t.local_date)}</span>
                        {t.favourite && <span className="badge">{Icon.star}Favourite</span>}
                        <TakeFlags take={t} />
                        <span className="pg-hz">{t.analysis_summary?.f0_median_hz ? <><b>{t.analysis_summary.f0_median_hz.toFixed(0)} Hz</b> middle pitch</> : "No pitch summary"}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className={`pg-compare${picked.length ? " live" : ""}`}>
              <span aria-live="polite">{picked.length === 2 ? "Two picked." : picked.length === 1 ? "One picked. Pick one more." : "Pick two recordings to compare."}</span>
              <button className="btn-primary" disabled={picked.length !== 2} onClick={() => go(`/compare?a=${picked[0]}&b=${picked[1]}`)}>Compare selected</button>
            </div>
          </>
        )}
      </section>

      <details className="dv-quiet">
        <summary>What Lilt can't assess yet</summary>
        <div className="body">
          <ul>{p.missing_evaluation_assets.map((m) => <li key={m}>{m}</li>)}</ul>
          <p>Until those exist, Lilt relies on your own listening and reports, source-checked exercises and descriptive measurements.</p>
        </div>
      </details>
    </div>
  );
}

function SkillRow({ s }: { s: SkillCard }) {
  return (
    <li className="pg-skill" aria-labelledby={`sk-${s.area}`}>
      <div className="pg-skill-name">
        <h3 id={`sk-${s.area}`}>{AREA_LABEL[s.area]}</h3>
        <SkillState state={s.state} />
      </div>
      <div className="pg-skill-text">
        <p className="pg-next"><span>Next:</span> {s.next_action}</p>
        <p className="pg-why">{s.reason}</p>
        {s.learner_disagreement && <p className="pg-note">Your note: “{s.learner_disagreement}”</p>}
        <details className="pg-more">
          <summary>What Lilt can do here</summary>
          <dl>
            <dt>Practice</dt><dd>{s.capability.guided_practice}</dd>
            <dt>Measurement</dt><dd>{s.capability.acoustic_measurement}</dd>
            <dt>Feedback</dt><dd>{s.capability.listening_feedback}</dd>
            <dt>Validation</dt><dd>{s.capability.validation_status}</dd>
          </dl>
        </details>
      </div>
    </li>
  );
}
