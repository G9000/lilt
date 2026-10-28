import "../styles/data.css";
import { useEffect, useState } from "react";
import { api, AREA_LABEL, Review, Session, Take } from "../api";
import { AudioPlayer } from "../components/AudioPlayer";
import { Icon, StatusBadge, TakeFlags, takeName, Toast, useToast } from "../components/bits";

type Row = Session & { take_count: number };

const KIND_TITLE: Record<Session["kind"], string> = { full: "Guided session", check_in: "Check-in", studio: "Chapters", deck: "Practice deck" };

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function dayLabel(iso: string) {
  const now = new Date();
  if (iso === isoDay(now)) return "Today";
  if (iso === isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return "Yesterday";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

const clock = (utc: string) => new Date(utc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useToast();

  const more = async (cursor: number, reset = false) => {
    const r = await api.sessions(cursor);
    setRows((x) => reset ? r.sessions : [...x, ...r.sessions]);
    setNext(r.next_cursor);
    // The latest session opens on arrival, so its takes are one tap from playing.
    if (reset && !loaded) { setLoaded(true); const first = r.sessions.find((x) => x.take_count > 0); if (first) setOpen(first.id); }
  };
  useEffect(() => { void more(0, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const days: { day: string; sessions: Row[] }[] = [];
  rows.forEach((s) => {
    const last = days[days.length - 1];
    if (last && last.day === s.local_date) last.sessions.push(s); else days.push({ day: s.local_date, sessions: [s] });
  });

  return (
    <div className="dv rc">
      <header className="dv-head rc-head">
        <h1>Every session, kept</h1>
        <p className="dv-lede">Your recordings stay on this computer, grouped by the day you made them. Open a session to listen to its takes.</p>
        <a className="dv-link" href="/api/export" download>{Icon.download}Export everything (.zip)</a>
      </header>
      {loaded && rows.length === 0 && <p className="dv-empty">No sessions yet. Your first one starts from <a href="#/desk">Today</a>.</p>}
      {days.map((g) => (
        <section key={g.day} className="rc-day" aria-labelledby={`day-${g.day}`}>
          <h2 id={`day-${g.day}`}>{dayLabel(g.day)}</h2>
          <ul className="rc-list">
            {g.sessions.map((s) => {
              const focus = s.focus_area ? (AREA_LABEL[s.focus_area] ?? s.focus_area) : null;
              const title = focus ?? (s.kind === "full" ? "Free reading" : KIND_TITLE[s.kind]);
              const sub = [
                focus || s.kind === "full" ? KIND_TITLE[s.kind] : null,
                `${s.take_count} recording${s.take_count === 1 ? "" : "s"}`,
                s.comfort ? `felt ${s.comfort.comfort.replace("_", " ")}` : null,
                s.state === "in_progress" ? "unfinished and kept" : null,
              ].filter(Boolean).join(", ");
              const isOpen = open === s.id;
              return (
                <li key={s.id} className={isOpen ? "open" : undefined}>
                  <button className="rc-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                    <span className="rc-main">
                      <span className="rc-t">{title}</span>
                      <span className="rc-h">{sub.charAt(0).toUpperCase() + sub.slice(1)}</span>
                    </span>
                    <span className="rc-time">{clock(s.started_utc)}</span>
                    <span className="rc-chev">{Icon.chevron}</span>
                  </button>
                  {isOpen && (
                    <div className="rc-detail fade-in">
                      <SessionDetail id={s.id} onDeleted={(msg) => { setToast(msg); setOpen(null); void more(0, true); }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {next !== null && rows.length > 0 && <button className="btn-secondary rc-more" onClick={() => void more(next)}>Load more</button>}
      <details className="dv-quiet">
        <summary>Backups and deletion</summary>
        <div className="body">
          <p>Everything lives in Lilt's data folder as ordinary audio and JSON files. The export is a full copy. Keep backups somewhere safe; see the README for restoring.</p>
          <p>Deleting a recording removes the original, its analysis copy and its measurements from Lilt's data folder. Copies you've exported or backed up elsewhere need to be deleted separately.</p>
        </div>
      </details>
      <Toast text={toast} />
    </div>
  );
}

function SessionDetail({ id, onDeleted }: { id: string; onDeleted: (msg: string) => void }) {
  const [d, setD] = useState<{ session: Session; takes: Take[]; reviews: Review[] } | null>(null);
  const load = () => api.session(id).then(setD);
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="dv-loading">Loading…</p>;

  const del = async (kind: "take" | "session", targetId: string) => {
    const what = kind === "take" ? "this recording" : "this whole session";
    if (!window.confirm(`Delete ${what} and its analysis files? This can't be undone. Exported or backed-up copies are not affected.`)) return;
    const removeReviews = window.confirm("Also delete reviews from other sessions that cite it? Press Cancel to keep them, marked “evidence deleted”.");
    if (kind === "take") await api.deleteTake(targetId, removeReviews); else await api.deleteSession(targetId, removeReviews);
    onDeleted(kind === "take" ? "Recording deleted" : "Session deleted");
    if (kind === "take") void load();
  };

  const c = d.session.comfort;
  return (
    <div className="rc-inner">
      {c && (
        <p className="dv-cap">
          Comfort: {c.comfort.replace("_", " ")}{c.effort ? `, effort ${c.effort} of 5` : ""}{c.hoarseness ? ", some hoarseness" : ""}{c.note ? `. “${c.note}”` : ""}
        </p>
      )}
      {d.takes.length === 0 && <p className="dv-cap">No recordings were kept in this session.</p>}
      <ul className="rc-takes">
        {d.takes.map((t) => (
          <li key={t.id}>
            <AudioPlayer src={t.audio_url} label={takeName(t)} compact knownDuration={t.analysis_summary?.duration_s} />
            <p className="rc-prompt">{t.prompt_text}</p>
            <div className="rc-actions">
              <StatusBadge status={t.status} />
              <TakeFlags take={t} />
              {t.retry_of && <a className="dv-link" href={`#/compare?a=${t.retry_of}&b=${t.id}`}>Compare with original</a>}
              <span className="spacer" />
              <button className={`dv-mini${t.favourite ? " on" : ""}`} onClick={() => void api.patchTake(t.id, { favourite: !t.favourite }).then(load)} aria-pressed={t.favourite}>{Icon.star}Favourite</button>
              <NoteButton take={t} onSaved={load} />
              {t.status === "analysis_failed" && <button className="dv-mini" onClick={() => void api.reanalyze(t.id).then(load)}>Retry analysis</button>}
              <button className="dv-mini danger" onClick={() => void del("take", t.id)}>Delete</button>
            </div>
            {t.note && <p className="rc-note">Note: {t.note}</p>}
          </li>
        ))}
      </ul>
      {d.reviews.length > 0 && (
        <ul className="rc-reviews">
          {d.reviews.map((r) => (
            <li key={r.id}><a className="dv-link" href={`#/review/${r.id}`}>Feedback: {r.summary?.slice(0, 90) ?? r.id}…{r.evidence_deleted.length ? " (some evidence deleted)" : ""}</a></li>
          ))}
        </ul>
      )}
      <div><button className="dv-mini danger" onClick={() => void del("session", d.session.id)}>Delete session</button></div>
    </div>
  );
}

function NoteButton({ take, onSaved }: { take: Take; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(take.note ?? "");
  if (!open) return <button className="dv-mini" onClick={() => setOpen(true)}>Note</button>;
  return (
    <span className="rc-noteform">
      <input type="text" aria-label="Note" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <button className="btn-secondary" onClick={() => void api.patchTake(take.id, { note: v }).then(() => { setOpen(false); onSaved(); })}>Save</button>
    </span>
  );
}
