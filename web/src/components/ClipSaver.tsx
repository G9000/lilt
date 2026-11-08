import { cx } from "../ui/cx";
import { practice } from "../ui/practice";
import { shared } from "../ui/shared";
import { useEffect, useRef, useState } from "react";
import type { Take } from "../api";
import { CLIP_MAX_S, clipBounds, clipTime, clipUrl } from "../clip";

/**
 * Save a take, or the part of it you choose, as a WAV file in your Downloads: to keep, or to share
 * for a voice check. "Play this part" plays the very file you'd save. Nothing is uploaded anywhere.
 */
export function ClipSaver({ take }: { take: Take }) {
  const duration = take.analysis_summary?.duration_s ?? 0;
  const ready = take.status === "review_ready" && duration > 0;
  const [[start, end], setBounds] = useState<[number, number]>(() => clipBounds(0, CLIP_MAX_S, duration));
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { audio.current?.pause(); }, []);
  if (!ready) return <p className={cx("clip-wait", practice["clip"])}>You can save a clip once this take has been measured.</p>;
  const url = clipUrl(take.id, start, end);
  const stop = () => { audio.current?.pause(); setPlaying(false); };
  const play = () => {
    if (playing) return stop();
    audio.current?.pause();
    const a = new Audio(url);
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    audio.current = a;
    void a.play().then(() => setPlaying(true), () => setPlaying(false));
  };
  const move = (s: number, e: number) => { stop(); setBounds(clipBounds(s, e, duration)); };
  const step = duration > 60 ? 1 : 0.1;
  return (
    <div className={cx("clip", practice["clip"])} role="group" aria-label="Save a clip">
      <label>
        <span>From <b>{clipTime(start)}</b></span>
        <input type="range" min={0} max={duration} step={step} value={start} onChange={(e) => move(Number(e.target.value), Math.max(end, Number(e.target.value)))} aria-label="Clip starts at" aria-valuetext={clipTime(start)} />
      </label>
      <label>
        <span>To <b>{clipTime(end)}</b></span>
        <input type="range" min={0} max={duration} step={step} value={end} onChange={(e) => move(Math.min(start, Number(e.target.value)), Number(e.target.value))} aria-label="Clip ends at" aria-valuetext={clipTime(end)} />
      </label>
      <div className={cx("clip-do", practice["clip-do"])}>
        <button type="button" className={cx("btn-secondary", shared["btn-secondary"])} onClick={play} aria-pressed={playing}>{playing ? "Stop" : "Play this part"}</button>
        <a className={cx("btn-secondary", shared["btn-secondary"])} href={url} download>Save as a file</a>
        <span>{clipTime(end - start)} long</span>
      </div>
      <p>A WAV file of this part goes to your Downloads. Nothing is uploaded: where it goes from there is up to you.{duration > CLIP_MAX_S ? " A clip can be up to five minutes." : ""}</p>
    </div>
  );
}
