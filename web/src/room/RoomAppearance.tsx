import { useEffect, useId, useRef, useState } from "react";
import { resetRoomAppearance, setRoomAppearance, useRoomAppearance, type RoomAppearancePrefs } from "./appearance";
import "./room-appearance.css";

const LIGHTS: { value: RoomAppearancePrefs["light"]; label: string }[] = [
  { value: "auto", label: "Follow the day" }, { value: "morning", label: "Morning" },
  { value: "day", label: "Daylight" }, { value: "sunset", label: "Sunset" }, { value: "night", label: "Night" },
];
const FAIRY_LIGHTS: { value: RoomAppearancePrefs["lights"]; label: string }[] = [
  { value: "auto", label: "Automatic" }, { value: "on", label: "On" }, { value: "off", label: "Off" },
];
const DECOR: { value: RoomAppearancePrefs["decor"]; label: string; image: string }[] = [
  { value: "original", label: "Original", image: "room/room-day.webp" },
  { value: "leaves", label: "Leaves", image: "pictures/plant-fern.webp" },
  { value: "stars", label: "Stars", image: "pictures/nebula-cliffs.webp" },
  { value: "cat", label: "Sleepy cat", image: "pictures/cat-window-nap.webp" },
];

export function RoomAppearance() {
  const prefs = useRoomAppearance();
  const [open, setOpen] = useState(false);
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
      <button ref={trigger} type="button" className="ds-mb-btn room-appearance-trigger" aria-expanded={open}
        aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" /><path d="M7 3v4m6 1v4m-7 1v4" strokeWidth="3" />
        </svg>
        <span>Make it yours</span>
      </button>
      {open && <div ref={panel} id={id} className="room-appearance" role="dialog" aria-modal="false"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}>
        <div className="room-appearance-heading">
          <h2 id={`${id}-title`}>Make it yours</h2>
          <button ref={close} type="button" className="room-appearance-close" aria-label="Close room appearance"
            onClick={() => { setOpen(false); trigger.current?.focus(); }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
        <p id={`${id}-intro`} className="room-appearance-intro">A little more you. Saved in this browser.</p>
        <fieldset>
          <legend>Light</legend>
          <div className="room-appearance-segments room-appearance-light">
            {LIGHTS.map(({ value, label }) => <label key={value}>
              <input type="radio" name={`${id}-light`} value={value} checked={prefs.light === value}
                onChange={() => setRoomAppearance({ light: value })} />
              <span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <div className="room-appearance-warmth">
          <label htmlFor={`${id}-warmth`}>Warmth</label>
          <input id={`${id}-warmth`} type="range" min={-100} max={100} step={1} value={prefs.warmth}
            aria-valuetext={warmth} onChange={event => setRoomAppearance({ warmth: Number(event.target.value) })} />
          <div className="room-appearance-range-labels" aria-hidden="true"><span>Cool</span><span>Warm</span></div>
        </div>
        <fieldset>
          <legend>Fairy lights</legend>
          <div className="room-appearance-segments">
            {FAIRY_LIGHTS.map(({ value, label }) => <label key={value}>
              <input type="radio" name={`${id}-lights`} value={value} checked={prefs.lights === value}
                onChange={() => setRoomAppearance({ lights: value })} />
              <span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Side monitor</legend>
          <div className="room-appearance-decor">
            {DECOR.map(({ value, label, image }) => <label key={value}>
              <input type="radio" name={`${id}-decor`} value={value} checked={prefs.decor === value}
                onChange={() => setRoomAppearance({ decor: value })} />
              <span><span className={`room-appearance-thumb room-appearance-thumb-${value}`} style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />{label}</span>
            </label>)}
          </div>
        </fieldset>
        <button type="button" className="room-appearance-reset" onClick={resetRoomAppearance}>Reset room</button>
      </div>}
    </>
  );
}
