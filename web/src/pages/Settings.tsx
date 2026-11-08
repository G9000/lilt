import { shared } from "../ui/shared";
import { pages } from "../ui/pages";
import { cx } from "../ui/cx";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, Profile, TextItem } from "../api";
import { idLabel } from "../chapters";
import { applyTextSize, readTextSize, readThemeMode, TEXT_SIZES, type TextSize, type ThemeMode } from "../App";
import { AccentPicker } from '../components/AccentPicker';
import { Callout } from "../components/bits";
import { ConnectAI } from "../components/ConnectAI";
import { playSound, setSounds, soundsOn } from "../sounds";
import { isDesktop, openAppUpdates, useDesktopUpdate } from "../useDesktopUpdate";
import { updateStatus } from "../desktopUpdate";
import { CURRENT } from "../release";
import { BackupSettings } from "../components/BackupSettings";
import { DirectionChoice } from "../components/DirectionChoice";
import { announceDirection, directionOf, DIRECTIONS } from "../direction";
import { StorageSettings } from "../components/StorageSettings";
import { openSettings } from "../desk/SettingsSheet";
import { computerZone, zoneCity, zoneGroups, zoneLabel, zoneNow } from "../timezone";

const ZONES = [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])];

/** The time zone by place and offset, the time there now, and this computer's zone a click away. */
function TimeZoneChoice({ value, onChange }: { value: string; onChange: (zone: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 20_000); return () => window.clearInterval(id); }, []);
  const groups = useMemo(() => zoneGroups(ZONES.includes(value) ? ZONES : [value, ...ZONES], new Date()), [value]);
  const here = computerZone();
  return (
    <>
      <Row label="Time zone" htmlFor="tz" help="Your practice day starts at midnight here, and reminders keep its clock.">
        <select id="tz" value={value} onChange={(e) => onChange(e.target.value)}>
          {groups.map((g) => <optgroup key={g.region} label={g.region}>{g.zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</optgroup>)}
        </select>
      </Row>
      <Row label="Time there now"><span className="tabular-nums">{zoneNow(value, now)}</span></Row>
      {here && here !== value && ZONES.includes(here) && (
        <Row label="This computer" help={`${zoneLabel(here, now)}. Worth switching if you've moved or you're away for a while.`}>
          <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={() => onChange(here)}>Use {zoneCity(here)}</button>
        </Row>
      )}
    </>
  );
}

/** Auto (follow the computer), light or dark, kept in step with the menu bar's button. */
function ThemeChoice() {
  const [m, setM] = useState<ThemeMode>(readThemeMode);
  useEffect(() => {
    const on = (e: Event) => setM((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("lilt:theme-mode", on);
    return () => window.removeEventListener("lilt:theme-mode", on);
  }, []);
  return (
    <div className={cx("segmented", shared["segmented"])} role="group" aria-label="Theme">
      {(["auto", "light", "dark"] as const).map((x) => (
        <button key={x} aria-pressed={m === x} onClick={() => window.dispatchEvent(new CustomEvent("lilt:theme", { detail: x }))}>{x === "auto" ? "Auto" : x === "light" ? "Light" : "Dark"}</button>
      ))}
    </div>
  );
}

/** Text size for the reading pages: applied at once and kept in this browser. */
function TextSizeChoice() {
  const [t, setT] = useState<TextSize>(readTextSize);
  return (
    <div className={cx("segmented", shared["segmented"])} role="group" aria-label="Text size">
      {TEXT_SIZES.map((x) => (
        <button key={x.id} aria-pressed={t === x.id} onClick={() => { applyTextSize(x.id); setT(x.id); }}>{x.label}</button>
      ))}
    </div>
  );
}

/** Soft paper sounds, off by default; turning them on plays the chime so you hear what they're like. */
function SoundsChoice() {
  const [on, setOn] = useState(soundsOn);
  const choose = (v: boolean) => { setSounds(v); setOn(v); if (v) playSound("chime", true); };
  return (
    <div className={cx("segmented", shared["segmented"])} role="group" aria-label="Soft sounds">
      <button aria-pressed={!on} onClick={() => choose(false)}>Off</button>
      <button aria-pressed={on} onClick={() => choose(true)}>On</button>
    </div>
  );
}

type PaneId = "appearance" | "ai" | "notifications" | "time" | "privacy" | "backups" | "updates" | "storage" | "about";

/** Each pane: its sidebar icon and words to search by. */
const PANES: { id: PaneId; title: string; words: string; glyph: ReactNode }[] = [
  { id: "appearance", title: "Appearance", words: "theme dark light mode accent color colour picker orange text size font bigger smaller sound sounds audio chime quiet",
    glyph: <><circle cx="10" cy="10" r="6" /><path d="M10 4a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" /></> },
  { id: "ai", title: "AI connections", words: "ai claude chatgpt mcp connect agent assistant desktop code tunnel",
    glyph: <path d="M10 3l1.5 4 4 1.5-4 1.5L10 14l-1.5-4-4-1.5 4-1.5zM15 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" /> },
  { id: "notifications", title: "Notifications", words: "notification notifications alert bell browser reminder",
    glyph: <path d="M6 13.5V9a4 4 0 0 1 8 0v4.5l1 1.2H5zM8.6 16.2a1.6 1.6 0 0 0 2.8 0" /> },
  { id: "time", title: "Date & time", words: "time zone timezone date clock",
    glyph: <><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.6" /></> },
  { id: "privacy", title: "Privacy", words: "privacy data processing cloud local",
    glyph: <path d="M10 3.5l5.5 2v4c0 3.4-2.3 6-5.5 7-3.2-1-5.5-3.6-5.5-7v-4z" /> },
  { id: "updates", title: "Updates", words: "updates version download install restart mac desktop",
    glyph: <><path d="M15.6 7A6 6 0 1 0 16 11M15.6 3.5V7H12" /><path d="M10 13V7m-2 2 2-2 2 2" /></> },
  { id: "backups", title: "Backup & restore", words: "backup restore data export import zip recovery copy recordings",
    glyph: <><path d="M4 8h12v8H4zM3 4h14v4H3zM8 11h4" /></> },
  { id: "storage", title: "Storage", words: "storage space size disk files folder recordings photos backups reset delete erase fresh",
    glyph: <><path d="M5 4h10l2 8v4H3v-4zM3 12h14M6 14h.01M9 14h.01" /></> },
  { id: "about", title: "About Lilt", words: "about version credits artwork art artist illustrator illustration drawing ai generated who made solo developer github help contribute",
    glyph: <><circle cx="10" cy="10" r="6.5" /><path d="M10 9.2v4M10 6.6h.01" /></> },
];

const ISSUES = "https://github.com/G9000/lilt/issues";

/** Who makes Lilt and how: one person, AI-generated artwork said plainly, and an open door for artists. */
function About({ onAI }: { onAI: () => void }) {
  return (
    <div className={cx(pages.sxGroup, "sx-group")}>
      <Row label="Version"><span>Lilt {CURRENT.version}</span></Row>
      <Row label="Made by one person" help="Lilt is a one-person project with no budget, made to be a calm, private place to practise." />
      <Row label="The artwork" help="The room, its objects and the cat were made with an AI image generator, because hiring an illustrator isn't possible right now. The code was written with help from AI coding tools too." />
      <Row label="Artists welcome" help="If you'd like to redraw the room, the cat or any single object, we'd love that, and you'd be credited by name." stack>
        <a className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} href={ISSUES} target="_blank" rel="noreferrer">Say hello on GitHub<span className={cx("sr-only", shared["sr-only"])}> (opens in a new tab)</span></a>
      </Row>
      <Row label="AI is optional" help="Everything in Lilt works without AI or an account. AI connections stay off until you add one yourself." stack>
        <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={onAI}>AI connections</button>
      </Row>
    </div>
  );
}

function Tile({ pane, size = 26 }: { pane: (typeof PANES)[number]; size?: number }) {
  return (
    <span className={cx(pages.sxTile, "sx-tile")} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{pane.glyph}</svg>
    </span>
  );
}

/** A labelled row: the label (and a line of help) on the left, the control on the right. */
export function Row({ label, help, htmlFor, children, stack }: { label: string; help?: ReactNode; htmlFor?: string; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={cx(cx(pages.sxRow, `sx-row${stack ? " stack" : ""}`), stack && shared["stack"])}>
      <div className={cx(pages.sxRowL, "sx-row-l")}>
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span className={cx(pages.sxLabel, "sx-label")}>{label}</span>}
        {help && <p className={cx(pages.sxHelp, "sx-help")}>{help}</p>}
      </div>
      {children && <div className={cx(pages.sxRowC, "sx-row-c")}>{children}</div>}
    </div>
  );
}

// A closing settings pane may still be saving when another one opens.
let profileSaves: Promise<void> = Promise.resolve();

/** The profile, saved a moment after each change, as System Settings does: no Save button. */
export function useProfileDraft() {
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const dirty = useRef(false);
  const latest = useRef<Profile | null>(null);
  const save = useCallback((next: Profile) => {
    // Keep writes in edit order, including the final draft flushed when leaving.
    profileSaves = profileSaves.then(() => api.saveProfile(next)).then((stored) => {
      if (latest.current !== next) return;
      dirty.current = false;
      // Numbers the server keeps in range show as kept, not as typed.
      setP((cur) => cur && { ...cur, session_minutes: stored.session_minutes, comparison_window_days: stored.comparison_window_days });
      setSaved("saved");
      setErr(null);
    }, (e) => {
      if (latest.current !== next) return;
      setSaved("error");
      setErr(e instanceof Error ? e.message : String(e));
    });
  }, []);
  useEffect(() => {
    let live = true;
    void profileSaves.then(() => api.profile()).then((value) => { if (live) setP(value); });
    return () => { live = false; };
  }, []);
  // Leaving within the moment before a save (a tick, then straight off to practise) still keeps the change.
  useEffect(() => () => { if (dirty.current && latest.current) save(latest.current); }, [save]);
  useEffect(() => {
    if (!p || !dirty.current) return;
    setSaved("saving");
    const id = window.setTimeout(() => save(p), 600);
    return () => window.clearTimeout(id);
  }, [p, save]);
  const edit = (next: Profile) => { dirty.current = true; latest.current = next; setSaved("saving"); setErr(null); setP(next); };
  return { p, edit, saved, err };
}

export const savedLabel = (s: ReturnType<typeof useProfileDraft>["saved"]) => (s === "saving" ? "Saving…" : s === "saved" ? "Saved" : s === "error" ? "Not saved" : "");

function AppUpdates() {
  const status = useDesktopUpdate();
  return (
    <div className={cx(pages.sxGroup, "sx-group")}>
      {isDesktop() ? <>
        <Row label="Installed version"><span>{status?.current ?? "Reading app version…"}</span></Row>
        <Row label="Update status" help={<span role="status">{updateStatus(status)}</span>} stack>
          <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={openAppUpdates}>Open app updates</button>
        </Row>
      </> : <>
        <Row label="Web version"><span>{CURRENT.version}</span></Row>
        <Row label="App updates" help="App updates are available in the installed Mac app." />
      </>}
    </div>
  );
}

/**
 * Settings: categories with quiet line icons in a sidebar (with
 * search), one pane at a time on the right, changes saved as you make them. On a narrow screen the
 * categories are a list and a pane opens over it, with a back button.
 */
export function SettingsPage({ start, onClose }: { start?: PaneId | null; onClose?: () => void }) {
  const [pane, setPane] = useState<PaneId | null>(start ?? (window.innerWidth > 700 ? "appearance" : null));
  const [q, setQ] = useState("");
  const { p, edit, saved, err } = useProfileDraft();
  const [notif, setNotif] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  useEffect(() => { if (start) setPane(start); }, [start]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? PANES.filter((x) => `${x.title} ${x.words}`.toLowerCase().includes(t)) : PANES;
  }, [q]);
  const cur = PANES.find((x) => x.id === pane) ?? null;
  const toPractice = () => { onClose?.(); window.location.hash = "#/studio/settings"; };

  const content = (id: PaneId): ReactNode => {
    if (id === "appearance") return (
      <div className={cx(pages.sxGroup, "sx-group")}>
        <Row label="Theme" help="Auto follows your computer's light or dark setting. The sun or moon button in the menu bar picks one." stack><ThemeChoice /></Row>
        <Row label="Text size" help="For the practice texts, your recordings and these pages." stack><TextSizeChoice /></Row>
        <div className={cx(pages.sxRow, "sx-row")}><AccentPicker /></div>
        <Row label="Soft sounds" help="A paper rustle as a card is put away, a pencil as you keep a note, a small chime when the deck is done. Never while the microphone is on. Kept in this browser." stack><SoundsChoice /></Row>
      </div>
    );
    if (id === "ai") return <ConnectAI />;
    if (id === "updates") return <AppUpdates />;
    if (id === "backups") return <BackupSettings />;
    if (id === "storage") return <StorageSettings />;
    if (id === "about") return <About onAI={() => setPane("ai")} />;
    if (id === "privacy") return (
      <>
        <Callout kind="ok"><p>Recording, saving, playback and local analysis run on this computer. Connecting ChatGPT sends nothing by itself; when Lilt's AI features arrive in Practice, they will say what goes to OpenAI before anything is sent.</p></Callout>
        <p className={cx(pages.sxNote, "sx-note")}>If you connect an AI app (such as Claude or ChatGPT) to Lilt, whatever it reads (session details, measurements, notes, and audio clips if it asks for them) goes to that app's provider under its own terms.</p>
      </>
    );
    if (id === "notifications") return (
      <>
        <div className={cx(pages.sxGroup, "sx-group")}>
          {notif !== "unsupported" ? (
            <Row label="Browser notifications" help={notif === "granted" ? "On while Lilt is open." : notif === "denied" ? "Blocked for this page. Reminders still appear inside Lilt." : "Off. Lilt can notify you while it's open."}>
              {notif === "default" && <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={() => void Notification.requestPermission().then(setNotif)}>Allow</button>}
            </Row>
          ) : <Row label="Browser notifications" help="This browser can't show notifications. Reminders still appear inside Lilt." />}
          <Row label="Practice reminder" help="When to be reminded is set in Practice.">
            <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={toPractice}>Practice settings</button>
          </Row>
        </div>
        <p className={cx(pages.sxNote, "sx-note")}>Nothing is set up in any outside messaging account. If your computer was asleep, you'll see one reminder, not a backlog.</p>
      </>
    );
    if (!p) return <p className={cx(pages.sxNote, "sx-note")}>Loading…</p>;
    return (
      <div className={cx(pages.sxGroup, "sx-group")}>
        <TimeZoneChoice value={p.timezone} onChange={(timezone) => edit({ ...p, timezone })} />
      </div>
    );
  };

  return (
    <div className={cx(pages.sx, `sx${pane ? " has-pane" : ""}`)}>
      <h1 className={cx("sr-only", shared["sr-only"])}>Settings</h1>
      <nav className={cx(pages.sxSide, "sx-side")} aria-label="Settings">
        <div className={cx(pages.sxLights, "sx-lights")}>
          {onClose ? <button className="sx-l1" onClick={onClose} aria-label="Close settings" /> : <span className="sx-l1" aria-hidden="true" />}
          <span className="sx-l2" aria-hidden="true" /><span className="sx-l3" aria-hidden="true" />
        </div>
        <label className={cx(pages.sxSearch, "sx-search")}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="search" placeholder="Search" aria-label="Search settings" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <ul>
          {shown.map((x) => (
            <li key={x.id}>
              <button className={pane === x.id ? "on" : ""} aria-current={pane === x.id ? "page" : undefined} onClick={() => setPane(x.id)}>
                <Tile pane={x} /><span>{x.title}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className={cx(pages.sxNone, "sx-none")}>No settings match.</li>}
        </ul>
      </nav>
      <section className={cx(pages.sxMain, "sx-main")} aria-label={cur?.title}>
        {cur && (
          <>
            <header className={cx(pages.sxHead, "sx-head")}>
              <button className={cx(pages.sxBack, "sx-back")} onClick={() => setPane(null)} aria-label="All settings">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h2>Settings</h2>
              <span className={cx(pages.sxSaved, `sx-saved ${saved}`)} aria-live="polite">{savedLabel(saved)}</span>
            </header>
            <div className={cx(pages.sxBody, "sx-body")} key={cur.id}>
              <header className={cx(pages.sxHero, "sx-hero")}><h1>{cur.title}</h1><p>{HERO[cur.id]}</p></header>
              {content(cur.id)}
              {err && <Callout kind="warn"><p>{err}</p></Callout>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const HERO: Record<PaneId, string> = {
  appearance: "How Lilt looks and sounds: light or dark, how big the text is, and soft paper sounds.",
  ai: "Optional: Lilt works fully without AI. If you'd like, let an AI assistant read your practice, write reviews, and rewrite your own copy of the chapters. Lilt's original chapters stay as they are, and every change can be undone.",
  notifications: "How Lilt can get your attention while it's open.",
  time: "The time zone your practice days and reminders follow.",
  privacy: "Practice stays on this computer unless you connect an AI app.",
  updates: "Keep your installed copy of Lilt up to date when you’re ready.",
  backups: "Keep a copy of your practice, or bring it back when you need it.",
  storage: "See how much space your saved practice uses and where it lives.",
  about: "Who makes Lilt, and how it was made.",
};

/**
 * Practice's own settings, inside the Practice app (#/studio/settings): your goal, the routine
 * (session length, reminder, comparison window) and your comfortable range. Saved as you go.
 */
export function PracticeSettings() {
  const { p, edit, saved, err } = useProfileDraft();
  const [descriptors, setDescriptors] = useState<string | null>(null);
  // The warm-ups you can pin to the start of each day (the cool-down always closes it).
  const [warmups, setWarmups] = useState<TextItem[]>([]);
  useEffect(() => { void api.texts().then((t) => setWarmups(t.levels.find((l) => l.id === "warmup")?.items.filter((i) => i.id !== "cool-down") ?? []), () => {}); }, []);
  if (!p) return <p className={cx(pages.sxNote, "sx-note")}>Loading…</p>;
  return (
    <div className={cx(pages.sx, pages.sxApp, "sx sx-app")}>
      <header className={cx(pages.sxAppHead, "sx-app-head")}>
        <h1>Practice settings</h1>
        <span className={cx(pages.sxSaved, `sx-saved ${saved}`)} aria-live="polite">{savedLabel(saved)}</span>
      </header>
      <p className={cx(pages.sxNote, "sx-note")}>Your goal, routine and range. Theme, text size, notifications, AI and backups are in <button type="button" className={cx(pages.sxLink, "sx-link")} onClick={() => openSettings()}>Lilt's Settings</button>.</p>
      <section aria-labelledby="ps-goal">
        <h2 id="ps-goal">Your goal</h2>
        <div className={cx(pages.sxGroup, "sx-group")}>
          <Row label="Which way" help={DIRECTIONS.find((d) => d.id === directionOf(p.voice_direction))?.help} stack>
            <DirectionChoice value={directionOf(p.voice_direction)} onChange={(voice_direction) => { edit({ ...p, voice_direction }); announceDirection(voice_direction); }} />
          </Row>
          <Row label="In your words" htmlFor="goal" help="It starts the note on the wall too." stack>
            <textarea id="goal" value={p.goal.summary} onChange={(e) => edit({ ...p, goal: { ...p.goal, summary: e.target.value } })} />
          </Row>
          <Row label="Qualities you're aiming for" htmlFor="desc" help="Separate them with commas." stack>
            <input id="desc" type="text" value={descriptors ?? p.goal.descriptors.join(", ")} onChange={(e) => { setDescriptors(e.target.value); edit({ ...p, goal: { ...p.goal, descriptors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } }); }} />
          </Row>
        </div>
      </section>
      <section aria-labelledby="ps-routine">
        <h2 id="ps-routine">Routine</h2>
        <div className={cx(pages.sxGroup, "sx-group")}>
          <Row label="Session length" htmlFor="mins" help="A planning guide, not a timer.">
            <span className={cx(pages.sxUnit, "sx-unit")}><input id="mins" type="number" min={2} max={30} value={p.session_minutes} onChange={(e) => edit({ ...p, session_minutes: Number(e.target.value) })} /><span>min</span></span>
          </Row>
          {warmups.length > 0 && (
            <Row label="Daily warm-up" htmlFor="warm" help="Opens Today's cards every day, with the cool-down at the end. It isn't spaced like the others.">
              <select id="warm" value={p.warmup_card ?? "hum"} onChange={(e) => edit({ ...p, warmup_card: e.target.value })}>
                {warmups.map((w) => <option key={w.id} value={w.id}>{idLabel(w.id)}</option>)}
                <option value="">None</option>
              </select>
            </Row>
          )}
          <Row label="Reminder" htmlFor="rem" help="Optional. Leave it empty for no reminder.">
            <input id="rem" type="time" value={p.reminder_time ?? ""} onChange={(e) => edit({ ...p, reminder_time: e.target.value || null })} />
          </Row>
          <Row label="Comparison window" htmlFor="win" help="How many days of recordings to compare against.">
            <span className={cx(pages.sxUnit, "sx-unit")}><input id="win" type="number" min={3} max={90} value={p.comparison_window_days} onChange={(e) => edit({ ...p, comparison_window_days: Number(e.target.value) })} /><span>days</span></span>
          </Row>
        </div>
      </section>
      <section aria-labelledby="ps-range">
        <h2 id="ps-range">Comfortable range</h2>
        <div className={cx(pages.sxGroup, "sx-group")}>
          <Row label="Low" htmlFor="rlo">
            <span className={cx(pages.sxUnit, "sx-unit")}><input id="rlo" type="number" min={60} max={700} placeholder="–" value={p.comfort_range_hz?.[0] ?? ""} onChange={(e) => edit({ ...p, comfort_range_hz: e.target.value ? [Number(e.target.value), p.comfort_range_hz?.[1] ?? Number(e.target.value) + 40] : null })} /><span>Hz</span></span>
          </Row>
          <Row label="High" htmlFor="rhi">
            <span className={cx(pages.sxUnit, "sx-unit")}><input id="rhi" type="number" min={60} max={700} placeholder="–" value={p.comfort_range_hz?.[1] ?? ""} onChange={(e) => edit({ ...p, comfort_range_hz: e.target.value ? [p.comfort_range_hz?.[0] ?? Number(e.target.value) - 40, Number(e.target.value)] : null })} /><span>Hz</span></span>
          </Row>
          {p.comfort_range_hz && (
            <Row label={`${p.comfort_range_hz[0]}–${p.comfort_range_hz[1]} Hz`}>
              <button className={cx(cx(pages.sxBtn, "btn-secondary sx-btn"), shared["btn-secondary"])} onClick={() => edit({ ...p, comfort_range_hz: null })}>Clear range</button>
            </Row>
          )}
        </div>
        <div className={cx(pages.sxGroup, "sx-group")}>
          <Row label="Pitch scale after each take" htmlFor="pscale" help="Where a take sits between the average man's and woman's speaking pitch, and where your spoken takes usually sit. Population averages, not targets or a gender test. Untick to hide it.">
            <input id="pscale" type="checkbox" checked={p.show_pitch_scale !== false} onChange={(e) => { edit({ ...p, show_pitch_scale: e.target.checked }); window.dispatchEvent(new CustomEvent("lilt:pitch-scale", { detail: e.target.checked })); }} />
          </Row>
        </div>
        <p className={cx(pages.sxNote, "sx-note")}>Optional. A pitch range that feels comfortable and sounds like you, shown as a soft band on pitch views. It's your choice, not a target Lilt sets, and it never affects feedback. You can also set it from a take you like.</p>
      </section>
      {err && <Callout kind="warn"><p>{err}</p></Callout>}
    </div>
  );
}
