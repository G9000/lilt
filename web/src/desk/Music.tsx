import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import { desktop as practice } from "../ui/desktop";
import { roomStyles } from "./roomStyles";
import { useEffect, useId, useRef, useState } from "react";
import { radio, radioMoods, useRadio } from "./lofi";
import { closeMusic, openMusic, selectMusicSource, useMusic, visitMusic } from "./musicState";
import { SpotifyRadio } from "./Spotify";
import { Volume } from "./Volume";
import { PlayerPicker } from '../room/PlayerPicker';

/** The moods in two groups by how they're played, so the newer instruments are easy to find. */
const MOOD_SHELVES = [{ title: "Keys and beats", keys: true }, { title: "Strings, tines and pads", keys: false }];
const cover = (mood: string) => (radioMoods.find(item => item.name === mood) ?? radioMoods[0]).cover;
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
  return <span className={["music-mini", roomStyles["music-mini"]].join(" ")} role="group" aria-label="Music player">
    <button className={["music-mini-open", roomStyles["music-mini-open"]].join(" ")} onClick={openMusic} aria-label={`Open Music: ${title}`} title={title}>
      {art ? <img src={art} alt="" /> : <span className={["music-mini-record", roomStyles["music-mini-record"]].join(" ")} aria-hidden="true" />}
      <span>{title}</span>
    </button>
    <button className={["music-mini-toggle", roomStyles["music-mini-toggle"]].join(" ")} aria-label={`${active ? "Pause" : "Play"} ${spotify ? "Spotify" : "lo-fi radio"}`}
      disabled={spotify && !music.spotify.toggle} onClick={() => spotify ? music.spotify.toggle?.() : void radio.toggle()}>
      <PlayIcon paused={!active} />
    </button>
    {ducked && <span className={cx("sr-only", shared["sr-only"])}>Paused while the mic is on</span>}
  </span>;
}

/** Stays in the same place in Desktop, so closing never replaces a Spotify player. */
export function MusicWindow({ open }: { open: boolean }) {
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
  return <section className={cx(cx(["ds-win music-window", roomStyles["ds-win"], roomStyles["music-window"]].join(" "), practice["ds-win"]), shared["ds-win"])} hidden={!open} aria-label="Music">
    <div className={cx(["ds-tb", roomStyles["ds-tb"]].join(" "), practice["ds-tb"])}>
      <div className={["ds-lights", roomStyles["ds-lights"]].join(" ")}>
        <button ref={close} className={["ds-l1", roomStyles["ds-l1"]].join(" ")} onClick={closeMusic} aria-label="Close Music" />
        <button className={["ds-l2", roomStyles["ds-l2"]].join(" ")} onClick={closeMusic} aria-label="Minimize Music" />
      </div>
      <div className={cx(["ds-title", roomStyles["ds-title"]].join(" "), practice["ds-title"])}>Music</div>
    </div>
    {/* Hidden itself too: a page may have only one <main> without the hidden attribute. */}
    <main id={open ? "main" : undefined} hidden={!open} tabIndex={-1} className={cx(["ds-body music-body", roomStyles["ds-body"], roomStyles["music-body"]].join(" "), practice["ds-body"])}>
      <fieldset className={["music-source", roomStyles["music-source"]].join(" ")}>
        <legend className={cx("sr-only", shared["sr-only"])}>Listen to</legend>
        {(["lofi", "spotify"] as const).map(source => <label key={source}>
          <input type="radio" name={`${id}-source`} checked={music.source === source} onChange={() => selectMusicSource(source)} />
          <span>{source === "lofi" ? "Lo-fi" : "Spotify"}</span>
        </label>)}
      </fieldset>
      <PlayerPicker />
      <div hidden={music.source !== "lofi"}><LofiPlayer /></div>
      <div className={["music-spotify", roomStyles["music-spotify"]].join(" ")} hidden={music.source !== "spotify"}>
        {music.visited && <SpotifyContent selected={music.source === "spotify"} />}
      </div>
    </main>
  </section>;
}

function SpotifyContent({ selected }: { selected: boolean }) {
  const [visited, setVisited] = useState(selected);
  useEffect(() => { if (selected) setVisited(true); }, [selected]);
  return visited ? <><h1>Your Spotify</h1><p className={["music-caption", roomStyles["music-caption"]].join(" ")}>Bring something you like to the room.</p><SpotifyRadio /></> : null;
}

function LofiPlayer() {
  const r = useRadio(), id = useId();
  return <div className={["music-layout", roomStyles["music-layout"]].join(" ")}>
    <section className={["music-now", roomStyles["music-now"]].join(" ")} aria-label="Lo-fi radio">
      <div className={["music-sleeve", roomStyles["music-sleeve"]].join(" ")} aria-hidden="true">
        <div className={[`music-record${r.playing ? " playing" : ""}`, roomStyles["music-record"]].join(" ")}><img src={cover(r.mood)} alt="" /><i /></div>
      </div>
      <p className={["music-status", roomStyles["music-status"]].join(" ")} aria-live="polite">{r.ducked ? "Paused while the mic is on" : r.playing ? "Now playing" : "Ready when you are"}</p>
      <h1>{r.mood}</h1>
      <p className={["music-caption", roomStyles["music-caption"]].join(" ")}>Lo-fi radio · Made for a quiet moment</p>
      <div className={["music-controls", roomStyles["music-controls"]].join(" ")}>
        <button onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
        <button className={["music-play", roomStyles["music-play"]].join(" ")} onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? "Pause lo-fi radio" : "Play lo-fi radio"}><PlayIcon paused={!r.playing && !r.ducked} /></button>
        <button onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
      </div>
      <Volume />
      <p className={["music-note", roomStyles["music-note"]].join(" ")}>Music steps aside while your mic is on.</p>
    </section>
    <section className={["music-moods", roomStyles["music-moods"]].join(" ")} aria-labelledby="music-moods-title">
      <h2 id="music-moods-title">A mood for now</h2>
      <p>Pick somewhere to settle in.</p>
      {MOOD_SHELVES.map(shelf => {
        const moods = radioMoods.filter(m => shelf.keys === (m.voice === "keys"));
        return <div key={shelf.title} className={["music-shelf", roomStyles["music-shelf"]].join(" ")}>
          <h3 id={`${id}-${shelf.keys ? "keys" : "more"}`}>{shelf.title}</h3>
          <ul aria-labelledby={`${id}-${shelf.keys ? "keys" : "more"}`}>{moods.map(mood => <li key={mood.name}>
            <button onClick={() => radio.selectMood(mood.index)} aria-pressed={r.mood === mood.name}>
              <img src={cover(mood.name)} alt="" /><span><b>{mood.name}</b><small>{mood.description}</small></span>
              <span className={["music-selected", roomStyles["music-selected"]].join(" ")} aria-hidden="true">{r.mood === mood.name && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m3 8 3 3 7-7" /></svg>}</span>
            </button>
          </li>)}</ul>
        </div>;
      })}
    </section>
  </div>;
}
