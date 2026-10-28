import { useEffect, useRef, useState } from "react";
import { api, Take, TakeStatus, Texts } from "../api";
import { loadPeaks } from "../components/AudioPlayer";
import { Icon, takeName, Toast, useToast } from "../components/bits";

/**
 * Every take, newest first, grouped by day, one row each like a voice memo: play, what it was,
 * its waveform, when, and quiet actions. Shown inside Practice.
 */

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function dayLabel(iso: string) {
  const now = new Date();
  if (iso === isoDay(now)) return "Today";
  if (iso === isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return "Yesterday";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

const clock = (utc: string) => new Date(utc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const length = (s: number | null | undefined) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

/** What a take was, in words: a free recording, the reference line, or the chapter a text belongs to. */
function takeTitle(t: Take, texts: Texts | null) {
  if (t.prompt_id === "free") return "Free recording";
  if (t.prompt_id.startsWith("ref.")) return "Reference line";
  const level = t.prompt_id.startsWith("text.") ? texts?.levels.find((l) => l.id === t.prompt_id.split(".")[1]) : null;
  return level ? level.title : takeName(t);
}

/** Only states that need your attention get a word; a saved, measured take needs none. */
const STATUS: Partial<Record<TakeStatus, string>> = { recording: "Saving…", saving: "Saving…", analysis_pending: "Measuring…", analysis_failed: "Couldn't measure" };

export function HistoryPage() {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [days, setDays] = useState(90);
  const [texts, setTexts] = useState<Texts | null>(null);
  const [toast, setToast] = useToast();
  const load = (d = days) => api.history({ days: d }).then((h) => setTakes([...h.takes].reverse()));
  useEffect(() => { void api.texts().then(setTexts, () => setTexts(null)); }, []);
  useEffect(() => { void load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups: { day: string; takes: Take[] }[] = [];
  for (const t of takes ?? []) {
    const day = t.local_date ?? t.created_utc.slice(0, 10), last = groups[groups.length - 1];
    if (last?.day === day) last.takes.push(t); else groups.push({ day, takes: [t] });
  }
  const remove = async (t: Take) => {
    if (!window.confirm("Delete this recording and its measurements? This can't be undone. Exported or backed-up copies aren't affected.")) return;
    await api.deleteTake(t.id, false);
    setToast("Recording deleted");
    void load();
  };
  const update = (t: Take) => setTakes((xs) => xs?.map((x) => (x.id === t.id ? t : x)) ?? null);

  return (
    <div className="rl">
      <header className="rl-head">
        <h1>Recordings</h1>
        <a className="rl-export" href="/api/export" download>{Icon.download}Export all</a>
        <p>Every take stays on this computer. Play any of them to hear how far you've come.</p>
      </header>
      {takes && takes.length === 0 && <p className="rl-empty">Nothing here yet. Your takes appear here as soon as you record one.</p>}
      {groups.map((g) => (
        <section key={g.day} className="rl-day" aria-labelledby={`rl-${g.day}`}>
          <h2 id={`rl-${g.day}`}>{dayLabel(g.day)}</h2>
          <ul>{g.takes.map((t) => <TakeRow key={t.id} take={t} title={takeTitle(t, texts)} onUpdate={update} onDelete={() => void remove(t)} />)}</ul>
        </section>
      ))}
      {takes && takes.length > 0 && <button className="rl-more" onClick={() => setDays((d) => d + 365)}>Show older</button>}
      <p className="rl-foot">Everything lives in Lilt's data folder as ordinary audio and JSON files, and <a href="/api/export" download>the export</a> is a full copy. Deleting a recording removes it from Lilt only; copies you've exported or backed up elsewhere stay where they are.</p>
      <Toast text={toast} />
    </div>
  );
}

function TakeRow({ take, title, onUpdate, onDelete }: { take: Take; title: string; onUpdate: (t: Take) => void; onDelete: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState(take.note ?? "");
  useEffect(() => {
    let live = true;
    void loadPeaks(take.audio_url, 64).then((p) => { if (live && p) { const max = Math.max(0.01, ...Array.from(p)); setBars(Array.from(p, (v) => 0.14 + 0.86 * (v / max))); } });
    return () => { live = false; };
  }, [take.audio_url]);
  const toggle = () => { const a = audio.current; if (a) { if (a.paused) void a.play(); else a.pause(); } };
  // Recorded WebM often carries no duration header (the browser says Infinity); the measured length stands in.
  const duration = (a: HTMLAudioElement) => (isFinite(a.duration) && a.duration > 0 ? a.duration : take.analysis_summary?.duration_s ?? 0);
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current, r = e.currentTarget.getBoundingClientRect();
    if (a && duration(a)) { a.currentTime = ((e.clientX - r.left) / r.width) * duration(a); void a.play(); }
  };
  const status = STATUS[take.status];
  const text = take.prompt_id === "free" ? null : take.prompt_text;
  return (
    <li className={`rl-row${playing ? " playing" : ""}`}>
      <button className="rl-play" onClick={toggle} aria-label={`${playing ? "Pause" : "Play"} ${title}`}>
        {playing ? <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="1.5" width="2.4" height="9" rx=".8" /><rect x="7.1" y="1.5" width="2.4" height="9" rx=".8" /></svg>
          : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 1.6l7.3 4.4-7.3 4.4z" /></svg>}
      </button>
      <div className="rl-what">
        <b>{title}{take.favourite && <span className="rl-fav" aria-label="Favourite">{Icon.star}</span>}</b>
        <span>{[text, length(take.analysis_summary?.duration_s), status].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="rl-wave" onClick={seek} aria-hidden="true">
        {(bars.length ? bars : Array(64).fill(0.14)).map((h, i, arr) => <i key={i} className={i / arr.length < pos ? "on" : ""} style={{ transform: `scaleY(${h.toFixed(3)})` }} />)}
      </div>
      <time className="rl-time" dateTime={take.created_utc}>{clock(take.created_utc)}</time>
      <div className="rl-actions">
        <button onClick={() => void api.patchTake(take.id, { favourite: !take.favourite }).then(onUpdate)} aria-pressed={take.favourite}
          aria-label={take.favourite ? "Remove from favourites" : "Add to favourites"} title="Favourite">{Icon.star}</button>
        <button onClick={() => setNoting((n) => !n)} aria-expanded={noting} aria-label="Note" title="Note">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 12.8V3.6c0-.5.4-.8.8-.8h8.4c.5 0 .8.4.8.8v6.2L10 12.8zM10 12.8V10h3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
        </button>
        <button className="danger" onClick={onDelete} aria-label="Delete recording" title="Delete">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.2c0 .4.4.8.8.8h4.2c.4 0 .8-.4.8-.8l.6-8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      {(noting || take.note) && (
        <div className="rl-note">
          {noting ? (
            <form onSubmit={(e) => { e.preventDefault(); void api.patchTake(take.id, { note }).then((t) => { onUpdate(t); setNoting(false); }); }}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What were you trying? How did it feel?" aria-label="Note" autoFocus />
              <button type="submit">Save</button>
            </form>
          ) : <p>{take.note}</p>}
        </div>
      )}
      <audio ref={audio} src={take.audio_url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }} onTimeUpdate={(e) => { const a = e.currentTarget, d = duration(a); if (d) setPos(Math.min(1, a.currentTime / d)); }} />
    </li>
  );
}
