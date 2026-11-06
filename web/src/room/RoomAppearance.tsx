import { roomStyles } from "../desk/roomStyles";
import { useEffect, useId, useRef, useState } from "react";
import { resetRoomAppearance, setRoomAppearance, useRoomAppearance, uploadMonitorMedia, removeMonitorMedia, pauseMonitorMedia, type RoomAppearancePrefs } from "./appearance";
import type { MonitorMedia as Media } from './appearance-settings';
import { MonitorMedia, allowMonitorMotion, useMonitorIssue, useMonitorPaused } from './MonitorMedia';
import { AccentPicker } from '../components/AccentPicker';

const LIGHTS: { value: RoomAppearancePrefs["light"]; label: string }[] = [
  { value: "auto", label: "Follow the day" }, { value: "morning", label: "Morning" },
  { value: "day", label: "Daylight" }, { value: "sunset", label: "Sunset" }, { value: "night", label: "Night" },
];
const FAIRY_LIGHTS: { value: RoomAppearancePrefs["lights"]; label: string }[] = [
  { value: "auto", label: "Automatic" }, { value: "on", label: "On" }, { value: "off", label: "Off" },
];
const DECOR: { value: RoomAppearancePrefs["decor"]; label: string; image: string }[] = [
  { value: "original", label: "Original", image: "room/room-day-v3.webp" },
  { value: "leaves", label: "Leaves", image: "pictures/plant-fern.webp" },
  { value: "stars", label: "Stars", image: "pictures/nebula-cliffs.webp" },
  { value: "cat", label: "Sleepy cat", image: "pictures/cat-window-nap.webp" },
];

function MonitorChoices({ id, monitor, value, media, onChange }: {
  id: string;
  monitor: "main" | "side";
  value: RoomAppearancePrefs["decor"];
  media?: Media;
  onChange: (value: RoomAppearancePrefs["decor"]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const issue = useMonitorIssue(media?.id);
  const paused = useMonitorPaused(media);
  const change = async (action: () => void | Promise<void>) => { try { await action(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'This change could not be saved.'); } };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError('');
    try { await uploadMonitorMedia(monitor, file); } catch (e) { setError(e instanceof Error ? e.message : 'This file could not be saved. Try another.'); }
    finally { setBusy(false); }
  };
  return <fieldset>
    <legend>{monitor === "main" ? "Main monitor" : "Side monitor"}</legend>
    <div className={[`room-appearance-decor room-appearance-decor-${monitor}`, roomStyles["room-appearance-decor"]].join(" ")}>
      {DECOR.map(({ value: choice, label, image }) => <label key={choice}>
        <input type="radio" name={`${id}-${monitor}-decor`} value={choice} checked={value === choice}
          onChange={() => change(() => onChange(choice))} />
        <span><span className={[`room-appearance-thumb room-appearance-thumb-${choice}`, roomStyles["room-appearance-thumb"]].join(" ")} style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />{label}</span>
      </label>)}
    </div>
    <div className={["room-media-upload", roomStyles["room-media-upload"]].join(" ")} aria-label={`Upload to ${monitor} monitor`}>
      {([['picture', 'Picture', 'image/png,image/jpeg,image/webp'], ['gif', 'GIF', 'image/gif'], ['video', 'Video', 'video/mp4,video/webm']] as const).map(([kind, label, accept]) =>
        <label key={kind}>
          <input type="file" accept={accept} disabled={busy} aria-label={`Upload ${monitor} monitor ${kind}`}
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
          <span>{label}<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 11V2m-3 3 3-3 3 3M3 10v4h10v-4" /></svg></span>
        </label>)}
    </div>
    <p className={["room-media-hint", roomStyles["room-media-hint"]].join(" ")}>{busy ? 'Opening and saving…' : 'Choose a file · up to 25 MB. Video plays silently.'}</p>
    {media && <div className={["room-media-current", roomStyles["room-media-current"]].join(" ")}>
      <MonitorMedia key={media.id} media={media} monitor={monitor} active={value === 'custom'} className={["room-media-preview", roomStyles["room-media-preview"]].join(" ")} />
      <span className={["room-media-name", roomStyles["room-media-name"]].join(" ")} title={media.name}>{media.name}</span>
      <div className={["room-media-actions", roomStyles["room-media-actions"]].join(" ")}>
        <button type="button" aria-pressed={value === 'custom'} onClick={() => change(() => onChange('custom'))}>{value === 'custom' ? 'On screen' : 'Use upload'}</button>
        {media.kind !== 'picture' && <button type="button" disabled={value !== 'custom'} onClick={() => change(async () => {
          await pauseMonitorMedia(monitor, media.id, !paused);
          if (paused) allowMonitorMotion(media.id);
        })}>{paused ? 'Play' : 'Pause'}</button>}
        <button type="button" onClick={() => change(() => removeMonitorMedia(monitor))}>Remove</button>
      </div>
      {media.kind === 'gif' && <p className={["room-media-hint", roomStyles["room-media-hint"]].join(" ")}>Pausing shows a still. Play restarts the GIF.</p>}
    </div>}
    {(error || issue) && <p className={["room-media-error", roomStyles["room-media-error"]].join(" ")} role="alert">{error || issue}</p>}
  </fieldset>;
}

export function RoomAppearance() {
  const prefs = useRoomAppearance();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const change = (patch: Partial<RoomAppearancePrefs>) => { void setRoomAppearance(patch).catch(e => setError(e instanceof Error ? e.message : 'This change could not be saved.')); };
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    }
    function onNavigation() { setOpen(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("hashchange", onNavigation);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("hashchange", onNavigation);
    };
  }, [open]);

  const warmth = prefs.warmth === 0 ? "Original warmth" : `${Math.abs(prefs.warmth)}% ${prefs.warmth < 0 ? "cooler" : "warmer"}`;
  return (
    <>
      <button ref={trigger} type="button" className={["ds-mb-btn room-appearance-trigger", roomStyles["ds-mb-btn"], roomStyles["room-appearance-trigger"]].join(" ")} aria-expanded={open}
        aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" /><path d="M7 3v4m6 1v4m-7 1v4" strokeWidth="3" />
        </svg>
        <span>Make it yours</span>
      </button>
      {open && <div ref={panel} id={id} className={["room-appearance", roomStyles["room-appearance"]].join(" ")} role="dialog" aria-modal="false"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}>
        <div className={["room-appearance-heading", roomStyles["room-appearance-heading"]].join(" ")}>
          <h2 id={`${id}-title`}>Make it yours</h2>
          <button ref={close} type="button" className={["room-appearance-close", roomStyles["room-appearance-close"]].join(" ")} aria-label="Close room appearance"
            onClick={() => { setOpen(false); trigger.current?.focus(); }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
        <p id={`${id}-intro`} className={["room-appearance-intro", roomStyles["room-appearance-intro"]].join(" ")}>A little more you. Saved in this browser.</p>
        <AccentPicker />
        <fieldset>
          <legend>Light</legend>
          <div className={["room-appearance-segments room-appearance-light", roomStyles["room-appearance-segments"], roomStyles["room-appearance-light"]].join(" ")}>
            {LIGHTS.map(({ value, label }) => <label key={value}>
              <input type="radio" name={`${id}-light`} value={value} checked={prefs.light === value}
                onChange={() => change({ light: value })} />
              <span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <div className={["room-appearance-warmth", roomStyles["room-appearance-warmth"]].join(" ")}>
          <label htmlFor={`${id}-warmth`}>Warmth</label>
          <input id={`${id}-warmth`} type="range" min={-100} max={100} step={1} value={prefs.warmth}
            aria-valuetext={warmth} onChange={event => change({ warmth: Number(event.target.value) })} />
          <div className={["room-appearance-range-labels", roomStyles["room-appearance-range-labels"]].join(" ")} aria-hidden="true"><span>Cool</span><span>Warm</span></div>
        </div>
        <fieldset>
          <legend>Fairy lights</legend>
          <div className={["room-appearance-segments", roomStyles["room-appearance-segments"]].join(" ")}>
            {FAIRY_LIGHTS.map(({ value, label }) => <label key={value}>
              <input type="radio" name={`${id}-lights`} value={value} checked={prefs.lights === value}
                onChange={() => change({ lights: value })} />
              <span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <MonitorChoices id={id} monitor="main" value={prefs.mainDecor} media={prefs.mainMedia} onChange={mainDecor => setRoomAppearance({ mainDecor }, true)} />
        <MonitorChoices id={id} monitor="side" value={prefs.decor} media={prefs.sideMedia} onChange={decor => setRoomAppearance({ decor }, true)} />
        <button type="button" className={["room-appearance-reset", roomStyles["room-appearance-reset"]].join(" ")} onClick={async () => {
          try { await resetRoomAppearance(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'The room could not be reset.'); }
        }}>Reset room</button>
        {error && <p className={["room-media-error", roomStyles["room-media-error"]].join(" ")} role="alert">{error}</p>}
      </div>}
    </>
  );
}
