import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { radio, useRadio } from "../desk/lofi";
import { SpotifyRadio } from "../desk/Spotify";
import { Volume } from "../desk/Volume";
import "./room-objects.css";

/** Transparent targets follow the painted objects; the controls stay in the viewport. */
export function RoomObjects({ inside, onEnter }: { inside: boolean; onEnter: () => void }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const openedBy = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  const toggleMusic = (button: HTMLButtonElement) => {
    openedBy.current = button;
    setVisited(true);
    setOpen(value => !value);
  };
  const restoreFocus = () => {
    const button = openedBy.current;
    if (button?.getClientRects().length) button.focus({ preventScroll: true });
    else (window.matchMedia("(max-width: 767px), (max-aspect-ratio: 4/3)").matches ? mobileTrigger.current : trigger.current)?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!inside) return;
    setOpen(false);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && (focused.matches(".room-object") || panel.current?.contains(focused))) focused.blur();
  }, [inside]);
  useEffect(() => {
    if (!open || inside) return;
    close.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      restoreFocus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !panel.current?.contains(target) && !trigger.current?.contains(target) && !mobileTrigger.current?.contains(target)) setOpen(false);
    };
    const onNavigation = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("hashchange", onNavigation);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("hashchange", onNavigation);
    };
  }, [open, inside]);

  return <>
    <a className="room-object room-camera" href="#/photos" aria-label="Open Photos" tabIndex={inside ? -1 : 0}
      onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Open Photos</span>
    </a>
    <button type="button" className="room-object room-microphone" aria-label="Open Practice" tabIndex={inside ? -1 : 0}
      disabled={inside} onClick={onEnter} onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Open Practice</span>
    </button>
    <button ref={trigger} type="button" className="room-object room-music" aria-label="Open music player" tabIndex={inside ? -1 : 0}
      disabled={inside} aria-haspopup="dialog" aria-expanded={open && !inside} aria-controls={visited ? id : undefined}
      onClick={event => toggleMusic(event.currentTarget)}
      onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
      <span aria-hidden="true">Music</span>
    </button>
    {!inside && createPortal(
      <div className="room-object-shortcuts" role="group" aria-label="Room shortcuts"
        onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
        <a href="#/photos">Photos</a>
        <button type="button" onClick={onEnter}>Practice</button>
        <button ref={mobileTrigger} type="button" aria-haspopup="dialog" aria-expanded={open}
          aria-controls={visited ? id : undefined} onClick={event => toggleMusic(event.currentTarget)}>Music</button>
      </div>, document.body)}
    {/* Keep a chosen Spotify player alive when the controls close, including while practising. */}
    {visited && createPortal(
      <div ref={panel} id={id} className="room-music-panel" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}
        hidden={!open || inside} onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()}>
        <div className="room-music-heading">
          <h2 id={`${id}-title`}>Music</h2>
          <button ref={close} type="button" className="room-music-close" aria-label="Close music player"
            onClick={() => { setOpen(false); restoreFocus(); }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>
        <MusicControls />
      </div>, document.body)}
  </>;
}

function MusicControls() {
  const r = useRadio();
  const id = useId();
  const [source, setSource] = useState<"lofi" | "spotify">(() => {
    try { return localStorage.getItem("lilt.radio.source") === "spotify" ? "spotify" : "lofi"; } catch { return "lofi"; }
  });
  const pick = (value: "lofi" | "spotify") => {
    setSource(value);
    try { localStorage.setItem("lilt.radio.source", value); } catch { /* private mode */ }
    if (value === "spotify" && (r.playing || r.ducked)) void radio.toggle();
  };
  return <>
    <fieldset className="room-music-source">
      <legend>Listen to</legend>
      <div>{(["lofi", "spotify"] as const).map(value => <label key={value}>
        <input type="radio" name={`${id}-source`} value={value} checked={source === value} onChange={() => pick(value)} />
        <span>{value === "lofi" ? "Lo-fi" : "Spotify"}</span>
      </label>)}</div>
    </fieldset>
    {source === "spotify" ? <SpotifyRadio /> : <div className="room-music-lofi">
      <p className="room-music-status" aria-live="polite">{r.ducked ? "Paused while the mic is on" : r.playing ? "Now playing" : "Lo-fi radio"}</p>
      <b className="room-music-mood">{r.mood}</b>
      <div className="room-music-controls">
        <button type="button" onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
        <button type="button" className="room-music-play" onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? "Pause lo-fi radio" : "Start lo-fi radio"}>
          {r.playing || r.ducked
            ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2.2v9H3zM6.8 1.5H9v9H6.8z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7.5 4.5L3 10.5z" fill="currentColor" /></svg>}
        </button>
        <button type="button" onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg></button>
      </div>
      <Volume />
    </div>}
  </>;
}
