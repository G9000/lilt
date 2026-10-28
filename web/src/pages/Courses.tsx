import "../styles/courses.css";
import { ReactNode, useEffect, useState } from "react";
import { api, Course, CourseChange, CourseFiles } from "../api";
import { go } from "../App";
import { UpdatesDoc } from "./Voice";
import { KindTile, kindOf } from "../courses";
import { RemixBox } from "../components/RemixBox";

/** "3 min ago", "yesterday", or the date. */
function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return "yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** At a glance: the original, or your mixtape with how many changes; updates waiting. */
function Status({ c }: { c: Course }) {
  return (
    <span className="co-status">
      <span className={`co-pill${c.using === "mine" ? " mine" : ""}`}>{c.using === "mine" ? `Your mixtape · ${c.changes} ${c.changes === 1 ? "change" : "changes"}` : "Original"}</span>
      {c.updates_waiting > 0 && <span className="co-pill new">{c.updates_waiting} {c.updates_waiting === 1 ? "update" : "updates"}</span>}
    </span>
  );
}

/**
 * Courses (#/courses): every course in Lilt, each a folder of Markdown, and your mixtape of it
 * (your own remix, made by your AI). A course's page shows its chapters, your mixtape's history
 * with Undo, going back to the original, and updates from the original.
 */
export function CoursesPage({ id, view }: { id?: string; view?: string }) {
  if (id && view === "updates") {
    return <div className="co"><UpdatesDoc course={id} back={`#/courses/${id}`} backLabel="Back to the course" /></div>;
  }
  return id ? <CoursePage id={id} /> : <CourseList />;
}

function CourseList() {
  const [list, setList] = useState<Course[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void api.courses().then((r) => setList(r.courses), (e) => setErr(e.message)); }, []);
  return (
    <div className="co">
      <header className="co-head">
        <h1>Courses</h1>
        <p>Each course is a set of chapters to practise. Your AI can remix any of them into your own mixtape, and you can always go back to the original.</p>
      </header>
      {err && <p className="co-error" role="alert">{err}</p>}
      {list && (
        <ul className="co-list">
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => go(`/courses/${c.id}`)}>
                <KindTile kind={c.kind} />
                <span className="co-card">
                  <b>{c.title}</b>
                  <small>{kindOf(c.kind).label}{kindOf(c.kind).practice(c) ? "" : " · practice coming later"}</small>
                  <span className="co-sum">{c.summary}</span>
                  <Status c={c} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="co-note">A new course is a folder in <code>content/courses</code> with a <code>course.md</code>; see the README there.</p>
    </div>
  );
}

function CoursePage({ id }: { id: string }) {
  const m = useMixtape(id);
  if (m.err && !m.c) return <div className="co"><p className="co-error" role="alert">{m.err}</p><a href="#/courses">All courses</a></div>;
  if (!m.c) return <div className="co"><p className="co-note">Loading…</p></div>;
  const c = m.c;
  const open = kindOf(c.kind).practice(c);
  return (
    <div className="co">
      <a className="co-back" href="#/courses">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>All courses
      </a>
      <header className="co-hero">
        <KindTile kind={c.kind} size={64} />
        <div>
          <h1>{c.title}</h1>
          <p>{c.summary}</p>
          <Status c={c} />
        </div>
        {open && <button className="btn-primary" onClick={() => go(open)}>Practise</button>}
      </header>
      <MixtapeSections m={m} updatesHref={`/courses/${id}/updates`} />
    </div>
  );
}

/** A course, your mixtape of it (its files and history), and the actions on it. */
export function useMixtape(id: string, onChange?: () => void) {
  const [c, setC] = useState<Course | null>(null);
  const [files, setFiles] = useState<CourseFiles | null>(null);
  const [changes, setChanges] = useState<CourseChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const load = async () => {
    const [all, f, h] = await Promise.all([api.courses(), api.courseFiles(id), api.courseHistory(id)]);
    setC(all.courses.find((x) => x.id === id) ?? null); setFiles(f); setChanges(h.changes);
  };
  useEffect(() => { void load().catch((e) => setErr(e.message)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // A remix from the Remix chat changed it: read it again.
  useEffect(() => {
    const on = () => void load().catch(() => {});
    window.addEventListener("lilt:texts-changed", on);
    return () => window.removeEventListener("lilt:texts-changed", on);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (f: () => Promise<string>) => {
    setBusy(true); setErr(null); setSaid(null);
    try { setSaid(await f()); await load(); onChange?.(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const undo = () => run(async () => { const r = await api.undoSyllabus(id); return r.using === "original" ? "Undone. You're back on the original." : "Undone."; });
  const reset = () => run(async () => { await api.resetCourse(id, "Went back to the original"); return "You're on the original again. Your mixtape is in the history, so Undo brings it back."; });
  const reload = () => { void load().then(() => onChange?.()); };
  return { id, c, files, changes, busy, err, said, undo, reset, reload };
}
type Mixtape = ReturnType<typeof useMixtape>;

/**
 * Your mixtape of a course, the same in Courses and in Practice: updates from the original, whether
 * you're playing the original or your mixtape (and going back), its history with Undo, its chapters,
 * and how to change it with your AI.
 */
export function MixtapeSections({ m, updatesHref, remix: remixSlot }: { m: Mixtape; updatesHref: string; remix?: ReactNode }) {
  const [confirm, setConfirm] = useState(false);
  const { c, files, changes, busy } = m;
  if (!c || !files || !changes) return <p className="co-note">Loading…</p>;
  const chapters = files.files.filter((f) => f.chapter_id);
  const mine = c.using === "mine";
  const latest = changes[0];
  const remix = remixSlot ?? (
      <section className="co-sec">
        <h2>Remix it</h2>
        <RemixBox course={c.id} onDone={m.reload} />
        <p className="co-note">Using Claude Desktop or Claude Code instead? Ask it the same thing; it lands here too.</p>
      </section>
  );
  return (
    <>
      {m.said && <p className="co-said" role="status">{m.said}</p>}
      {m.err && <p className="co-error" role="alert">{m.err}</p>}

      {c.updates_waiting > 0 && (
        <section className="co-callout">
          <div><b>The original has {c.updates_waiting} {c.updates_waiting === 1 ? "update" : "updates"} for your mixtape</b><p>Changes to things you haven't touched come straight in; where you both changed something, you choose.</p></div>
          <button className="btn-primary" onClick={() => go(updatesHref)}>Review updates</button>
        </section>
      )}

      <section className="co-sec">
        <h2>Now playing</h2>
        <div className="co-box">
          <div className="co-row">
            <div>
              <b>{mine ? "Your mixtape" : "The original"}</b>
              <p>{mine ? `${c.changes} ${c.changes === 1 ? "change" : "changes"} so far. The original stays as it is.` : "Remix anything and Lilt makes your own copy first: your mixtape. The original stays as it is."}</p>
            </div>
            {mine && !confirm && <button className="btn-secondary" onClick={() => setConfirm(true)} disabled={busy}>Go back to the original</button>}
          </div>
          {confirm && (
            <div className="co-row co-confirm">
              <p>Go back to the original? Your mixtape is kept in the history, so you can undo this.</p>
              <span className="co-actions"><button className="btn-primary" onClick={() => { setConfirm(false); void m.reset(); }} disabled={busy}>Go back</button><button className="btn-secondary" onClick={() => setConfirm(false)}>Cancel</button></span>
            </div>
          )}
        </div>
      </section>

      {!mine && remix}

      <section className="co-sec">
        <div className="co-sec-head">
          <h2>History</h2>
          {latest && <button className="btn-secondary co-small" onClick={() => void m.undo()} disabled={busy} title={`Undo “${latest.note}”`}>Undo last change</button>}
        </div>
        {changes.length === 0 ? (
          <div className="co-box"><div className="co-row"><p>No changes yet. Each change your AI makes shows up here with its note, and can be undone.</p></div></div>
        ) : (
          <ol className="co-box co-history">
            {changes.map((h) => (
              <li key={h.change} className="co-row">
                <div>
                  <b>{h.note}</b>
                  <p>{ACTION[h.action] ?? h.action}{h.file ? ` · ${h.file}` : ""}</p>
                </div>
                <time dateTime={h.time}>{ago(h.time)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="co-sec">
        <h2>Chapters</h2>
        <ol className="co-box co-chapters">
          {chapters.map((f, i) => (
            <li key={f.file} className="co-row">
              <span className="co-n">{i + 1}</span>
              <div><b>{f.title}</b><p>{f.texts} {f.texts === 1 ? "text" : "texts"}</p></div>
              {f.status !== "same" && <span className={`co-pill ${f.status === "added" ? "new" : "mine"}`}>{f.status === "added" ? "Added" : "Remixed"}</span>}
            </li>
          ))}
        </ol>
        {files.removed_from_original.length > 0 && <p className="co-note">Left out of your mixtape: {files.removed_from_original.join(", ")}.</p>}
      </section>

      {mine && remix}

    </>
  );
}

const ACTION: Record<string, string> = { write: "Remixed", remix: "Remixed", delete: "Removed a chapter", update: "Brought in updates", reset: "Went back to the original" };
