import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import { desktop as practice } from "../ui/desktop";
import { roomStyles } from "./roomStyles";
import { MouseEvent, ReactNode, useEffect, useRef, useState } from "react";
import { api, Deck } from "../api";
import { DEFAULT_COURSE } from "../courseIds";
import { dailyPath, flashcardsPath, guidedPath, practicePath, recordingsPath } from "../courseNavigation";
import { go } from "../App";
import { Icon } from "../components/bits";
import { currentLight, type Light, roomUrl } from "../room/scene";
import { RoomAppearance } from '../room/RoomAppearance';
import { MusicMini, MusicWindow } from "./Music";
import { openMusic } from "./musicState";
import { resetLayout } from "./Floaters";
import { InboxButton, InboxState } from "./Inbox";
import { PICTURES } from "./pictures";
import { pinnedPicture, pinPicture, shufflePicture, usePhotos, visiblePictures } from "./photos";
import { SettingsButton } from "./SettingsSheet";
import { CoursesIcon, FlashcardsIcon, LeaveIcon, PhotosIcon, Mark, RecordingsIcon, StudioIcon, TodayIcon, YarnIcon } from "./icons";

/**
 * The small Mac inside the room's monitor: wallpaper, menu bar, widgets, one app window, a dock.
 * Every route except the room itself lives here; the route's page is the window's content.
 */

export const WINDOWS: Record<string, { title: string; width: number; full?: boolean }> = {
  learn: { title: "Practice", width: 1120, full: true },
  deck: { title: "Practice", width: 1120, full: true },
  guided: { title: "Guided session", width: 700 },
  practice: { title: "Exercise", width: 760 },
  review: { title: "Feedback", width: 760 },
  compare: { title: "Compare", width: 820 },
  studio: { title: "Practice", width: 1120, full: true },
  texts: { title: "Practice texts", width: 760 },
  flashcards: { title: "Flashcards", width: 1120, full: true },
  photos: { title: "Photos", width: 960 },
  yarn: { title: "Yarn", width: 1120, full: true },
  library: { title: "Exercises", width: 760 },
  progress: { title: "Progress", width: 840, full: true },
  history: { title: "Recordings", width: 780, full: true },
  settings: { title: "Settings", width: 640 },
  courses: { title: "Courses", width: 860 },
};

const LIGHT_NAME: Record<Light, string> = { morning: "Morning", day: "Afternoon", sunset: "Sunset", night: "Night" };

function useNow(ms = 15000) {
  const [now, set] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => set(new Date()), ms); return () => window.clearInterval(id); }, [ms]);
  return now;
}

type Theme = "light" | "dark";

export function Desktop({ section, page, inside, instant, theme, onTheme, recovered, inbox, course, courseTitle, deck, reloadDeck }: {
  section: string; page: ReactNode | null; inside: boolean; instant: boolean;
  theme: Theme; onTheme: () => void; recovered: number; inbox: InboxState;
  course: string; courseTitle?: string; deck: Deck | null; reloadDeck: () => void;
}) {
  const now = useNow();
  const light = currentLight();

  const win = page ? WINDOWS[section] ?? { title: "Lilt", width: 760 } : null;
  const appName = section === "music" ? "Music" : win ? win.title : "Lilt";
  const dockApp = (to: string, label: string, icon: ReactNode, on: boolean) => (
    <button className={[`ds-app${on ? " on" : ""}`, roomStyles["ds-app"]].join(" ")} onClick={() => go(to)} aria-label={label} aria-current={on ? "page" : undefined}>
      <span className={["ds-tip", roomStyles["ds-tip"]].join(" ")}>{label}</span>{icon}
    </button>
  );

  return (
    <div className={[`ds${inside ? " in" : ""}${instant ? " instant" : ""}${page || section === "music" ? " app-open" : ""}${win?.full ? " app-full" : ""}`, roomStyles["ds"]].join(" ")} aria-hidden={!inside} {...({ inert: inside ? undefined : "" } as object)}>
      <div className={["ds-wall", roomStyles["ds-wall"]].join(" ")} style={{ backgroundImage: `url(${roomUrl(light)})` }} />

      <header className={["ds-menubar ds-boot", roomStyles["ds-menubar"], roomStyles["ds-boot"]].join(" ")}>
        <Mark />
        <b>{appName}</b>
        {courseTitle && <button className="max-w-40 truncate text-xs text-inherit" onClick={() => go("/courses")} title="Choose a course" aria-label={`Choose a course. Current course: ${courseTitle}`}>{courseTitle}</button>}
        <div className={["ds-mr", roomStyles["ds-mr"]].join(" ")}>
          <MusicMini />
          <InboxButton inbox={inbox} />
          <span className={["ds-hide-s", roomStyles["ds-hide-s"]].join(" ")}>{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className={["ds-time", roomStyles["ds-time"]].join(" ")}>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          <button className={["ds-mb-btn", roomStyles["ds-mb-btn"]].join(" ")} onClick={onTheme} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`}>{theme === "dark" ? Icon.moon : Icon.sun}</button>
          <SettingsButton />
          <button className={["ds-leave", roomStyles["ds-leave"]].join(" ")} onClick={() => go("/")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5.5M7 8h6.5M11 5.5L13.5 8 11 10.5" /></svg>
            <span>Leave desk</span>
          </button>
        </div>
      </header>

      <section className={cx(["ds-widgets ds-boot", roomStyles["ds-widgets"], roomStyles["ds-boot"]].join(" "), practice["ds-widgets"])} aria-label="Widgets">
        <TodayWidget deck={deck} reload={reloadDeck} course={course} courseTitle={courseTitle} />
      </section>

      {win && (
        <section className={cx(cx([`ds-win${win.full ? " full" : ""}`, roomStyles["ds-win"]].join(" "), practice["ds-win"]), shared["ds-win"])} aria-label={win.title} style={{ ["--w" as string]: `${win.width}px` }} key={win.full ? "full" : section}>
          <div className={cx(["ds-tb", roomStyles["ds-tb"]].join(" "), practice["ds-tb"])}>
            <div className={["ds-lights", roomStyles["ds-lights"]].join(" ")}>
              <button className={["ds-l1", roomStyles["ds-l1"]].join(" ")} onClick={() => go("/desk")}><span className={cx("sr-only", shared["sr-only"])}>Close window</span></button>
              <span className={["ds-l2", roomStyles["ds-l2"]].join(" ")} aria-hidden="true" /><span className={["ds-l3", roomStyles["ds-l3"]].join(" ")} aria-hidden="true" />
            </div>
            <div className={cx(["ds-title", roomStyles["ds-title"]].join(" "), practice["ds-title"])}>{win.title}</div>
          </div>
          <main id="main" tabIndex={-1} className={cx(["ds-body", roomStyles["ds-body"]].join(" "), practice["ds-body"])}>{page}</main>
        </section>
      )}

      <MusicWindow open={inside && section === "music"} />

      <nav className={cx(["ds-dock ds-boot", roomStyles["ds-dock"], roomStyles["ds-boot"]].join(" "), practice["ds-dock"])} aria-label="Apps">
        {/* Named for what they open. Practice texts and Progress stay reachable by link but aren't
            apps until they offer more than the chapters (and Progress has something to show). */}
        {dockApp(dailyPath(course), "Today", <TodayIcon date={now} />, (!page && section !== "music") || section === "deck" || section === "guided" || section === "practice" || section === "review")}
        {dockApp(practicePath(course), "Practice", <StudioIcon />, section === "studio" || section === "learn" || section === "texts" || section === "library")}
        {dockApp(flashcardsPath(course), "Flashcards", <FlashcardsIcon />, section === "flashcards")}
        {dockApp("/yarn", "Yarn", <YarnIcon />, section === "yarn")}
        {dockApp(recordingsPath(course), "Recordings", <RecordingsIcon />, section === "history" || section === "compare" || section === "progress")}
        {dockApp("/courses", "Courses", <CoursesIcon />, section === "courses")}
        {dockApp("/photos", "Photos", <PhotosIcon />, section === "photos")}
        <button className={[`ds-app${section === "music" ? " on" : ""}`, roomStyles["ds-app"]].join(" ")} onClick={openMusic} aria-label="Music" aria-current={section === "music" ? "page" : undefined}>
          <span className={["ds-tip", roomStyles["ds-tip"]].join(" ")}>Music</span>
          <svg viewBox="0 0 54 54" aria-hidden="true"><rect width="54" height="54" rx="12" fill="#e0643c" /><circle cx="27" cy="27" r="20" fill="#25252a" /><circle cx="27" cy="27" r="15" fill="none" stroke="#4c4c58" /><circle cx="27" cy="27" r="9" fill="#f4e5ce" /><circle cx="27" cy="27" r="2" fill="#25252a" /></svg>
        </button>
        <span className={["ds-sep", roomStyles["ds-sep"]].join(" ")} />
        {dockApp("/", "Back to the room", <LeaveIcon />, false)}
      </nav>

      {recovered > 0 && <p className={cx("toast", shared["toast"])} role="status">Recovered {recovered} recording{recovered > 1 ? "s" : ""} from an interrupted page. They're saved and marked as interrupted.</p>}
    </div>
  );
}

const KIND: Record<string, string> = { warmup: "warm-up", daily: "daily", before_after: "reference", new: "new", review: "review", again: "again", cooldown: "cool-down" };

function TodayWidget({ deck, reload, course, courseTitle }: { deck: Deck | null; reload: () => void; course: string; courseTitle?: string }) {
  const left = deck ? deck.items.filter((i) => !i.done_today) : [];
  const done = !!deck && (deck.all_done || left.length === 0);
  const minutes = Math.max(1, left.length);
  const stages = deck?.stages ?? deck?.open_stage ?? 1;
  const learned = deck?.total_cards ? (deck.learned ?? 0) / deck.total_cards : 0;
  return (
    <article className={cx(["ds-w ds-today", roomStyles["ds-w"], roomStyles["ds-today"]].join(" "), practice["ds-w"])} aria-label="Today's practice">
      <div className={["ds-t-body", roomStyles["ds-t-body"]].join(" ")}>
        <h2 className={["ds-t-title", roomStyles["ds-t-title"]].join(" ")}>{deck?.paused ? "Resting today" : "Today's practice"}</h2>
        {courseTitle && <p className="text-sm text-(--ink-2)">{courseTitle}</p>}
        {!deck ? <p className={["ds-t-min", roomStyles["ds-t-min"]].join(" ")}>Getting your cards…</p> : deck.paused ? (
          <p className={["ds-t-msg", roomStyles["ds-t-msg"]].join(" ")}>{deck.message ?? "Cards that hurt stay paused until you resume."}</p>
        ) : done ? (
          <>
            <div className={["ds-t-row", roomStyles["ds-t-row"]].join(" ")}><span className={["ds-t-num", roomStyles["ds-t-num"]].join(" ")}>{deck.all_done ? "Done" : "No cards"}</span><span className={["ds-t-min", roomStyles["ds-t-min"]].join(" ")}>for today</span></div>
            <p className={["ds-t-msg", roomStyles["ds-t-msg"]].join(" ")}>{deck.next_due ? `Next review: ${deck.next_due}.` : "You can explore a chapter whenever you like."}</p>
          </>
        ) : (
          <>
            <div className={["ds-t-row", roomStyles["ds-t-row"]].join(" ")}><span className={["ds-t-num", roomStyles["ds-t-num"]].join(" ")}>{left.length}<small>card{left.length === 1 ? "" : "s"}</small></span><span className={["ds-t-min", roomStyles["ds-t-min"]].join(" ")}>{course === DEFAULT_COURSE ? `about ${minutes} min` : "at your own pace"}</span></div>
            <ul className={["ds-t-list", roomStyles["ds-t-list"]].join(" ")}>
              {left.slice(0, 3).map((it, i) => (
                <li key={it.card.id}><i className={i === 0 ? "next" : ""} /><b>{it.card.front}</b><span>{i === 0 ? "up next" : KIND[it.kind]}</span></li>
              ))}
            </ul>
          </>
        )}
        <a className={["ds-t-link", roomStyles["ds-t-link"]].join(" ")} href={`#${guidedPath(course)}`}>{course === DEFAULT_COURSE ? "Guided session with feedback" : "Guided practice"}</a>
        <div className={["ds-t-foot", roomStyles["ds-t-foot"]].join(" ")}>
          {deck?.paused ? <button className={cx("btn-primary", shared["btn-primary"])} onClick={() => void api.resumePlan().then(reload)}>I feel fine, resume gently</button>
            : done ? <button className={cx("btn-primary", shared["btn-primary"])} onClick={() => go(practicePath(course))}>Free practice</button>
            : <button className={cx("btn-primary", shared["btn-primary"])} onClick={() => go(dailyPath(course))} disabled={!deck}>{deck && left.length < deck.items.length ? "Continue" : "Start"}</button>}
          <span className={["ds-t-stage", roomStyles["ds-t-stage"]].join(" ")}>Stage {deck?.open_stage ?? 1} of {stages}<span className={["ds-t-bar", roomStyles["ds-t-bar"]].join(" ")}><i style={{ width: `${Math.max(4, learned * 100)}%` }} /></span></span>
        </div>
      </div>
    </article>
  );
}

/** A plant that grows a leaf for each day you practised this week. It never shrinks or scolds. */
const LEAVES: [number, number, number][] = [[61, 74, -1], [60, 64, 1], [60, 54, -1], [61, 45, 1], [61, 37, -1], [61, 31, 1], [61, 27, 0]];
export function PlantWidget({ days }: { days: number }) {
  return (
    <article className={cx(["ds-w ds-plant", roomStyles["ds-w"], roomStyles["ds-plant"]].join(" "), practice["ds-w"])} aria-label={days ? `Practised ${days} day${days === 1 ? "" : "s"} this week` : "A new week: the plant grows a leaf each day you practise"}>
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
      {/* A fresh week isn't a zero: it's a sprout waiting. */}
      <div className={["ds-p-text", roomStyles["ds-p-text"]].join(" ")}>{days
        ? <><b>{days} day{days === 1 ? "" : "s"}</b><span>this week. It grows when you practise.</span></>
        : <><b>A new week</b><span>It grows a leaf each day you practise.</span></>}</div>
    </article>
  );
}

/** The time over a picture: a different photo each time you come in, or the one you picked. Click for Photos. */
export function ClockWidget() {
  const now = useNow();
  const light = currentLight();
  const { pictures: list, loaded } = usePhotos();
  const [pinned, setPinned] = useState(pinnedPicture);
  const [shownId, setShownId] = useState(() => pinned ?? shufflePicture(list));
  const [open, setOpen] = useState(false);
  // Picked or shuffled in Photos (here or in the app): follow it.
  useEffect(() => {
    const on = () => { const p = pinnedPicture(); setPinned(p); setShownId(p ?? shufflePicture(visiblePictures())); };
    window.addEventListener("lilt:clock-picture", on);
    return () => window.removeEventListener("lilt:clock-picture", on);
  }, []);
  // Once your photos are in, a picture that's gone (hidden or deleted) gives way to another.
  useEffect(() => {
    if (loaded && !list.some((p) => p.id === shownId)) setShownId(pinned && list.some((p) => p.id === pinned) ? pinned : shufflePicture(list));
  }, [loaded, list.map((p) => p.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.find((p) => p.id === shownId) ?? list[0] ?? PICTURES[0];
  // The widget drags from anywhere, so a press that moved isn't a click.
  const down = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const toggle = (e: MouseEvent) => {
    const d = down.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
    setOpen((o) => !o);
  };
  // Clicking anywhere else, or Escape, closes Photos.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className={[`ds-clockbox${open ? " open" : ""}`, roomStyles["ds-clockbox"]].join(" ")} ref={box}>
      <article className={cx(["ds-w ds-clock", roomStyles["ds-w"], roomStyles["ds-clock"]].join(" "), practice["ds-w"])} aria-label={`Time: ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}>
        <div className={["ds-clock-img", roomStyles["ds-clock-img"]].join(" ")} key={shown.id} style={{ backgroundImage: `url(${shown.url(light)})`, ...shown.clock }} />
        <button className={["ds-clock-next", roomStyles["ds-clock-next"]].join(" ")} onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }} onClick={toggle}
          aria-label={`Picture: ${shown.name}. Choose a picture`} aria-expanded={open} aria-controls="ds-photos" title="Photos" />
        <div className={["ds-clock-top", roomStyles["ds-clock-top"]].join(" ")}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 11h12M4 11a4 4 0 018 0M8 3v1.5M3.2 5.5l1 1M12.8 5.5l-1 1" /></svg>
          {LIGHT_NAME[light]}
        </div>
        <div className={["ds-clock-time", roomStyles["ds-clock-time"]].join(" ")}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
      </article>
      {open && (
        <section className={["ds-photos", roomStyles["ds-photos"]].join(" ")} id="ds-photos" aria-label="Photos" onPointerDown={(e) => e.stopPropagation()}>
          <header>
            <b>Photos</b>
            <button className={[`ds-shuffle${pinned ? "" : " on"}`, roomStyles["ds-shuffle"]].join(" ")} aria-pressed={!pinned} onClick={() => pinPicture(null)}
              title="A different photo each time you come in">
              <ShuffleIcon />Shuffle
            </button>
          </header>
          <div className={["ds-photos-grid", roomStyles["ds-photos-grid"]].join(" ")}>
            {list.map((p) => (
              <button key={p.id} className={p.id === shown.id ? "on" : undefined} onClick={() => pinPicture(p.id)} aria-pressed={p.id === pinned} title={p.name}>
                <span style={{ backgroundImage: `url(${p.url(light)})`, ...p.clock }} />
                <small>{p.name}</small>
              </button>
            ))}
          </div>
          <footer>
            <p>{pinned ? `Showing ${shown.name.toLowerCase()} every time.` : "A different photo each time you come in."}</p>
            <button className={["ds-photos-app", roomStyles["ds-photos-app"]].join(" ")} onClick={() => go("/photos")}>Open Photos</button>
          </footer>
        </section>
      )}
    </div>
  );
}

export const ShuffleIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h2.2c1.6 0 2.6.8 3.6 2.4l1.4 2.2c1 1.6 2 2.4 3.6 2.4H14M2 11.5h2.2c1 0 1.8-.3 2.5-1M9.3 5.8c.7-.8 1.5-1.3 2.5-1.3H14M12 2.5l2 2-2 2M12 9.5l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** The room's menu bar, the same as the desk's: the mark, what's playing, notifications, date and time. */
export function RoomTop({ inbox, courseTitle }: { inbox: InboxState; courseTitle?: string }) {
  const now = useNow();
  return (
    <header className={["ds-roomtop", roomStyles["ds-roomtop"]].join(" ")}>
      <span className={["ds-rt-mark", roomStyles["ds-rt-mark"]].join(" ")}><Mark />Lilt</span>
      <button className="max-w-40 truncate text-xs text-inherit" onClick={() => go("/courses")} title="Choose a course" aria-label={courseTitle ? `Choose a course. Current course: ${courseTitle}` : "Choose a course"}>{courseTitle ?? "Courses"}</button>
      <span className={["ds-rt-r", roomStyles["ds-rt-r"]].join(" ")}>
        <RoomAppearance />
        <MusicMini />
        <button className={["ds-mb-btn ds-reset", roomStyles["ds-mb-btn"], roomStyles["ds-reset"]].join(" ")} aria-label="Reset layout" title="Reset layout" onClick={resetLayout}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6a5 5 0 1 1 0 4M3 2v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className={["ds-hide-s", roomStyles["ds-hide-s"]].join(" ")}>Reset layout</span>
        </button>
        <InboxButton inbox={inbox} />
        <SettingsButton />
        <span className={["ds-hide-s", roomStyles["ds-hide-s"]].join(" ")}>{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
        <span className={["ds-time", roomStyles["ds-time"]].join(" ")}>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
      </span>
    </header>
  );
}
