import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import { roomStyles } from "./roomStyles";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { radio, radioMoods, useRadio } from "./lofi";
import { closeMusic, openMusic, restoreMusicFocus, selectMusicSource, useMusic } from "./musicState";
import { SpotifyRadio } from "./Spotify";
import { Volume } from "./Volume";
import { PlayerPicker } from '../room/PlayerPicker';

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
    <button className={["music-mini-open", roomStyles["music-mini-open"]].join(" ")} onClick={openMusic} aria-haspopup="dialog" aria-expanded={music.open} aria-label={`Open Music: ${title}`} title={title}>
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

/** Closing the dialog leaves the audio host mounted, including Spotify's iframe. */
export function MusicWindow() {
  const music = useMusic(), r = useRadio();
  const [hidden, setHidden] = useState(document.hidden);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    if (music.open) dialog.current?.showModal();
    else if (dialog.current?.open) { dialog.current.close(); restoreMusicFocus(); }
  }, [music.open]);
  useEffect(() => () => { dialog.current?.close(); }, []);
  useEffect(() => {
    const leave = () => { if (music.open) closeMusic(); };
    window.addEventListener('hashchange', leave);
    return () => window.removeEventListener('hashchange', leave);
  }, [music.open]);
  const playback = music.source === 'spotify' ? music.spotify : r;
  const spinning = music.open && playback.playing && !playback.ducked && !hidden;
  const artwork = music.source === 'spotify' ? music.spotify.art ?? cover(r.mood) : cover(r.mood);
  return createPortal(<dialog ref={dialog} aria-labelledby={id + '-title'}
    onCancel={event => { event.preventDefault(); closeMusic(); }}
    onClick={event => { if (event.target === event.currentTarget) closeMusic(); }}
    onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
    className="music-window m-auto max-h-[calc(100dvh-32px)] w-[340px] max-w-[calc(100vw-24px)] overflow-auto rounded-[22px] border border-[var(--hair)] bg-[var(--win)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm [&[hidden]]:hidden! [&_[hidden]]:hidden! [&_:is(button,input,select):focus-visible]:outline-2 [&_:is(button,input,select):focus-visible]:outline-[var(--accent)] [&_:is(button,input,select):focus-visible]:outline-offset-2">
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id + '-title'} className="m-0 text-xl font-semibold">Music</h2>
        <button type="button" onClick={closeMusic} aria-label="Close Music" className="grid min-h-11 min-w-11 place-items-center rounded-full bg-[var(--fill)]"><svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg></button>
      </div>
      <div className="mx-auto my-2 h-40 w-40" aria-hidden="true">
        <div className={['music-record', spinning ? 'playing' : '', roomStyles['music-record']].join(' ')}><img src={artwork} alt="" /><i /></div>
      </div>
      <p className="mb-3 mt-0 text-center text-xs text-[var(--ink-2)]" aria-live="polite">{playback.ducked ? 'Paused while the mic is on' : playback.playing ? 'Now playing' : 'Ready when you are'}</p>
      <fieldset className={roomStyles['music-source'] + ' mb-3!'}>
        <legend className="sr-only">Listen to</legend>
        {(['lofi', 'spotify'] as const).map(source => <label key={source}>
          <input type="radio" name={id + '-source'} checked={music.source === source} onChange={() => selectMusicSource(source)} />
          <span>{source === 'lofi' ? 'Lo-fi' : 'Spotify'}</span>
        </label>)}
      </fieldset>
      <div hidden={music.source !== 'lofi'}><LofiPlayer /></div>
      <div className="music-spotify min-w-0" hidden={music.source !== 'spotify'}>
        {music.visited && <SpotifyContent selected={music.source === 'spotify'} />}
      </div>
      <PlayerPicker />
    </div>
  </dialog>, document.body);
}

function SpotifyContent({ selected }: { selected: boolean }) {
  const [visited, setVisited] = useState(selected);
  useEffect(() => { if (selected) setVisited(true); }, [selected]);
  return visited ? <SpotifyRadio /> : null;
}

function LofiPlayer() {
  const r = useRadio(), id = useId();
  return <section className="music-now" aria-label="Lo-fi radio">
    <label htmlFor={id + '-mood'} className="mb-1 block text-xs text-[var(--ink-2)]">A mood for now</label>
    <select id={id + '-mood'} value={r.mood} onChange={event => radio.selectMood(radioMoods.find(mood => mood.name === event.target.value)!.index)}
      className="min-h-11 w-full rounded-xl border border-[var(--hair)] bg-[var(--panel)] px-3 text-sm text-[var(--ink)]">
      {radioMoods.map(mood => <option key={mood.name} value={mood.name}>{mood.name}</option>)}
    </select>
    <div className={roomStyles['music-controls'] + ' music-controls mt-3! mb-2!'}>
      <button type="button" onClick={() => radio.skip(-1)} aria-label="Previous mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
      <button type="button" className={'music-play ' + roomStyles['music-play']} onClick={() => void radio.toggle()} aria-label={r.playing || r.ducked ? 'Pause lo-fi radio' : 'Play lo-fi radio'}><PlayIcon paused={!r.playing && !r.ducked} /></button>
      <button type="button" onClick={() => radio.skip(1)} aria-label="Next mood"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" /></svg></button>
    </div>
    <Volume />
    <p className="mb-0 mt-2 text-center text-xs text-[var(--ink-2)]">Music steps aside while your mic is on.</p>
  </section>;
}
