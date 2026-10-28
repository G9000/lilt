import "../styles/texts.css";
import { useEffect, useState } from "react";
import { api, Profile } from "../api";
import { applyTextSize, readTextSize, TEXT_SIZES, type TextSize, type Theme } from "../App";
import { Callout, Toast, useToast } from "../components/bits";
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

export function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useToast();
  const [notif, setNotif] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  useEffect(() => { void api.profile().then(setP); }, []);
  if (!p) return <p className="tx-loading">Loading settings…</p>;

  const save = async () => {
    try {
      setP(await api.saveProfile(p));
      setErr(null);
      setToast("Settings saved");
    } catch (e: any) { setErr(e.message); }
  };
  const zones = ZONES.includes(p.timezone) ? ZONES : [p.timezone, ...ZONES];

  return (
    <div className="st">
      <h1 className="sr-only">Settings</h1>

      <section className="st-group" aria-labelledby="st-look">
        <h2 id="st-look">Appearance</h2>
        <div className="st-box">
          <div className="st-row st-stack">
            <div>
              <span className="st-label">Theme</span>
              <p className="st-help">Also the sun or moon button in the desk's menu bar.</p>
            </div>
            <ThemeChoice />
          </div>
          <div className="st-row st-stack">
            <div>
              <span className="st-label">Text size</span>
              <p className="st-help">For the practice texts, your recordings and these pages.</p>
            </div>
            <TextSizeChoice />
          </div>
        </div>
      </section>

      <ConnectAI />

      <section className="st-group" aria-labelledby="st-goal">
        <h2 id="st-goal">Your goal</h2>
        <div className="st-box">
          <div className="st-field">
            <label htmlFor="goal">In your words</label>
            <textarea id="goal" value={p.goal.summary} onChange={(e) => setP({ ...p, goal: { ...p.goal, summary: e.target.value } })} />
          </div>
          <div className="st-field">
            <label htmlFor="desc">Qualities you're aiming for</label>
            <input id="desc" type="text" aria-describedby="desc-help" value={p.goal.descriptors.join(", ")} onChange={(e) => setP({ ...p, goal: { ...p.goal, descriptors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
            <p className="st-help" id="desc-help">Separate them with commas.</p>
          </div>
        </div>
      </section>

      <section className="st-group" aria-labelledby="st-routine">
        <h2 id="st-routine">Routine</h2>
        <div className="st-box">
          <div className="st-row">
            <label htmlFor="tz">Time zone</label>
            <select id="tz" className="st-wide" value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })}>{zones.map((z) => <option key={z}>{z}</option>)}</select>
          </div>
          <div className="st-row">
            <div>
              <label htmlFor="mins">Session length</label>
              <p className="st-help" id="mins-help">A planning guide, not a timer.</p>
            </div>
            <span className="st-unit">
              <input id="mins" type="number" min={2} max={30} aria-describedby="mins-help" value={p.session_minutes} onChange={(e) => setP({ ...p, session_minutes: Number(e.target.value) })} />
              <span aria-hidden="true">min</span>
            </span>
          </div>
          <div className="st-row">
            <div>
              <label htmlFor="rem">Reminder time</label>
              <p className="st-help" id="rem-help">Optional.</p>
            </div>
            <input id="rem" type="time" className="st-mid" aria-describedby="rem-help" value={p.reminder_time ?? ""} onChange={(e) => setP({ ...p, reminder_time: e.target.value || null })} />
          </div>
          <div className="st-row">
            <div>
              <label htmlFor="win">Comparison window</label>
              <p className="st-help" id="win-help">How many days of recordings to compare against.</p>
            </div>
            <span className="st-unit">
              <input id="win" type="number" min={3} max={90} aria-describedby="win-help" value={p.comparison_window_days} onChange={(e) => setP({ ...p, comparison_window_days: Number(e.target.value) })} />
              <span aria-hidden="true">days</span>
            </span>
          </div>
          {notif !== "unsupported" && (
            <div className="st-row">
              <div>
                <span className="st-label">Browser notifications</span>
                <p className="st-help">
                  {notif === "granted" && "On while Lilt is open."}
                  {notif === "denied" && "Blocked for this page. The in-app reminder still works."}
                  {notif === "default" && "Off. Lilt can notify you while it's open."}
                </p>
              </div>
              {notif === "default" && <button className="btn-secondary st-btn" onClick={() => void Notification.requestPermission().then(setNotif)}>Allow browser notifications</button>}
            </div>
          )}
        </div>
        <p className="st-note">Reminders appear in Lilt, plus a browser notification while Lilt is open if you allow it. Nothing is set up in any outside messaging account. If your computer was asleep, you'll see one reminder, not a backlog.</p>
      </section>

      <section className="st-group" aria-labelledby="st-range">
        <h2 id="st-range">Comfortable range</h2>
        <div className="st-box">
          <div className="st-row">
            <label htmlFor="rlo">Low</label>
            <span className="st-unit">
              <input id="rlo" type="number" min={60} max={700} placeholder="Not set" value={p.comfort_range_hz?.[0] ?? ""} onChange={(e) => setP({ ...p, comfort_range_hz: e.target.value ? [Number(e.target.value), p.comfort_range_hz?.[1] ?? Number(e.target.value) + 40] : null })} />
              <span aria-hidden="true">Hz</span>
            </span>
          </div>
          <div className="st-row">
            <label htmlFor="rhi">High</label>
            <span className="st-unit">
              <input id="rhi" type="number" min={60} max={700} placeholder="Not set" value={p.comfort_range_hz?.[1] ?? ""} onChange={(e) => setP({ ...p, comfort_range_hz: e.target.value ? [p.comfort_range_hz?.[0] ?? Number(e.target.value) - 40, Number(e.target.value)] : null })} />
              <span aria-hidden="true">Hz</span>
            </span>
          </div>
          {p.comfort_range_hz && (
            <div className="st-row">
              <span className="st-help">{p.comfort_range_hz[0]}–{p.comfort_range_hz[1]} Hz</span>
              <button className="btn-ghost st-btn" onClick={() => setP({ ...p, comfort_range_hz: null })}>Clear range</button>
            </div>
          )}
        </div>
        <p className="st-note">Optional. A pitch range that feels comfortable and sounds like you. It's shown as a soft band on pitch views. It's your choice, not a target Lilt sets, and it never affects feedback. You can also set it from a take you like in a practice chapter.</p>
      </section>


      <section className="st-group" aria-labelledby="st-privacy">
        <h2 id="st-privacy">Privacy and processing</h2>
        <Callout kind="ok"><p><strong>External processing is off.</strong> Recording, saving, playback, analysis and feedback all run on this computer. No cloud model is used.</p></Callout>
        <p className="st-note">If you connect an AI app (such as Claude or ChatGPT) to Lilt, whatever it reads (session details, measurements, notes, and audio clips if it asks for them) goes to that app's provider under its own terms.</p>
      </section>

      <div className="st-save">
        {err && <Callout kind="warn"><p>{err}</p></Callout>}
        <button className="btn-primary" onClick={() => void save()}>Save settings</button>
      </div>
      <Toast text={toast} />
    </div>
  );
}
