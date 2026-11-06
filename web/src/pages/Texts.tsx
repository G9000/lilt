import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
import { MouseEvent, useEffect, useState } from "react";
import { api, Texts } from "../api";
import { go } from "../App";
import { DEFAULT_COURSE } from "../courseIds";
import { dailyPath, practicePath, validCourseId } from "../courseNavigation";

const host = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "the original page"; }
};

export function TextsPage({ course = DEFAULT_COURSE }: { course?: string }) {
  return <CourseTexts key={course} course={course} />;
}

function CourseTexts({ course }: { course: string }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<string>("all");
  useEffect(() => {
    let ignore = false;
    setError(null);
    if (!validCourseId(course)) { setError("This course address isn't valid."); return; }
    void api.texts(course).then(value => { if (!ignore) setTexts(value); }, (e: Error) => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [course, attempt]);
  if (error) return <div className={cx(pages.tx, "tx")}><p role="alert">{error}</p><button className={shared["btn-secondary"]} onClick={() => setAttempt(n => n + 1)}>Try again</button><p><a href="#/courses">All courses</a></p></div>;
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
        <h1>{course === DEFAULT_COURSE ? "Start small, build up" : "Practice texts"}</h1>
        <a href={`#${practicePath(course)}`}>Course home</a>
        <p>{texts.note}</p>
      </header>

      <div className={cx(cx(pages.txLevels, "segmented tx-levels"), shared["segmented"])} role="group" aria-label="Level filter">
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
                <button className={cx(pages.txRow, "tx-row")} onClick={() => go(practicePath(course, l.id, i.id))} aria-label={`Practise “${i.text.slice(0, 40)}”`}>
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
            {l.source_url && <> <a href={l.source_url} target="_blank" rel="noreferrer">Source on {host(l.source_url)}<span className={cx("sr-only", shared["sr-only"])}> (opens in a new tab)</span></a></>}
          </p>
        </section>
      ))}

      {total === 0 && <p>This course has no practice texts yet.</p>}
      <p className={cx(pages.txFoot, "tx-foot")}>{course === DEFAULT_COURSE ? <>Looking for the guided exercises? They're in <a href="#/library">Exercises</a>, and today's is always waiting on <a href="#/desk">the desk</a>.</> : <a href={`#${dailyPath(course)}`}>Today's cards</a>}</p>
    </div>
  );
}
