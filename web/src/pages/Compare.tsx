import "../styles/data.css";
import { useEffect, useState } from "react";
import { api, Comparison, Take } from "../api";
import { AudioPlayer } from "../components/AudioPlayer";
import { Callout, Icon, PitchTrace } from "../components/bits";

const OUTCOME: Record<Comparison["outcome"], string> = {
  not_comparable: "Not comparable",
  insufficient_evidence: "Not enough evidence",
  stable: "Similar (stable)",
  difference_noted: "A difference was measured",
};

export function ComparePage({ a, b }: { a: string; b: string }) {
  const [ta, setTa] = useState<Take | null>(null);
  const [tb, setTb] = useState<Take | null>(null);
  const [cmp, setCmp] = useState<Comparison | null>(null);
  const [an, setAn] = useState<[any, any]>([null, null]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!a || !b) return;
    Promise.all([api.take(a), api.take(b), api.compare(a, b)])
      .then(([x, y, c]) => { setTa(x); setTb(y); setCmp(c); })
      .catch((e) => setErr(e.message));
    Promise.all([api.analysis(a).catch(() => null), api.analysis(b).catch(() => null)]).then((x) => setAn(x as [any, any]));
  }, [a, b]);

  if (!a || !b) return <div className="dv"><p className="dv-empty">Pick two takes to compare from <a href="#/progress">Progress</a> or <a href="#/history">Recordings</a>.</p></div>;
  if (err) return <div className="dv"><Callout kind="warn" icon="!"><p>{err}</p></Callout></div>;
  if (!ta || !tb || !cmp) return <p className="dv-loading">Loading comparison…</p>;

  const label = (t: Take, fallback: string) => t.role === "retry" ? "Retry" : t.retry_of ? "Retry" : t.phase === "post" ? "After practice" : t.phase === "pre" ? "Before practice" : fallback;
  const samePrompt = ta.prompt_text === tb.prompt_text;
  const num = (name: string, v: number | null) => v?.toFixed(name.includes("coverage") ? 2 : 1) ?? "unavailable";

  return (
    <div className="dv cmp">
      <header className="dv-head">
        <h1>Two takes, side by side</h1>
        {samePrompt && <p className="dv-lede">{ta.prompt_text}</p>}
        <p className="dv-cap">Press <kbd>A</kbd> or <kbd>B</kbd> to play either take.</p>
      </header>
      <div className="ab">
        {[ta, tb].map((t, i) => (
          <div key={t.id} className="cmp-side">
            <AudioPlayer src={t.audio_url} tag={"AB"[i]} label={`${label(t, i ? "Second" : "First")}, ${new Date(t.created_utc).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`} segment={i ? cmp.segment_b : cmp.segment_a} segmentLabel="voiced span" />
            {!samePrompt && <p className="dv-cap">{t.prompt_text}</p>}
            {t.note && <p className="rc-note">Note: {t.note}</p>}
            <div>
              <button className={`dv-mini${t.favourite ? " on" : ""}`} aria-pressed={t.favourite} onClick={() => void api.patchTake(t.id, { favourite: !t.favourite }).then((x) => (i ? setTb : setTa)(x))}>
                {Icon.star}{t.favourite ? "Favourite" : "Mark as favourite"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <section className="dv-sec cmp-result" aria-labelledby="outcome-h">
        <h2 id="outcome-h">{OUTCOME[cmp.outcome]}</h2>
        {cmp.reasons.map((r, i) => <p key={i} className="cmp-reason">{r}</p>)}
        {cmp.limitations.length > 0 && <ul className="cmp-limits">{cmp.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        <p className="dv-cap">{cmp.method_status} Your own listening and comfort matter more here than any number.</p>
        <details className="dv-quiet">
          <summary>Measurements</summary>
          <div className="body">
            <div className="table-wrap">
              <table className="cmp-table">
                <thead><tr><th>Measure</th><th>A</th><th>B</th><th>Difference</th></tr></thead>
                <tbody>
                  {cmp.measures.map((m) => (
                    <tr key={m.name}>
                      <td><span className="cmp-m">{m.name.replace(/_/g, " ")}</span><span className="dv-cap">{m.definition}</span></td>
                      <td>{num(m.name, m.a)}</td>
                      <td>{num(m.name, m.b)}</td>
                      <td>{m.delta !== null ? `${m.delta > 0 ? "+" : ""}${m.delta.toFixed(2)} ${m.unit}` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cmp-traces">
              <div><h3>A</h3><PitchTrace analysis={an[0]} /></div>
              <div><h3>B</h3><PitchTrace analysis={an[1]} /></div>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
