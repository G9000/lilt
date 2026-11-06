import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
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
  if (!texts) return <p className={cx(pages.txLoading, "tx-loading")}>Loading texts…</p>;

  const levels = texts.levels.filter((l) => open === "all" || l.id === open);
  const total = texts.levels.reduce((n, l) => n + l.items.length, 0);
  const pick = (e: MouseEvent<HTMLButtonElement>, id: string) => {
    setOpen(id);
    e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div className={cx(pages.tx, "tx")}>
      <header className={cx(pages.txHead, "tx-head")}>
        <h1>Start small, build up</h1>
        <p>{texts.note}</p>
      </header>

      <div className={[cx(pages.txLevels, "segmented tx-levels"), shared["segmented"]].filter(Boolean).join(' ')} role="group" aria-label="Level filter">
        <button aria-pressed={open === "all"} onClick={(e) => pick(e, "all")} aria-label={`All levels, ${total} texts`}>All</button>
        {texts.levels.map((l) => (
          <button key={l.id} aria-pressed={open === l.id} onClick={(e) => pick(e, l.id)} aria-label={`Level ${l.level}, ${l.title}, ${l.items.length} texts`}>{l.title}</button>
        ))}
      </div>

      {levels.map((l) => (
        <section key={l.id} aria-labelledby={`lv-${l.id}`} className={cx(pages.txLevel, "tx-level")}>
          <div className={cx(pages.txLevelHead, "tx-level-head")}>
            <h2 id={`lv-${l.id}`}>{l.title}</h2>
            <p>{l.subtitle}</p>
          </div>
          <ul className={cx(pages.txList, "tx-list")}>
            {l.items.map((i) => (
              <li key={i.id}>
                <button className={cx(pages.txRow, "tx-row")} onClick={() => go(`/studio/${l.id}/${i.id}`)} aria-label={`Practise “${i.text.slice(0, 40)}”`}>
                  <span className={cx(pages.txSay, "tx-say")}>
                    <span className={cx(pages.txText, `tx-text${l.kind === "passage" ? " passage" : ""}`)}>{i.text}</span>
                    <span className={cx(pages.txHint, "tx-hint")}>{i.hint}</span>
                  </span>
                  <span className={cx(pages.txGo, "tx-go")} aria-hidden="true">Practise</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={cx(pages.txCredit, "tx-credit")}>
            {l.written_by}
            {l.source_url && <> <a href={l.source_url} target="_blank" rel="noreferrer">Source on {host(l.source_url)}<span className={["sr-only", shared["sr-only"]].filter(Boolean).join(' ')}> (opens in a new tab)</span></a></>}
          </p>
        </section>
      ))}

      <p className={cx(pages.txFoot, "tx-foot")}>Looking for the guided exercises? They're in <a href="#/library">Exercises</a>, and today's is always waiting on <a href="#/desk">the desk</a>.</p>
    </div>
  );
}
