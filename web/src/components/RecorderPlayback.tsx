import { useEffect, useState } from "react";
import { loadPeaks } from "./AudioPlayer";
import { useTakeAudio } from "./takeAudio";

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** The waveform and pitch chart use the same audio, so seeking keeps both in step. */
export function RecorderPlayback({ src }: { src: string }) {
  const play = useTakeAudio(src);
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    let live = true;
    setBars([]);
    void loadPeaks(src, 72).then((p) => {
      if (!live || !p) return;
      const max = Math.max(0.01, ...Array.from(p));
      setBars(Array.from(p, v => 0.12 + 0.88 * (v / max)));
    });
    return () => { live = false; };
  }, [src]);
  const position = play.dur > 0 ? Math.min(play.t, play.dur) : 0;
  const fraction = play.dur > 0 ? position / play.dur : 0;
  return <div className="prc-player dr-playback">
    <button className="play-btn" onClick={play.toggle} aria-label={play.playing ? "Pause" : "Play your recording"}>
      <svg viewBox="0 0 20 20" aria-hidden="true">{play.playing
        ? <path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" fill="currentColor" />
        : <path d="M6 3.5L16 10 6 16.5z" fill="currentColor" />}</svg>
    </button>
    <div className="dr-playback-body">
      <div className="dr-playback-label"><span>Your recording</span><span>{time(position)} <span aria-hidden="true">/</span> {play.dur > 0 ? time(play.dur) : "–:––"}</span></div>
      <div className="dr-seek">
        <div className="prc-wave" aria-hidden="true">{(bars.length ? bars : Array(72).fill(0.12)).map((h, i, arr) => <i key={i} className={i / arr.length < fraction ? "on" : ""} style={{ transform: `scaleY(${h.toFixed(3)})` }} />)}</div>
        <input type="range" min="0" max={play.dur || 1} step="0.1" value={position} disabled={!play.dur}
          aria-label="Recording position" aria-valuetext={`${time(position)} of ${time(play.dur)}`}
          onChange={e => play.scrub(Number(e.currentTarget.value))} />
      </div>
      {play.error && <p className="ve-err" role="alert">{play.error}</p>}
    </div>
  </div>;
}
