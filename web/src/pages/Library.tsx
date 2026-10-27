import "../styles/texts.css";
import { useEffect, useState } from "react";
import { api, AREA_LABEL, Exercise, SkillCard } from "../api";
import { go } from "../App";

const STAGE: Record<string, string> = { beginner: "Beginner", beginner_after_resonance: "Beginner, after resonance" };
const stage = (s: string) => STAGE[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const COLS = ["Guided practice", "Measurement", "Feedback", "Validation"];

export function LibraryPage() {
  const [data, setData] = useState<{ exercises: Exercise[]; capability_matrix: { area: string; capability: SkillCard["capability"] }[] } | null>(null);
  useEffect(() => { void api.exercises().then(setData); }, []);
  if (!data) return <p className="tx-loading">Loading exercises…</p>;

  return (
    <div className="tx lb">
      <header className="tx-head">
        <h1>Guided exercises</h1>
        <p>A small starter set, each a short paraphrase of NHS Fife speech and language therapy guidance with a link to the original. An AI checked them against their sources; no clinician has reviewed them yet.</p>
      </header>

      <ul className="lb-list">
        {data.exercises.map((e) => (
          <li key={e.id}>
            <article className="lb-ex" aria-labelledby={`ex-${e.id}`}>
              <div className="lb-ex-head">
                <h2 id={`ex-${e.id}`}>{e.title}</h2>
                <span className="badge">{e.review.status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</span>
              </div>
              <div className="lb-sub">
                <ul className="lb-tags" aria-label="Areas">
                  {e.areas.map((a) => <li key={a}>{AREA_LABEL[a]}</li>)}
                </ul>
                <span className="lb-meta">{stage(e.stage)}, version {e.version}</span>
              </div>
              <p className="lb-purpose">{e.purpose}</p>
              <p className="lb-cue"><span>Cue</span>{e.primary_cue.text}</p>
              <details className="lb-more">
                <summary>Steps, safety and source</summary>
                <div className="body">
                  <ol>{e.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {e.ladder && <><h3>Ladder</h3><ol>{e.ladder.map((l) => <li key={l.id}>{l.text}</li>)}</ol></>}
                  <dl>
                    {e.progression_rule && <><dt>Moving up</dt><dd>{e.progression_rule.text} <span className="muted">({e.progression_rule.source_basis})</span></dd></>}
                    {e.dose_guidance && <><dt>How much</dt><dd>{e.dose_guidance.text}</dd></>}
                    <dt>Expected</dt><dd>{e.expected_observations.join(" ")}</dd>
                    <dt>Common misunderstandings</dt><dd>{e.common_misunderstandings.join(" ")}</dd>
                    <dt>Stop if</dt><dd>{e.stop_conditions.join(" ")}</dd>
                    <dt>Adaptations</dt><dd>{e.adaptations.join(" ")}</dd>
                    <dt>Limits</dt><dd>{e.limitations.join(" ")}</dd>
                    <dt>Source</dt>
                    <dd><a href={e.source.url} target="_blank" rel="noreferrer">{e.source.title}<span className="sr-only"> (opens in a new tab)</span></a>, section “{e.source.section}”, {e.source.organization}{e.source.issued ? `, issued ${e.source.issued}` : ""}. Checked {e.source.date_checked}.</dd>
                  </dl>
                  <p className="lb-licence">{e.license_note}</p>
                </div>
              </details>
              <button className="btn-secondary" onClick={() => void api.choosePlan(e.id).then(() => go("/desk"))}>Make this today's focus</button>
            </article>
          </li>
        ))}
      </ul>

      <section className="lb-caps" aria-labelledby="lb-caps">
        <h2 id="lb-caps">What Lilt can do in each area</h2>
        <table>
          <thead><tr><th scope="col">Area</th>{COLS.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {data.capability_matrix.map((c) => (
              <tr key={c.area}>
                <th scope="row">{AREA_LABEL[c.area]}</th>
                <td data-label={COLS[0]}>{c.capability.guided_practice}</td>
                <td data-label={COLS[1]}>{c.capability.acoustic_measurement}</td>
                <td data-label={COLS[2]}>{c.capability.listening_feedback}</td>
                <td data-label={COLS[3]}>{c.capability.validation_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tx-foot">Missing content: licensed example audio or video (Lilt links to the sources instead), clinician review, and vocal-pressure exercises (NHS Fife's page for that currently shows its intonation text).</p>
      </section>
    </div>
  );
}
