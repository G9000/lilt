import "../styles/texts.css";
import { MouseEvent, useEffect, useState } from "react";
import { api, Texts } from "../api";
import { go } from "../App";

const host = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "the original page"; }
};

export function TextsPage() {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [open, setOpen] = useState<string>("all");
  useEffect(() => { void api.texts().then(setTexts); }, []);
  if (!texts) return <p className="tx-loading">Loading texts…</p>;

  const levels = texts.levels.filter((l) => open === "all" || l.id === open);
  const total = texts.levels.reduce((n, l) => n + l.items.length, 0);
  const pick = (e: MouseEvent<HTMLButtonElement>, id: string) => {
    setOpen(id);
    e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div className="tx">
      <header className="tx-head">
        <h1>Start small, build up</h1>
        <p>{texts.note}</p>
      </header>

      <div className="segmented tx-levels" role="group" aria-label="Level filter">
        <button aria-pressed={open === "all"} onClick={(e) => pick(e, "all")} aria-label={`All levels, ${total} texts`}>All</button>
        {texts.levels.map((l) => (
          <button key={l.id} aria-pressed={open === l.id} onClick={(e) => pick(e, l.id)} aria-label={`Level ${l.level}, ${l.title}, ${l.items.length} texts`}>{l.title}</button>
        ))}
      </div>

      {levels.map((l) => (
        <section key={l.id} aria-labelledby={`lv-${l.id}`} className="tx-level">
          <div className="tx-level-head">
            <h2 id={`lv-${l.id}`}>{l.title}</h2>
            <p>{l.subtitle}</p>
          </div>
          <ul className="tx-list">
            {l.items.map((i) => (
              <li key={i.id}>
                <button className="tx-row" onClick={() => go(`/studio/${l.id}/${i.id}`)} aria-label={`Practise “${i.text.slice(0, 40)}” in the studio`}>
                  <span className="tx-say">
                    <span className={`tx-text${l.kind === "passage" ? " passage" : ""}`}>{i.text}</span>
                    <span className="tx-hint">{i.hint}</span>
                  </span>
                  <span className="tx-go" aria-hidden="true">Practise</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="tx-credit">
            {l.written_by}
            {l.source_url && <> <a href={l.source_url} target="_blank" rel="noreferrer">Source on {host(l.source_url)}<span className="sr-only"> (opens in a new tab)</span></a></>}
          </p>
        </section>
      ))}

      <p className="tx-foot">Looking for the guided exercises? They're in <a href="#/library">Exercises</a>, and today's is always waiting on <a href="#/desk">the desk</a>.</p>
    </div>
  );
}
