import "../styles/courses.css";
import { useEffect, useState } from "react";
import { api, Course, CourseChange, CourseFiles } from "../api";
import { go } from "../App";
import { UpdatesDoc } from "./Voice";
import { openSettings } from "../desk/SettingsSheet";
import { KindTile, kindOf } from "../courses";

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

/** Your copy at a glance: original, or yours with how many changes; updates waiting. */
function Status({ c }: { c: Course }) {
  return (
    <span className="co-status">
      <span className={`co-pill${c.using === "mine" ? " mine" : ""}`}>{c.using === "mine" ? `Your copy · ${c.changes} ${c.changes === 1 ? "change" : "changes"}` : "Original"}</span>
      {c.updates_waiting > 0 && <span className="co-pill new">{c.updates_waiting} {c.updates_waiting === 1 ? "update" : "updates"}</span>}
    </span>
  );
}

/**
 * Courses (#/courses): every course in Lilt, each a folder of Markdown, and your own copy of it.
 * A course's page shows what's in it, your copy's history with Undo, going back to the original,
 * and updates from the original; your AI makes the changes.
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
        <p>Each course is a set of chapters to practise. Your AI can make your own copy of any of them, and you can always go back to the original.</p>
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
  const [c, setC] = useState<Course | null>(null);
  const [files, setFiles] = useState<CourseFiles | null>(null);
  const [changes, setChanges] = useState<CourseChange[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const load = async () => {
    const [all, f, h] = await Promise.all([api.courses(), api.courseFiles(id), api.courseHistory(id)]);
    setC(all.courses.find((x) => x.id === id) ?? null); setFiles(f); setChanges(h.changes);
  };
  useEffect(() => { void load().catch((e) => setErr(e.message)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (f: () => Promise<string>) => {
    setBusy(true); setErr(null); setSaid(null);
    try { setSaid(await f()); await load(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); setConfirm(false); }
  };
  const undo = () => run(async () => { const r = await api.undoSyllabus(id); return r.using === "original" ? "Undone. You're back on the original." : "Undone."; });
  const reset = () => run(async () => { await api.resetCourse(id, "Went back to the original from Courses"); return "You're on the original again. Your copy is in the history, so Undo brings it back."; });

  if (err && !c) return <div className="co"><p className="co-error" role="alert">{err}</p><a href="#/courses">All courses</a></div>;
  if (!c || !files || !changes) return <div className="co"><p className="co-note">Loading…</p></div>;
  const chapters = files.files.filter((f) => f.chapter_id);
  const open = kindOf(c.kind).practice(c);
  const mine = c.using === "mine";
  const latest = changes[0];
  const examples = c.kind === "voice"
    ? ["Make the warm-ups shorter and gentler.", "Add a chapter of phone-call phrases.", "What's different from the original?"]
    : [`Make ${c.title} easier for a beginner.`, "Add a chapter for ordering food.", "What's different from the original?"];

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

      {said && <p className="co-said" role="status">{said}</p>}
      {err && <p className="co-error" role="alert">{err}</p>}

      {c.updates_waiting > 0 && (
        <section className="co-callout">
          <div><b>The original has {c.updates_waiting} {c.updates_waiting === 1 ? "update" : "updates"} for your copy</b><p>Changes to things you haven't touched come straight in; where you both changed something, you choose.</p></div>
          <button className="btn-primary" onClick={() => go(`/courses/${id}/updates`)}>Review updates</button>
        </section>
      )}

      <section className="co-sec">
        <h2>Your copy</h2>
        <div className="co-box">
          <div className="co-row">
            <div>
              <b>{mine ? "You're using your own copy" : "You're using the original"}</b>
              <p>{mine ? `${c.changes} ${c.changes === 1 ? "change" : "changes"} so far. The original stays as it is.` : "Your AI makes your own copy the first time it changes something."}</p>
            </div>
            {mine && !confirm && <button className="btn-secondary" onClick={() => setConfirm(true)} disabled={busy}>Go back to the original</button>}
          </div>
          {confirm && (
            <div className="co-row co-confirm">
              <p>Go back to the original? Your copy is kept in the history, so you can undo this.</p>
              <span className="co-actions"><button className="btn-primary" onClick={() => void reset()} disabled={busy}>Go back</button><button className="btn-secondary" onClick={() => setConfirm(false)}>Cancel</button></span>
            </div>
          )}
        </div>
      </section>

      <section className="co-sec">
        <div className="co-sec-head">
          <h2>History</h2>
          {latest && <button className="btn-secondary co-small" onClick={() => void undo()} disabled={busy} title={`Undo “${latest.note}”`}>Undo last change</button>}
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
              {f.status !== "same" && <span className={`co-pill ${f.status === "added" ? "new" : "mine"}`}>{f.status === "added" ? "Yours" : "Changed"}</span>}
            </li>
          ))}
        </ol>
        {files.removed_from_original.length > 0 && <p className="co-note">Not in your copy: {files.removed_from_original.join(", ")}.</p>}
      </section>

      <section className="co-sec">
        <h2>Change it with your AI</h2>
        <div className="co-box">
          <div className="co-row"><div><p>Ask an assistant connected to Lilt, naming this course, for example:</p><ul className="co-examples">{examples.map((x) => <li key={x}>“{x}”</li>)}</ul></div></div>
          {c.locked_sections.length > 0 && <div className="co-row"><p>Your AI can't change {c.locked_sections.map((s) => `“${s}”`).join(", ")}.</p></div>}
          <div className="co-row"><p>Not connected yet?</p><button className="btn-secondary co-small ss-open" onClick={() => openSettings("ai")}>AI connections</button></div>
        </div>
      </section>
    </div>
  );
}

const ACTION: Record<string, string> = { write: "Changed", delete: "Removed a chapter", update: "Brought in updates", reset: "Went back to the original" };
