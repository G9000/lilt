import { ReactNode, useEffect, useState } from "react";
import { api, Deck } from "./api";
import { CardStack } from "./desk/CardStack";
import { RoomFloaters } from "./desk/Floaters";
import { Desktop, RoomTop } from "./desk/Desk";
import { NotificationCenter, useInbox } from "./desk/Inbox";
import { MicProvider } from "./components/Recording";
import { recoverPending } from "./recorder";
import { TodayPage } from "./pages/Today";
import { DeckRun } from "./pages/Deck";
import { Room } from "./room/Room";
import { PracticePage } from "./pages/Practice";
import { FeedbackPage } from "./pages/Feedback";
import { ComparePage } from "./pages/Compare";
import { ProgressPage } from "./pages/Progress";
import { HistoryPage } from "./pages/History";
import { LibraryPage } from "./pages/Library";
import { SettingsPage } from "./pages/Settings";
import { StudioPage } from "./pages/Studio";
import { TextsPage } from "./pages/Texts";

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

type Theme = "light" | "dark";
function readTheme(): Theme {
  try { return localStorage.getItem("lilt.mode") === "dark" ? "dark" : "light"; } catch { return "light"; }
}
export function applyTheme(t: Theme) {
  if (t === "light") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("lilt.mode", t); } catch { /* ignore */ }
}

const SECTIONS = new Set(["deck", "guided", "practice", "review", "compare", "studio", "texts", "progress", "history", "library", "settings"]);

export function App() {
  const [path, params] = useRoute();
  const [recovered, setRecovered] = useState(0);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const seg = path.split("/").filter(Boolean);
  const inside = seg.length > 0;
  // Opening straight onto a desktop route skips the walk to the desk.
  const [instant, setInstant] = useState(inside);
  const [deck, setDeck] = useState<Deck | null>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { void recoverPending().then(setRecovered); }, []);
  useEffect(() => { if (!inside) setInstant(false); }, [inside]);
  // The room, the inbox and the lights all follow today's deck; refresh it as you move around.
  useEffect(() => { void api.deck().then(setDeck, () => setDeck(null)); }, [inside, seg[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName)) return;
      if (e.key === "a" || e.key === "b") window.dispatchEvent(new CustomEvent("lilt:play-tag", { detail: e.key.toUpperCase() }));
      if (e.key === "Enter" && window.location.hash.replace(/^#/, "") in { "": 1, "/": 1 }) { e.preventDefault(); go("/deck"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let page: ReactNode = null;
  switch (seg[0]) {
    case "deck": page = <DeckRun first={params.get("card")} />; break;
    case "guided": page = <TodayPage recovered={0} />; break;
    case "practice": page = <PracticePage sessionId={seg[1]} />; break;
    case "review": page = <FeedbackPage reviewId={seg[1]} />; break;
    case "compare": page = <ComparePage a={params.get("a") ?? ""} b={params.get("b") ?? ""} />; break;
    case "studio": page = <StudioPage levelId={seg[1]} itemId={seg[2]} />; break;
    case "texts": page = <TextsPage />; break;
    case "progress": page = <ProgressPage />; break;
    case "history": page = <HistoryPage />; break;
    case "library": page = <LibraryPage />; break;
    case "settings": page = <SettingsPage />; break;
    default: page = null;
  }
  const section = seg[0] && SECTIONS.has(seg[0]) ? seg[0] : "desk";
  const left = deck ? deck.items.filter((i) => !i.done_today).length : null;
  const done = !!deck && !deck.paused && left === 0;
  const inbox = useInbox(deck, recovered);

  return (
    <MicProvider>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Room inside={inside} onEnter={() => go("/deck")} cards={left} done={done}>
        <RoomFloaters deck={deck} inside={inside} />
      </Room>
      <div className={inside ? "outside-leaving" : undefined} aria-hidden={inside} {...({ inert: inside ? "" : undefined } as object)}>
        <RoomTop inbox={inbox} />
        <CardStack deck={deck} onStart={(id) => go(id ? `/deck?card=${encodeURIComponent(id)}` : "/deck")} />
        <p className="ds-hint">Click the computer to start <kbd>↵</kbd></p>
      </div>
      <Desktop section={section} page={page} inside={inside} instant={instant} theme={theme}
        onTheme={() => setTheme(theme === "dark" ? "light" : "dark")} recovered={recovered} inbox={inbox} />
      <NotificationCenter inbox={inbox} />
    </MicProvider>
  );
}
