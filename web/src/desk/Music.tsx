import { useEffect, useId, useRef, useState } from "react";
import { radio, radioMoods, useRadio } from "./lofi";
import { closeMusic, openMusic, selectMusicSource, useMusic, visitMusic } from "./musicState";
import { SpotifyRadio } from "./Spotify";
import { Volume } from "./Volume";
import "./music.css";

const covers = ["window", "desk", "nebula-cliffs", "galaxy-whirlpool", "plant-succulents", "cat-window-nap", "cat-blanket", "cat-keyboard", "plant-fern"];
const cover = (mood: string) => `/pictures/${covers[Math.max(0, radioMoods.findIndex(item => item.name === mood))]}.webp`;
export function PlayIcon({ paused }: { paused: boolean }) {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d={paused ? "M5 3l8 5-8 5z" : "M4 3h3v10H4zM9 3h3v10H9z"} fill="currentColor" /></svg>;
}

export function MusicMini() {
  const music = useMusic(), r = useRadio();
  if (!music.visited) return null;
  const spotify = music.source === "spotify";
  const title = spotify ? music.spotify.title : r.mood;
  const art = spotify ? music.spotify.art : cover(r.mood);
  const active = spotify ? music.spotify.playing || music.spotify.ducked : r.playing || r.ducked;
  const ducked = spotify ? music.spotify.ducked : r.ducked;
  return <span className="music-mini" role="group" aria-label="Music player">
    <button className="music-mini-open" onClick={openMusic} aria-label={`Open Music: ${title}`} title={title}>
      {art ? <img src={art} alt="" /> : <span className="music-mini-record" aria-hidden="true" />}
      <span>{title}</span>
    </button>
    <button className="music-mini-toggle" aria-label={`${active ? "Pause" : "Play"} ${spotify ? "Spotify" : "lo-fi radio"}`}
      disabled={spotify && !music.spotify.toggle} onClick={() => spotify ? music.spotify.toggle?.() : void radio.toggle()}>
      <PlayIcon paused={!active} />
    </button>
    {ducked && <span className="sr-only">Paused while the mic is on</span>}
  </span>;
}

/** Stays in the same place in Desktop, so closing or expanding never replaces a Spotify player. */
export function MusicWindow({ open }: { open: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const music = useMusic();
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    visitMusic();
    close.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector(".ss.open, .nc.open")) return;
      event.preventDefault(); closeMusic();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return <section className={`ds-win music-window${expanded ? " music-expanded" : ""}`} hidden={!open} aria-label="Music">
    <div className="ds-tb">
      <div className="ds-lights">
        <button ref={close} className="ds-l1" onClick={closeMusic} aria-label="Close Music" />
        <button className="ds-l2" onClick={closeMusic} aria-label="Minimize Music" />
        <button className="ds-l3" onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Restore Music window" : "Expand Music window"} aria-pressed={expanded} />
      </div>
      <div className="ds-title">Music</div>
      <button className="music-size" onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Restore window size" : "Expand window"}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={expanded ? "M3 7h4V3m10 4h-4V3M3 13h4v4m10-4h-4v4" : "M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"} /></svg>
      </button>
    </div>
    <main id={open ? "main" : undefined} tabIndex={-1} className="ds-body music-body">
      <fieldset className="music-source">
        <legend className="sr-only">Listen to</legend>
        {(["lofi", "spotify"] as const).map(source => <label key={source}>
          <input type="radio" name={`${id}-source`} checked={music.source === source} onChange={() => selectMusicSource(source)} />
          <span>{source === "lofi" ? "Lo-fi" : "Spotify"}</span>
        </label>)}
      </fieldset>
      <div hidden={music.source !== "lofi"}><LofiPlayer /></div>
      <div className="music-spotify" hidden={music.source !== "spotify"}>
        {music.visited && <SpotifyContent selected={music.source === "spotify"} />}
      </div>
    </main>
  </section>;
}

function SpotifyContent({ selected }: { selected: boolean }) {
  const [visited, setVisited] = useState(selected);
  useEffect(() => { if (selected) setVisited(true); }, [selected]);
  return visited ? <><h1>Your Spotify</h1><p className="music-caption">Bring something you like to the room.</p><SpotifyRadio /></> : null;
}

function LofiPlayer() {
  const r = useRadio();
  return <div className="music-layout">
    <section className="music-now" aria-label="Lo-fi radio">
      <div className="music-sleeve" aria-hidden="true">
        <div className={`music-record${r.playing ? " playing" : ""}`}><img src={cover(r.mood)} alt="" /><i /></div>
        <img className="music-cover" src={cover(r.mood)} alt="" />
      </div>
      <p className="music-status" aria-live="polite">{r.ducked ? "Paused while the mic is on" : r.playing ? "Now playing" : "Ready when you are"}</p>
      <h1>{r.mood}</h1>
      <p className="music-caption">Lo-fi radio · Made for a quiet moment</p>
      <div className="music-controls">
        <button onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
        <button className="music-play" onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? "Pause lo-fi radio" : "Play lo-fi radio"}><PlayIcon paused={!r.playing && !r.ducked} /></button>
        <button onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
      </div>
      <Volume />
      <p className="music-note">Music steps aside while your mic is on.</p>
    </section>
    <section className="music-moods" aria-labelledby="music-moods-title">
      <h2 id="music-moods-title">A mood for now</h2>
      <p>Pick somewhere to settle in.</p>
      <ul>{radioMoods.map(mood => <li key={mood.name}>
        <button onClick={() => radio.selectMood(mood.index)} aria-pressed={r.mood === mood.name}>
          <img src={cover(mood.name)} alt="" /><span><b>{mood.name}</b><small>{mood.description}</small></span>
          {r.mood === mood.name && <span className="music-selected" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg></span>}
        </button>
      </li>)}</ul>
    </section>
  </div>;
}
