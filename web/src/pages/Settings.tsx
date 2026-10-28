import "../styles/texts.css";
import "../styles/settings.css";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api, Profile } from "../api";
import { applyTextSize, readTextSize, TEXT_SIZES, type TextSize, type Theme } from "../App";
import { Callout } from "../components/bits";
import { ConnectAI } from "../components/ConnectAI";

const ZONES = ["Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Jakarta", "Asia/Bangkok", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"];

/** Light or dark, kept in step with the menu bar's button. */
function ThemeChoice() {
  const read = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  const [t, setT] = useState<Theme>(read);
  useEffect(() => {
    const m = new MutationObserver(() => setT(read()));
    m.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => m.disconnect();
  }, []);
  return (
    <div className="segmented" role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((x) => (
        <button key={x} aria-pressed={t === x} onClick={() => window.dispatchEvent(new CustomEvent("lilt:theme", { detail: x }))}>{x === "light" ? "Light" : "Dark"}</button>
      ))}
    </div>
  );
}

/** Text size for the reading pages: applied at once and kept in this browser. */
function TextSizeChoice() {
  const [t, setT] = useState<TextSize>(readTextSize);
  return (
    <div className="segmented" role="group" aria-label="Text size">
      {TEXT_SIZES.map((x) => (
        <button key={x.id} aria-pressed={t === x.id} onClick={() => { applyTextSize(x.id); setT(x.id); }}>{x.label}</button>
      ))}
    </div>
  );
}

type PaneId = "appearance" | "ai" | "goal" | "routine" | "reminders" | "range" | "privacy";

/** Each pane: its sidebar icon (a white glyph on a coloured tile, as in System Settings) and words to search by. */
const PANES: { id: PaneId; title: string; words: string; tile: string; glyph: ReactNode }[] = [
  { id: "appearance", title: "Appearance", words: "theme dark light mode text size font bigger smaller", tile: "#4a4a55,#1f1f26",
    glyph: <><circle cx="10" cy="10" r="6" /><path d="M10 4a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" /></> },
  { id: "ai", title: "AI connections", words: "ai claude chatgpt mcp connect agent assistant desktop code tunnel", tile: "#f59a6c,#e0643c",
    glyph: <path d="M10 3l1.5 4 4 1.5-4 1.5L10 14l-1.5-4-4-1.5 4-1.5zM15 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" /> },
  { id: "goal", title: "Your goal", words: "goal qualities aim voice words", tile: "#f37aa2,#d6457a",
    glyph: <><circle cx="10" cy="10" r="6.5" /><circle cx="10" cy="10" r="3.5" /><circle cx="10" cy="10" r="0.8" fill="currentColor" /></> },
  { id: "routine", title: "Practice routine", words: "time zone session length minutes comparison window days routine", tile: "#f8b84a,#ec8a10",
    glyph: <><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.6" /></> },
  { id: "reminders", title: "Reminders", words: "reminder notification notifications alert bell time", tile: "#ff7171,#e5484d",
    glyph: <path d="M6 13.5V9a4 4 0 0 1 8 0v4.5l1 1.2H5zM8.6 16.2a1.6 1.6 0 0 0 2.8 0" /> },
  { id: "range", title: "Comfortable range", words: "pitch range hz comfortable low high band", tile: "#45d39b,#15936a",
    glyph: <path d="M3 10.5c1.4 0 1.4-4 2.8-4s1.4 7 2.8 7 1.4-9 2.8-9 1.4 7 2.8 7 1.4-3 2.8-3" /> },
  { id: "privacy", title: "Privacy", words: "privacy data processing cloud local", tile: "#62a8ff,#2f6fe4",
    glyph: <path d="M10 3.5l5.5 2v4c0 3.4-2.3 6-5.5 7-3.2-1-5.5-3.6-5.5-7v-4z" /> },
];

function Tile({ pane, size = 26 }: { pane: (typeof PANES)[number]; size?: number }) {
  const [a, b] = pane.tile.split(",");
  return (
    <span className="sx-tile" style={{ width: size, height: size, background: `linear-gradient(180deg, ${a}, ${b})` }} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{pane.glyph}</svg>
    </span>
  );
}

/** A labelled row: the label (and a line of help) on the left, the control on the right. */
function Row({ label, help, htmlFor, children, stack }: { label: string; help?: ReactNode; htmlFor?: string; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={`sx-row${stack ? " stack" : ""}`}>
      <div className="sx-row-l">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span className="sx-label">{label}</span>}
        {help && <p className="sx-help">{help}</p>}
      </div>
      {children && <div className="sx-row-c">{children}</div>}
    </div>
  );
}

/**
 * Settings, laid out like System Settings: categories with coloured icons in a sidebar (with
 * search), one pane at a time on the right, changes saved as you make them. On a narrow screen the
 * categories are a list and a pane opens over it, with a back button.
 */
export function SettingsPage({ start, onClose }: { start?: PaneId | null; onClose?: () => void }) {
  const [pane, setPane] = useState<PaneId | null>(start ?? (window.innerWidth > 700 ? "appearance" : null));
  const [q, setQ] = useState("");
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [notif, setNotif] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const dirty = useRef(false);
  useEffect(() => { void api.profile().then(setP); }, []);
  useEffect(() => { if (start) setPane(start); }, [start]);
  // Save a moment after the last change, as System Settings does: no Save button.
  useEffect(() => {
    if (!p || !dirty.current) return;
    setSaved("saving");
    const id = window.setTimeout(() => {
      api.saveProfile(p).then(() => { dirty.current = false; setSaved("saved"); setErr(null); }, (e) => { setSaved("error"); setErr(e instanceof Error ? e.message : String(e)); });
    }, 600);
    return () => window.clearTimeout(id);
  }, [p]);
  const edit = (next: Profile) => { dirty.current = true; setP(next); };
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? PANES.filter((x) => `${x.title} ${x.words}`.toLowerCase().includes(t)) : PANES;
  }, [q]);
  const cur = PANES.find((x) => x.id === pane) ?? null;
  const zones = p ? (ZONES.includes(p.timezone) ? ZONES : [p.timezone, ...ZONES]) : ZONES;

  const content = (id: PaneId): ReactNode => {
    if (id === "appearance") return (
      <div className="sx-group">
        <Row label="Theme" help="Also the sun or moon button in the desk's menu bar." stack><ThemeChoice /></Row>
        <Row label="Text size" help="For the practice texts, your recordings and these pages." stack><TextSizeChoice /></Row>
      </div>
    );
    if (id === "ai") return <ConnectAI />;
    if (id === "privacy") return (
      <>
        <Callout kind="ok"><p><strong>External processing is off.</strong> Recording, saving, playback, analysis and feedback all run on this computer. No cloud model is used.</p></Callout>
        <p className="sx-note">If you connect an AI app (such as Claude or ChatGPT) to Lilt, whatever it reads (session details, measurements, notes, and audio clips if it asks for them) goes to that app's provider under its own terms.</p>
      </>
    );
    if (!p) return <p className="sx-note">Loading…</p>;
    if (id === "goal") return (
      <div className="sx-group">
        <Row label="In your words" htmlFor="goal" stack>
          <textarea id="goal" value={p.goal.summary} onChange={(e) => edit({ ...p, goal: { ...p.goal, summary: e.target.value } })} />
        </Row>
        <Row label="Qualities you're aiming for" htmlFor="desc" help="Separate them with commas." stack>
          <input id="desc" type="text" value={p.goal.descriptors.join(", ")} onChange={(e) => edit({ ...p, goal: { ...p.goal, descriptors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
        </Row>
      </div>
    );
    if (id === "routine") return (
      <div className="sx-group">
        <Row label="Time zone" htmlFor="tz">
          <select id="tz" value={p.timezone} onChange={(e) => edit({ ...p, timezone: e.target.value })}>{zones.map((z) => <option key={z}>{z}</option>)}</select>
        </Row>
        <Row label="Session length" htmlFor="mins" help="A planning guide, not a timer.">
          <span className="sx-unit"><input id="mins" type="number" min={2} max={30} value={p.session_minutes} onChange={(e) => edit({ ...p, session_minutes: Number(e.target.value) })} /><span>min</span></span>
        </Row>
        <Row label="Comparison window" htmlFor="win" help="How many days of recordings to compare against.">
          <span className="sx-unit"><input id="win" type="number" min={3} max={90} value={p.comparison_window_days} onChange={(e) => edit({ ...p, comparison_window_days: Number(e.target.value) })} /><span>days</span></span>
        </Row>
      </div>
    );
    if (id === "reminders") return (
      <>
        <div className="sx-group">
          <Row label="Reminder time" htmlFor="rem" help="Optional. Leave it empty for no reminder.">
            <input id="rem" type="time" value={p.reminder_time ?? ""} onChange={(e) => edit({ ...p, reminder_time: e.target.value || null })} />
          </Row>
          {notif !== "unsupported" && (
            <Row label="Browser notifications" help={notif === "granted" ? "On while Lilt is open." : notif === "denied" ? "Blocked for this page. The in-app reminder still works." : "Off. Lilt can notify you while it's open."}>
              {notif === "default" && <button className="btn-secondary sx-btn" onClick={() => void Notification.requestPermission().then(setNotif)}>Allow</button>}
            </Row>
          )}
        </div>
        <p className="sx-note">Reminders appear in Lilt, plus a browser notification while Lilt is open if you allow it. Nothing is set up in any outside messaging account. If your computer was asleep, you'll see one reminder, not a backlog.</p>
      </>
    );
    return (
      <>
        <div className="sx-group">
          <Row label="Low" htmlFor="rlo">
            <span className="sx-unit"><input id="rlo" type="number" min={60} max={700} placeholder="Not set" value={p.comfort_range_hz?.[0] ?? ""} onChange={(e) => edit({ ...p, comfort_range_hz: e.target.value ? [Number(e.target.value), p.comfort_range_hz?.[1] ?? Number(e.target.value) + 40] : null })} /><span>Hz</span></span>
          </Row>
          <Row label="High" htmlFor="rhi">
            <span className="sx-unit"><input id="rhi" type="number" min={60} max={700} placeholder="Not set" value={p.comfort_range_hz?.[1] ?? ""} onChange={(e) => edit({ ...p, comfort_range_hz: e.target.value ? [p.comfort_range_hz?.[0] ?? Number(e.target.value) - 40, Number(e.target.value)] : null })} /><span>Hz</span></span>
          </Row>
          {p.comfort_range_hz && (
            <Row label={`${p.comfort_range_hz[0]}–${p.comfort_range_hz[1]} Hz`}>
              <button className="btn-secondary sx-btn" onClick={() => edit({ ...p, comfort_range_hz: null })}>Clear range</button>
            </Row>
          )}
        </div>
        <p className="sx-note">Optional. A pitch range that feels comfortable and sounds like you. It's shown as a soft band on pitch views. It's your choice, not a target Lilt sets, and it never affects feedback. You can also set it from a take you like in a practice chapter.</p>
      </>
    );
  };

  return (
    <div className={`sx${pane ? " has-pane" : ""}`}>
      <h1 className="sr-only">Settings</h1>
      <nav className="sx-side" aria-label="Settings">
        <div className="sx-lights">
          {onClose ? <button className="sx-l1" onClick={onClose} aria-label="Close settings" /> : <span className="sx-l1" aria-hidden="true" />}
          <span className="sx-l2" aria-hidden="true" /><span className="sx-l3" aria-hidden="true" />
        </div>
        <label className="sx-search">
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
          {shown.length === 0 && <li className="sx-none">No settings match.</li>}
        </ul>
      </nav>
      <section className="sx-main" aria-label={cur?.title}>
        {cur && (
          <>
            <header className="sx-head">
              <button className="sx-back" onClick={() => setPane(null)} aria-label="All settings">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h2>{cur.title}</h2>
              <span className={`sx-saved ${saved}`} aria-live="polite">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : saved === "error" ? "Not saved" : ""}</span>
            </header>
            <div className="sx-body" key={cur.id}>
              <div className="sx-hero"><Tile pane={cur} size={56} /><div><b>{cur.title}</b><p>{HERO[cur.id]}</p></div></div>
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
  appearance: "How Lilt looks: light or dark, and how big the text is.",
  ai: "Let an AI assistant read your practice, write reviews, and rewrite your own copy of the chapters. Lilt's original chapters stay as they are, and every change can be undone.",
  goal: "What you're working towards, in your own words. It starts the note on the wall too.",
  routine: "Your time zone, how long a session is, and how far back Lilt compares.",
  reminders: "A gentle nudge to practise, inside Lilt.",
  range: "A pitch range that feels comfortable and sounds like you.",
  privacy: "Everything stays on this computer unless you connect an AI app.",
};
