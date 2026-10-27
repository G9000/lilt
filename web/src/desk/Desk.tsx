import { ReactNode, useEffect, useState } from "react";
import { api, Deck } from "../api";
import { go } from "../App";
import { Icon } from "../components/bits";
import { currentLight, Light } from "../room/scene";
import { radio, useRadio } from "./lofi";
import { InboxButton, InboxState } from "./Inbox";
import { LeaveIcon, Mark, ProgressIcon, RecordingsIcon, StudioIcon, TextsIcon, TodayIcon } from "./icons";

/**
 * The small Mac inside the room's monitor: wallpaper, menu bar, widgets, one app window, a dock.
 * Every route except the room itself lives here; the route's page is the window's content.
 */

export const WINDOWS: Record<string, { title: string; width: number }> = {
  deck: { title: "Practice", width: 660 },
  guided: { title: "Guided session", width: 700 },
  practice: { title: "Exercise", width: 760 },
  review: { title: "Feedback", width: 760 },
  compare: { title: "Compare", width: 820 },
  studio: { title: "Studio", width: 820 },
  texts: { title: "Practice texts", width: 760 },
  library: { title: "Exercises", width: 760 },
  progress: { title: "Progress", width: 840 },
  history: { title: "Recordings", width: 780 },
  settings: { title: "Settings", width: 640 },
};

const LIGHT_NAME: Record<Light, string> = { morning: "Morning", day: "Afternoon", sunset: "Sunset", night: "Night" };

function useNow(ms = 15000) {
  const [now, set] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => set(new Date()), ms); return () => window.clearInterval(id); }, [ms]);
  return now;
}

type Theme = "light" | "dark";

export function Desktop({ section, page, inside, instant, theme, onTheme, recovered, inbox }: {
  section: string; page: ReactNode | null; inside: boolean; instant: boolean;
  theme: Theme; onTheme: () => void; recovered: number; inbox: InboxState;
}) {
  const now = useNow();
  const light = currentLight();
  const r = useRadio();
  const [deck, setDeck] = useState<Deck | null>(null);
  // Refresh the widgets whenever you come back to the desktop.
  const loadDeck = () => api.deck().then(setDeck, () => setDeck(null));
  useEffect(() => { if (inside) void loadDeck(); }, [inside, section]); // eslint-disable-line react-hooks/exhaustive-deps

  const win = page ? WINDOWS[section] ?? { title: "Lilt", width: 760 } : null;
  const appName = win ? win.title : "Lilt";
  const dockApp = (to: string, label: string, icon: ReactNode, on: boolean) => (
    <button className={`ds-app${on ? " on" : ""}`} onClick={() => go(to)} aria-label={label} aria-current={on ? "page" : undefined}>
      <span className="ds-tip">{label}</span>{icon}
    </button>
  );

  return (
    <div className={`ds${inside ? " in" : ""}${instant ? " instant" : ""}${page ? " app-open" : ""}`} aria-hidden={!inside} {...({ inert: inside ? undefined : "" } as object)}>
      <div className="ds-wall" style={{ backgroundImage: `url(room/room-${light}.webp)` }} />

      <header className="ds-menubar ds-boot">
        <Mark />
        <b>{appName}</b>
        <div className="ds-mr">
          {(r.playing || r.ducked) && (
            <button className="ds-np" onClick={() => void radio.toggle()} aria-label={r.playing ? `Pause ${r.mood}` : `Resume ${r.mood}`}>
              {r.playing && <span className="ds-eq" aria-hidden="true"><i /><i /><i /></span>}{r.ducked ? "Paused while the mic is on" : r.mood}
            </button>
          )}
          <InboxButton inbox={inbox} />
          <span className="ds-hide-s">{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <button className="ds-mb-btn" onClick={onTheme} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`}>{theme === "dark" ? Icon.moon : Icon.sun}</button>
          <button className="ds-mb-btn" onClick={() => go("/settings")} aria-label="Settings">{Icon.settings}</button>
          <button className="ds-leave" onClick={() => go("/")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5.5M7 8h6.5M11 5.5L13.5 8 11 10.5" /></svg>
            <span>Leave desk</span>
          </button>
        </div>
      </header>

      <section className="ds-widgets ds-boot" aria-label="Widgets">
        <TodayWidget deck={deck} light={light} reload={() => void loadDeck()} />
        <article className="ds-w ds-clock" aria-label="Time">
          <div className="ds-clock-img" style={{ backgroundImage: `url(room/room-${light}.webp)` }} />
          <div className="ds-clock-top">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 11h12M4 11a4 4 0 018 0M8 3v1.5M3.2 5.5l1 1M12.8 5.5l-1 1" /></svg>
            {LIGHT_NAME[light]}
          </div>
          <div className="ds-clock-time">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
        </article>
        <PlantWidget days={deck?.participation?.days_this_week ?? 0} />
        <RadioWidget />
      </section>

      {win && (
        <section className="ds-win" aria-label={win.title} style={{ ["--w" as string]: `${win.width}px` }} key={section}>
          <div className="ds-tb">
            <div className="ds-lights">
              <button className="ds-l1" onClick={() => go("/desk")}><span className="sr-only">Close window</span></button>
              <span className="ds-l2" aria-hidden="true" /><span className="ds-l3" aria-hidden="true" />
            </div>
            <div className="ds-title">{win.title}</div>
          </div>
          <main id="main" tabIndex={-1} className="ds-body">{page}</main>
        </section>
      )}

      <nav className="ds-dock ds-boot" aria-label="Apps">
        {dockApp("/desk", "Today", <TodayIcon date={now} />, !page || section === "deck" || section === "guided" || section === "practice" || section === "review")}
        {dockApp("/studio", "Studio", <StudioIcon />, section === "studio")}
        {dockApp("/texts", "Practice texts", <TextsIcon />, section === "texts" || section === "library")}
        {dockApp("/progress", "Progress", <ProgressIcon />, section === "progress" || section === "compare")}
        {dockApp("/history", "Recordings", <RecordingsIcon />, section === "history")}
        <span className="ds-sep" />
        {dockApp("/", "Back to the room", <LeaveIcon />, false)}
      </nav>

      {recovered > 0 && <p className="toast" role="status">Recovered {recovered} recording{recovered > 1 ? "s" : ""} from an interrupted page. They're saved and marked as interrupted.</p>}
    </div>
  );
}

const KIND: Record<string, string> = { daily: "up next", new: "new", review: "review", again: "again" };

function TodayWidget({ deck, light, reload }: { deck: Deck | null; light: Light; reload: () => void }) {
  const left = deck ? deck.items.filter((i) => !i.done_today) : [];
  const done = !!deck && (deck.all_done || left.length === 0);
  const minutes = Math.max(1, left.length);
  const stages = deck?.stages ?? 7;
  const learned = deck?.total_cards ? (deck.learned ?? 0) / deck.total_cards : 0;
  return (
    <article className="ds-w ds-today" aria-label="Today's practice">
      <div className="ds-cat" aria-hidden="true">
        <img className="tail" src={`room/cat-tail-${light}.webp`} alt="" />
        <img className="body" src={`room/cat-body-${light}.webp`} alt="" />
        <img src={`room/cat-ear-${light}.webp`} alt="" />
      </div>
      <div className="ds-t-img" style={{ backgroundImage: `url(room/room-${light}.webp)` }} />
      <svg className="ds-t-shape" viewBox="0 0 348 260" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16 Q0 0 16 0 L176 0 Q188 0 197 8 L214 24 Q222 31 234 31 L332 31 Q348 31 348 47 L348 260 L0 260 Z" /></svg>
      <div className="ds-t-body">
        <h2 className="ds-t-title">{deck?.paused ? "Resting today" : "Today's practice"}</h2>
        {!deck ? <p className="ds-t-min">Getting your cards…</p> : deck.paused ? (
          <p className="ds-t-msg">{deck.message ?? "Cards that hurt stay paused until you resume."}</p>
        ) : done ? (
          <>
            <div className="ds-t-row"><span className="ds-t-num">Done</span><span className="ds-t-min">for today</span></div>
            <p className="ds-t-msg">Next cards come back tomorrow. Anything more today is a bonus.</p>
          </>
        ) : (
          <>
            <div className="ds-t-row"><span className="ds-t-num">{left.length}<small>card{left.length === 1 ? "" : "s"}</small></span><span className="ds-t-min">about {minutes} min</span></div>
            <ul className="ds-t-list">
              {left.slice(0, 3).map((it, i) => (
                <li key={it.card.id}><i className={i === 0 ? "next" : ""} /><b>{it.card.front}</b><span>{i === 0 ? "up next" : KIND[it.kind]}</span></li>
              ))}
            </ul>
          </>
        )}
        <a className="ds-t-link" href="#/guided">Guided session with feedback</a>
        <div className="ds-t-foot">
          {deck?.paused ? <button className="ds-t-go" onClick={() => void api.resumePlan().then(reload)}>I feel fine, resume gently</button>
            : done ? <button className="ds-t-go" onClick={() => go("/studio")}>Free practice</button>
            : <button className="ds-t-go" onClick={() => go("/deck")} disabled={!deck}>{deck && left.length < deck.items.length ? "Continue" : "Start"}</button>}
          <span className="ds-t-stage">Stage {deck?.open_stage ?? 1} of {stages}<span className="ds-t-bar"><i style={{ width: `${Math.max(4, learned * 100)}%` }} /></span></span>
        </div>
      </div>
    </article>
  );
}

/** A plant that grows a leaf for each day you practised this week. It never shrinks or scolds. */
const LEAVES: [number, number, number][] = [[61, 74, -1], [60, 64, 1], [60, 54, -1], [61, 45, 1], [61, 37, -1], [61, 31, 1], [61, 27, 0]];
function PlantWidget({ days }: { days: number }) {
  return (
    <article className="ds-w ds-plant" aria-label={`Practised ${days} day${days === 1 ? "" : "s"} this week`}>
      <svg viewBox="22 14 76 94" aria-hidden="true">
        <defs><linearGradient id="ds-pot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e98a62" /><stop offset="1" stopColor="#c8623c" /></linearGradient></defs>
        <path d="M60 84 C60 66 58 50 61 30" stroke="#3f7a45" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {LEAVES.map(([x, y, side], i) => {
          const d = side === 0 ? `M${x} ${y} c-6 -8 -2 -16 0 -18 c2 2 6 10 0 18z`
            : side < 0 ? `M${x} ${y} c-10 -2 -18 -8 -20 -14 c8 -2 16 2 20 14z` : `M${x} ${y} c10 -2 18 -8 20 -14 c-8 -2 -16 2 -20 14z`;
          return i < days
            ? <path key={i} className="leaf" d={d} fill={i % 2 ? "#5aa860" : "#4b9752"} style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-i * 0.6}s` }} />
            : <path key={i} className="bud" d={d} />;
        })}
        <path d="M40 82h40l-5 24H45z" fill="url(#ds-pot)" /><rect x="37" y="78" width="46" height="8" rx="3" fill="#f0a07a" />
      </svg>
      <div className="ds-p-text"><b>{days} day{days === 1 ? "" : "s"}</b><span>this week. It grows when you practise.</span></div>
    </article>
  );
}

function RadioWidget() {
  const r = useRadio();
  return (
    <article className={`ds-w ds-radio${r.playing ? " playing" : ""}`} aria-label="Lo-fi radio">
      <div className="ds-disc" aria-hidden="true"><div className="ds-label" /></div>
      <svg className="ds-arm" viewBox="0 0 60 120" aria-hidden="true"><circle cx="46" cy="14" r="9" fill="#2c2b33" stroke="#4a4955" /><circle cx="46" cy="14" r="3.5" fill="#9b9aa8" /><path d="M46 14 L44 78 Q43 92 30 102" stroke="#c9c8d2" strokeWidth="3.2" fill="none" strokeLinecap="round" /><rect x="21" y="98" width="13" height="9" rx="2" transform="rotate(35 27 102)" fill="#e9e8ee" /></svg>
      <div className="ds-r-info">
        <span className="ds-r-k">{r.playing && <span className="ds-eq" aria-hidden="true"><i /><i /><i /></span>}{r.ducked ? "Paused while the mic is on" : r.playing ? "Now playing" : "Lo-fi radio"}</span>
        <b>{r.mood}</b>
        <span className="ds-r-sub">Made live on your desk</span>
        <div className="ds-r-ctl">
          <button className="ds-r-skip" onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
          <button className="ds-r-play" onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? "Pause lo-fi radio" : "Start lo-fi radio"}>
            {r.playing || r.ducked
              ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2.2v9H3zM6.8 1.5H9v9H6.8z" fill="currentColor" /></svg>
              : <svg viewBox="0 0 12 12" aria-hidden="true" style={{ marginLeft: 2 }}><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>}
          </button>
          <button className="ds-r-skip" onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
        </div>
      </div>
    </article>
  );
}

/** The room's menu bar, the same as the desk's: the mark, what's playing, notifications, date and time. */
export function RoomTop({ inbox }: { inbox: InboxState }) {
  const now = useNow();
  const r = useRadio();
  return (
    <header className="ds-roomtop">
      <span className="ds-rt-mark"><Mark />Lilt</span>
      <span className="ds-rt-r">
        {r.playing && <button className="ds-np" onClick={() => void radio.toggle()} aria-label={`Pause ${r.mood}`}><span className="ds-eq" aria-hidden="true"><i /><i /><i /></span>{r.mood}</button>}
        <InboxButton inbox={inbox} />
        <span className="ds-hide-s">{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
        <span>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </span>
    </header>
  );
}
