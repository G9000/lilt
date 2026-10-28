import { useEffect, useRef, useState } from "react";
import { PianoRoll, PitchPoint, contourPoints } from "./PianoRoll";
import { knowDuration } from "./takeAudio";

// Waveform peaks from the actual recording, decoded in the browser. Decoding only
// reads the downloaded bytes; nothing is written back.
const peakCache = new Map<string, Promise<Float32Array | null>>();
const durCache = new Map<string, number>();

export function loadPeaks(src: string, buckets = 600): Promise<Float32Array | null> {
  let p = peakCache.get(src);
  if (!p) {
    p = (async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        void ctx.close();
        durCache.set(src, audio.duration);
        const ch = audio.getChannelData(0);
        const out = new Float32Array(buckets);
        const step = Math.max(1, Math.floor(ch.length / buckets));
        for (let i = 0; i < buckets; i++) {
          let m = 0;
          for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(ch[j]));
          out[i] = m;
        }
        return out;
      } catch {
        return null; // e.g. a format this browser can't decode; playback may still work
      }
    })();
    peakCache.set(src, p);
  }
  return p;
}

const fmt = (t: number) => (isFinite(t) ? `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}` : "–");

export interface PlayerProps {
  src: string;
  label: string;
  tag?: string;
  segment?: [number, number] | null;
  segmentLabel?: string;
  /** Increment to seek to the segment and play it ("Hear the moment"). */
  playSegmentSignal?: number;
  knownDuration?: number | null;
  compact?: boolean;
  /** Show the measured pitch line for this take (fetched from its stored analysis). */
  pitchTakeId?: string;
  band?: [number, number] | null;
}

/** Stored Praat contour for a take, as plot points (null until analysed). */
export function useTakePitch(takeId: string | undefined, ready = true): PitchPoint[] | null {
  const [pts, setPts] = useState<PitchPoint[] | null>(null);
  useEffect(() => {
    if (!takeId || !ready) return;
    let live = true;
    fetch(`/api/takes/${takeId}/analysis`).then((r) => (r.ok ? r.json() : null)).then((a) => {
      if (live && a?.status === "ok") setPts(contourPoints(a));
    }, () => undefined);
    return () => { live = false; };
  }, [takeId, ready]);
  return pts;
}

export function AudioPlayer({ src, label, tag, segment, segmentLabel, playSegmentSignal, knownDuration, compact, pitchTakeId, band }: PlayerProps) {
  const pitch = useTakePitch(pitchTakeId);
  const audio = useRef<HTMLAudioElement>(null);
  // Decoded duration also covers WebM files that carry no duration header.
  const canvas = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState<number>(knownDuration ?? NaN);
  useEffect(() => { if (knownDuration && !isFinite(dur)) setDur(knownDuration); }, [knownDuration]); // eslint-disable-line react-hooks/exhaustive-deps
  const [playing, setPlaying] = useState(false);
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    void loadPeaks(src).then((p) => {
      if (!live) return;
      setPeaks(p);
      const d = durCache.get(src);
      if (d) setDur((cur) => (isFinite(cur) ? cur : d));
    });
    return () => { live = false; };
  }, [src]);

  useEffect(() => {
    const stop = () => audio.current?.pause();
    // A / B keys: play the player with that tag, pausing the others.
    const playTag = (e: Event) => {
      const a = audio.current;
      if (!a || !tag) return;
      if ((e as CustomEvent).detail === tag) { if (a.paused) void a.play(); else a.pause(); }
      else a.pause();
    };
    window.addEventListener("lilt:stop-playback", stop);
    window.addEventListener("lilt:play-tag", playTag);
    return () => { window.removeEventListener("lilt:stop-playback", stop); window.removeEventListener("lilt:play-tag", playTag); };
  }, [tag]);

  useEffect(() => {
    if (!playSegmentSignal || !segment || !audio.current) return;
    const a = audio.current;
    a.currentTime = Math.max(0, segment[0] - 0.2);
    stopAt.current = segment[1] + 0.2;
    void a.play();
  }, [playSegmentSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const css = getComputedStyle(c);
    const base = css.getPropertyValue("--wave").trim() || "#e6a9c0";
    const played = css.getPropertyValue("--wave-played").trim() || "#b8336a";
    const frac = isFinite(dur) && dur > 0 ? t / dur : 0;
    if (!peaks) {
      g.fillStyle = base;
      g.fillRect(0, h / 2 - 1.5, w, 3);
      g.fillStyle = played;
      g.fillRect(0, h / 2 - 1.5, w * frac, 3);
      return;
    }
    // Rounded bars with small gaps (about 4px a bar), each the loudest bucket it covers.
    const bars = Math.max(16, Math.floor(w / 4));
    const per = peaks.length / bars;
    const max = Math.max(0.02, ...peaks);
    const slot = w / bars;
    const bw = Math.max(1.5, slot - 1.5);
    for (let i = 0; i < bars; i++) {
      let m = 0;
      for (let j = Math.floor(i * per); j < Math.min(peaks.length, Math.floor((i + 1) * per)); j++) m = Math.max(m, peaks[j]);
      const v = Math.max(1, (m / max) * (h / 2 - 1));
      g.fillStyle = (i + 0.5) / bars <= frac ? played : base;
      const x = i * slot, y = h / 2 - v, bh = v * 2;
      if (g.roundRect) { g.beginPath(); g.roundRect(x, y, bw, bh, Math.min(bw / 2, bh / 2)); g.fill(); }
      else g.fillRect(x, y, bw, bh);
    }
  }, [peaks, t, dur]);

  const toggle = () => {
    const a = audio.current!;
    stopAt.current = null;
    if (a.paused) {
      window.dispatchEvent(new Event("lilt:stop-playback"));
      void a.play();
    } else a.pause();
  };

  const seekFrac = (f: number) => {
    // Header-less WebM reports an infinite duration, so seek against the decoded one.
    const a = audio.current!;
    const d = isFinite(a.duration) ? a.duration : dur;
    if (isFinite(d)) a.currentTime = Math.max(0, Math.min(1, f)) * d;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const a = audio.current!;
    if (e.key === "ArrowRight") { a.currentTime = Math.min(isFinite(a.duration) ? a.duration : dur || 0, a.currentTime + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { a.currentTime = Math.max(0, a.currentTime - 1); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter") { toggle(); e.preventDefault(); }
    else if (e.key === "Home") { a.currentTime = 0; e.preventDefault(); }
  };

  const segStyle = segment && isFinite(dur) && dur > 0
    ? { left: `${(segment[0] / dur) * 100}%`, width: `${Math.max(0.5, ((segment[1] - segment[0]) / dur) * 100)}%` }
    : null;

  return (
    <div className={compact ? "player compact" : "player"}>
      <div className="player-head">
        {tag && <span className="ab-tag" aria-hidden="true">{tag}</span>}
        <span className="label">{label}</span>
        <span className="spacer" />
        <span className="time" aria-live="off">{fmt(t)} / {fmt(dur)}</span>
      </div>
      <div className="player-main" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="play-btn" onClick={toggle} aria-label={`${playing ? "Pause" : "Play"} ${label}`}>
          {playing
            ? <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="3" width="4" height="14" rx="1" fill="currentColor" /><rect x="12" y="3" width="4" height="14" rx="1" fill="currentColor" /></svg>
            : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor" /></svg>}
        </button>
        <div
          className="wave"
          style={{ flex: 1, height: compact ? 44 : 64 }}
          role="slider"
          tabIndex={0}
          aria-label={`Position in ${label}`}
          aria-valuemin={0}
          aria-valuemax={isFinite(dur) ? Math.round(dur * 10) / 10 : 0}
          aria-valuenow={Math.round(t * 10) / 10}
          aria-valuetext={`${fmt(t)} of ${fmt(dur)}`}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            seekFrac((e.clientX - r.left) / r.width);
          }}
        >
          <canvas ref={canvas} />
          {segStyle && <div className="seg" style={segStyle} title={segmentLabel ?? "Evidence segment"} />}
          {isFinite(dur) && dur > 0 && (playing || t > 0) && <div className="cursor" style={{ left: `${(t / dur) * 100}%` }} />}
        </div>
      </div>
      {pitch && isFinite(dur) && (
        <div style={{ marginTop: 10 }}>
          <PianoRoll points={pitch} duration={dur} currentTime={t} band={band}
            onSeek={(x) => { const a = audio.current!; a.currentTime = x; if (a.paused) void a.play(); }}
            label={`Measured pitch line for ${label}. Click to play from a point.`} height={compact ? 140 : 180} />
          <p className="small muted" style={{ margin: "4px 0 0" }}>Measured pitch (Praat). Click the line to play from there. Gaps are unvoiced or silent.</p>
        </div>
      )}
      {segment && (
        <p className="small muted" style={{ margin: "6px 0 0" }}>
          Highlighted: {segmentLabel ?? "evidence segment"}, {segment[0].toFixed(2)}–{segment[1].toFixed(2)} s
        </p>
      )}
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (isFinite(d)) setDur(d); else knowDuration(e.currentTarget); }}
        onDurationChange={(e) => { const d = e.currentTarget.duration; if (isFinite(d)) setDur(d); }}
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          setT(ct);
          if (stopAt.current !== null && ct >= stopAt.current) { e.currentTarget.pause(); stopAt.current = null; }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
