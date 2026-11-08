import { cx } from "./ui/cx";
import { shared } from "./ui/shared";
import './accent';
import { openSettings, SettingsSheet } from "./desk/SettingsSheet";
import { lazy, ReactNode, useEffect, useRef, useState } from "react";
import { Deferred } from "./components/Deferred";
import { api, Course, Deck } from "./api";
import { DEFAULT_COURSE } from "./courseIds";
import { dailyPath, guidedPath, practicePath, recordingsPath, rememberCourse, routeCourse, routeSegments, savedCourse } from "./courseNavigation";
import { CardStack } from "./desk/CardStack";
import { RoomFloaters } from "./desk/Floaters";
import { Desktop, RoomTop } from "./desk/Desk";
import { NotificationCenter, useInbox } from "./desk/Inbox";
import { MicProvider } from "./components/Microphone";
import { recoverPending } from "./recorder";
import { micInUse } from "./micuse";
import { Room } from "./room/Room";
const CoursesPage = lazy(() => import("./pages/Courses").then(m => ({ default: m.CoursesPage })));
const CoursePracticePage = lazy(() => import("./pages/CoursePractice").then(m => ({ default: m.CoursePracticePage })));
const CourseGuidedPage = lazy(() => import("./pages/CourseRecording").then(m => ({ default: m.CourseGuidedPage })));
const CourseRecordingsPage = lazy(() => import("./pages/CourseRecording").then(m => ({ default: m.CourseRecordingsPage })));
const TodayPage = lazy(() => import("./pages/Today").then(m => ({ default: m.TodayPage })));
const PracticePage = lazy(() => import("./pages/Practice").then(m => ({ default: m.PracticePage })));
const FeedbackPage = lazy(() => import("./pages/Feedback").then(m => ({ default: m.FeedbackPage })));
const ComparePage = lazy(() => import("./pages/Compare").then(m => ({ default: m.ComparePage })));
const LibraryPage = lazy(() => import("./pages/Library").then(m => ({ default: m.LibraryPage })));
const VoicePage = lazy(() => import("./pages/Voice").then(m => ({ default: m.VoicePage })));
const TextsPage = lazy(() => import("./pages/Texts").then(m => ({ default: m.TextsPage })));
const FlashcardsPage = lazy(() => import("./pages/Flashcards").then(m => ({ default: m.FlashcardsPage })));
const PhotosPage = lazy(() => import("./pages/Photos").then(m => ({ default: m.PhotosPage })));
const YarnPage = lazy(() => import("./pages/Yarn").then(m => ({ default: m.YarnPage })));

export function useRoute(): [string, URLSearchParams] {
  const read = () => {
    const h = window.location.hash.replace(/^#/, "") || "/";
    const [path, qs] = h.split("?");
    return [path, new URLSearchParams(qs ?? "")] as [string, URLSearchParams];
  };
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => { setR(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}

export const go = (path: string) => { window.location.hash = path; };

export type Theme = "light" | "dark";
/** What you chose: a fixed theme, or "auto" to follow your computer's light or dark setting (the default). */
export type ThemeMode = Theme | "auto";
export function readThemeMode(): ThemeMode {
  // A new key: the old "lilt.mode" was written on every visit, so it can't tell a choice from a default.
  try { const v = localStorage.getItem("lilt.theme"); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; }
}
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const resolveTheme = (m: ThemeMode): Theme => (m === "auto" ? (systemDark() ? "dark" : "light") : m);
/** How big text is across Lilt's pages, kept in this browser. */
export type TextSize = "smaller" | "default" | "larger" | "largest";
export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: "smaller", label: "Smaller" }, { id: "default", label: "Default" }, { id: "larger", label: "Larger" }, { id: "largest", label: "Largest" },
];
export function readTextSize(): TextSize {
  try { const v = localStorage.getItem("lilt.text"); return TEXT_SIZES.some((s) => s.id === v) ? (v as TextSize) : "default"; } catch { return "default"; }
}
export function applyTextSize(t: TextSize) {
  if (t === "default") document.documentElement.removeAttribute("data-text");
  else document.documentElement.setAttribute("data-text", t);
  try { localStorage.setItem("lilt.text", t); } catch { /* private mode: default next time */ }
}
applyTextSize(readTextSize());

export function applyTheme(t: Theme) {
  if (t === "light") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}
// Before the first render, so a dark computer never flashes the light theme.
applyTheme(resolveTheme(readThemeMode()));

const SECTIONS = new Set(["learn", "deck", "flashcards", "photos", "yarn", "guided", "practice", "review", "compare", "studio", "texts", "progress", "history", "library", "settings", "courses", "music"]);

export function App() {
  const [path, params] = useRoute();
  const [recovered, setRecovered] = useState(0);
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(mode));
  const seg = routeSegments(path);
  const inside = seg.length > 0 && seg[0] !== 'music';
  // Opening straight onto a desktop route skips the walk to the desk.
  const [instant, setInstant] = useState(inside);
  const [remembered, setRemembered] = useState(savedCourse);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const explicitCourse = routeCourse(path, params);
  const course = explicitCourse ?? (courses && !courses.some((c) => c.id === remembered) ? DEFAULT_COURSE : remembered);
  const courseTitle = courses?.find((c) => c.id === course)?.title;
  const [deckResult, setDeckResult] = useState<{ course: string; deck: Deck } | null>(null);
  const deck = deckResult?.course === course ? deckResult.deck : null;
  const [deckRevision, refreshDeck] = useState(0);
  useEffect(() => {
    if (seg[0] !== "learn" || seg[1] !== DEFAULT_COURSE) return;
    const to = seg[2] === "today" ? dailyPath(DEFAULT_COURSE, params.get("card"))
      : seg[2] === "recordings" ? recordingsPath(DEFAULT_COURSE)
      : seg[2] === "guided" ? guidedPath(DEFAULT_COURSE)
      : seg[2] === "practice" && seg[3] ? `/practice/${encodeURIComponent(seg[3])}`
      : practicePath(DEFAULT_COURSE, seg[2] === "chapter" ? seg[3] : undefined, seg[4]);
    window.location.replace(`#${to}`);
  }, [path]); // The built-in voice course always uses its recording and comfort flow.
  useEffect(() => {
    let ignore = false;
    void api.courses().then((r) => { if (!ignore) setCourses(r.courses); }, () => {});
    return () => { ignore = true; };
  }, [inside, seg[0]]); // Refresh when returning from course changes.
  useEffect(() => {
    if (!courses?.some((c) => c.id === course)) return;
    setRemembered(course); rememberCourse(course);
  }, [course, courses]);
  useEffect(() => {
    const changed = () => refreshDeck((n) => n + 1);
    window.addEventListener("lilt:deck-changed", changed);
    return () => window.removeEventListener("lilt:deck-changed", changed);
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme]);
  // Remember the choice; on Auto, follow the computer as it switches between light and dark.
  useEffect(() => {
    try { localStorage.removeItem("lilt.mode"); if (mode === "auto") localStorage.removeItem("lilt.theme"); else localStorage.setItem("lilt.theme", mode); } catch { /* private mode: auto next time */ }
    window.dispatchEvent(new CustomEvent("lilt:theme-mode", { detail: mode }));
    setTheme(resolveTheme(mode));
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setTheme(mq.matches ? "dark" : "light");
    // The change event covers a switch while you watch; coming back to the tab catches one made away.
    const back = () => { if (document.visibilityState === "visible") on(); };
    mq.addEventListener("change", on);
    window.addEventListener("focus", on);
    document.addEventListener("visibilitychange", back);
    return () => { mq.removeEventListener("change", on); window.removeEventListener("focus", on); document.removeEventListener("visibilitychange", back); };
  }, [mode]);
  // A link to #/settings or #/settings/ai (where ChatGPT sign-in returns) opens Settings over the room.
  useEffect(() => { if (seg[0] === "settings") { window.location.replace("#/"); openSettings(seg[1] === "ai" ? "ai" : undefined); } }, [seg[0], seg[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  // Settings changes the theme too.
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("lilt:theme", on);
    return () => window.removeEventListener("lilt:theme", on);
  }, []);
  useEffect(() => { void recoverPending().then(setRecovered); }, []);
  useEffect(() => { if (!inside) setInstant(false); }, [inside]);
  // The room, the inbox and the lights all follow today's deck; refresh it as you move around.
  useEffect(() => {
    let ignore = false;
    void api.deck(course).then((deck) => { if (!ignore) setDeckResult({ course, deck }); }, () => { if (!ignore) setDeckResult(null); });
    return () => { ignore = true; };
  }, [inside, path, course, deckRevision]);
  // Until your first take, sitting down opens Find your starting voice (your Day 1), not Today; Home
  // and the desk's Today widget offer the same first step.
  const [needsStart, setNeedsStart] = useState(false);
  useEffect(() => {
    let ignore = false;
    setNeedsStart(false);
    if (course === DEFAULT_COURSE) void api.history({ days: 3650 }).then((h) => { if (!ignore) setNeedsStart(h.takes.length === 0); }, () => {});
    return () => { ignore = true; };
  }, [inside, course]);
  const sitDown = useRef(() => go("/deck"));
  sitDown.current = () => go(course === DEFAULT_COURSE && needsStart ? "/studio/start" : dailyPath(course));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      // Not when something focused already handled the key (a sticky note, the pile), or takes typing.
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName)
        || el.isContentEditable || el.matches?.("[role=button], [role=textbox], [role=slider], [role=switch], [role=checkbox]")) return;
      // A/B playback never during a take or a live pitch reading.
      if ((e.key === "a" || e.key === "b") && !micInUse()) window.dispatchEvent(new CustomEvent("lilt:play-tag", { detail: e.key.toUpperCase() }));
      if (e.key === "Enter" && window.location.hash.replace(/^#/, "") in { "": 1, "/": 1 }) { e.preventDefault(); sitDown.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let page: ReactNode = null;
  switch (seg[0]) {
    case "learn": page = seg[1] === DEFAULT_COURSE ? <p role="status">Opening voice practice…</p>
      : seg[2] === "recordings" ? <CourseRecordingsPage key={seg[1]} course={seg[1] ?? ""} />
      : seg[2] === "guided" || seg[2] === "practice" ? <CourseGuidedPage key={`${seg[1]}/${seg[3] ?? "new"}`} course={seg[1] ?? ""} sessionId={seg[2] === "practice" ? seg[3] : undefined} promptId={params.get("prompt") ?? undefined} />
      : <CoursePracticePage key={seg[1]} course={seg[1] ?? ""} view={seg[2]} chapter={seg[3]} item={seg[4]} first={params.get("card")} />; break;
    case "deck": page = <VoicePage doc="today" first={params.get("card")} />; break;
    case "guided": page = <TodayPage recovered={0} />; break;
    case "practice": page = <PracticePage sessionId={seg[1]} />; break;
    case "review": page = <FeedbackPage reviewId={seg[1]} />; break;
    case "compare": page = <ComparePage a={params.get("a") ?? ""} b={params.get("b") ?? ""} />; break;
    case "studio": page = seg[1] === "start" ? <VoicePage doc="start" /> : seg[1] === "updates" ? <VoicePage doc="updates" /> : seg[1] === "mixtape" ? <VoicePage doc="mixtape" /> : seg[1] === "settings" ? <VoicePage doc="settings" /> : seg[1] === "free" ? <VoicePage doc="free" /> : seg[1] === "chapters" ? <VoicePage doc="chapters" /> : seg[1] ? <VoicePage doc="chapter" levelId={seg[1]} itemId={seg[2]} /> : <VoicePage doc="home" />; break;
    case "flashcards": page = <FlashcardsPage key={course} course={course} chapter={seg[1]} />; break;
    case "photos": page = <PhotosPage />; break;
    case "yarn": page = <YarnPage />; break;
    case "texts": page = <TextsPage key={course} course={course} />; break;
    case "progress": page = <VoicePage doc="progress" />; break;
    case "history": page = <VoicePage doc="recordings" text={params.get("text")} />; break;
    case "library": page = <LibraryPage />; break;
    case "courses": page = <CoursesPage id={seg[1]} view={seg[2]} />; break;
    case "settings": page = null; break;
    default: page = null;
  }
  const section = seg[0] === "learn" && seg[2] === "recordings" ? "history"
    : seg[0] === "learn" && seg[2] === "guided" ? "guided"
    : seg[0] === "learn" && seg[2] === "practice" ? "practice"
    : seg[0] && SECTIONS.has(seg[0]) ? seg[0] : "desk";
  const left = deck ? deck.items.filter((i) => !i.done_today).length : null;
  const done = !!deck && !deck.paused && !!deck.all_done;
  const inbox = useInbox(deck, recovered, course);

  return (
    <MicProvider>
      <a className={cx("skip", shared["skip"])} href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Room inside={inside} onEnter={() => sitDown.current()} cards={left} done={done} days={deck?.participation?.days_this_week ?? 0}>
        <RoomFloaters key={course} deck={deck} inside={inside} course={course} />
      </Room>
      <div className={inside ? "outside-leaving" : undefined} aria-hidden={inside} {...({ inert: inside ? "" : undefined } as object)}>
        <RoomTop inbox={inbox} courseTitle={courseTitle} />
        <CardStack key={course} course={course} deck={deck} onStart={(id) => go(dailyPath(course, id))} />
      </div>
      <Desktop section={section} page={page && <Deferred resetKey={path}>{page}</Deferred>} inside={inside} instant={instant} theme={theme}
        onTheme={() => setMode(theme === "dark" ? "light" : "dark")} recovered={recovered} inbox={inbox}
        course={course} courseTitle={courseTitle} deck={deck} reloadDeck={() => refreshDeck((n) => n + 1)} needsStart={course === DEFAULT_COURSE && needsStart} />
      <NotificationCenter inbox={inbox} />
      <SettingsSheet />
    </MicProvider>
  );
}
