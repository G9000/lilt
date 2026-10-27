import { useEffect, useRef } from "react";
import { hzToMidi, midiToHz, noteName } from "../pitch";

export interface PitchPoint { t: number; hz: number | null }

interface Props {
  points: PitchPoint[];
  duration: number;
  /** Playback position in seconds, drawn as a playhead. */
  currentTime?: number;
  onSeek?: (t: number) => void;
  /** Learner-chosen comfortable range, shaded. Never a gendered zone. */
  band?: [number, number] | null;
  /** Live mode: show the last `windowS` seconds and follow the newest point. */
  live?: boolean;
  windowS?: number;
  height?: number;
  label: string;
}

const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11]);

export function PianoRoll({ points, duration, currentTime, onSeek, band, live, windowS = 8, height = 200, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    c.width = w * dpr;
    c.height = h * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const css = getComputedStyle(c);
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
    const ink = v("--ink", "#333"), muted = v("--muted", "#888"), line = v("--line-strong", v("--line", "#ddd"));
    const accent = v("--accent", "#c2416f"), bandFill = v("--band", "rgba(194,65,111,0.12)");

    const tEnd = live ? Math.max(duration, windowS) : Math.max(duration, 0.1);
    const tStart = live ? tEnd - windowS : 0;
    const voiced = points.filter((p) => p.hz !== null && p.t >= tStart) as { t: number; hz: number }[];
    // Vertical range: fit the data and the band, at least an octave, padded by 2 semitones.
    const ms = voiced.map((p) => hzToMidi(p.hz));
    if (band) ms.push(hzToMidi(band[0]), hzToMidi(band[1]));
    let lo = ms.length ? Math.min(...ms) : hzToMidi(110);
    let hi = ms.length ? Math.max(...ms) : hzToMidi(330);
    if (hi - lo < 12) { const mid = (hi + lo) / 2; lo = mid - 6; hi = mid + 6; }
    lo = Math.floor(lo - 2); hi = Math.ceil(hi + 2);
    const padL = 40;
    const X = (t: number) => padL + ((t - tStart) / (tEnd - tStart)) * (w - padL - 6);
    const Y = (m: number) => h - 6 - ((m - lo) / (hi - lo)) * (h - 12);

    g.clearRect(0, 0, w, h);
    // Band
    if (band) {
      g.fillStyle = bandFill;
      const y1 = Y(hzToMidi(band[1])), y0 = Y(hzToMidi(band[0]));
      g.fillRect(padL, y1, w - padL, y0 - y1);
    }
    // Semitone grid with note labels on naturals.
    g.font = `500 11px ${v("--font", "system-ui, sans-serif")}`;
    g.textBaseline = "middle";
    let lastLabelY = Infinity;
    for (let m = lo; m <= hi; m++) {
      const pc = ((m % 12) + 12) % 12;
      const y = Y(m);
      g.strokeStyle = line;
      g.globalAlpha = pc === 0 ? 0.9 : NATURAL.has(pc) ? 0.45 : 0.18;
      g.beginPath(); g.moveTo(padL, y); g.lineTo(w, y); g.stroke();
      g.globalAlpha = 1;
      // Label naturals, skipping any that would crowd the previous label (C always wins).
      if (NATURAL.has(pc) && (lastLabelY - y >= 13 || (pc === 0 && lastLabelY - y >= 8))) {
        g.fillStyle = pc === 0 ? ink : muted;
        g.fillText(noteName(midiToHz(m)), 4, y);
        lastLabelY = y;
      }
    }
    // Contour: connect points closer than 80 ms; gaps stay gaps.
    g.strokeStyle = accent;
    g.lineWidth = 2.5;
    g.lineJoin = "round";
    g.lineCap = "round";
    let prev: { t: number; hz: number } | null = null;
    g.beginPath();
    for (const p of voiced) {
      const x = X(p.t), y = Y(hzToMidi(p.hz));
      if (prev && p.t - prev.t < 0.08) g.lineTo(x, y);
      else { g.moveTo(x, y); g.arc(x, y, 0.8, 0, Math.PI * 2); g.moveTo(x, y); }
      prev = p;
    }
    g.stroke();
    // Live head marker
    if (live && voiced.length) {
      const last = voiced[voiced.length - 1];
      if (tEnd - last.t < 0.15) {
        g.fillStyle = accent;
        g.beginPath(); g.arc(X(last.t), Y(hzToMidi(last.hz)), 5, 0, Math.PI * 2); g.fill();
      }
    }
    // Playhead
    if (currentTime !== undefined && !live) {
      g.strokeStyle = ink;
      g.lineWidth = 1.5;
      const x = X(currentTime);
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
  }, [points, duration, currentTime, band, live, windowS, height]);

  return (
    <canvas
      ref={ref}
      className="pianoroll"
      style={{ height, cursor: onSeek ? "pointer" : "default" }}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        if (!onSeek || live) return;
        const r = e.currentTarget.getBoundingClientRect();
        const f = (e.clientX - r.left - 40) / (r.width - 46);
        onSeek(Math.max(0, Math.min(1, f)) * duration);
      }}
    />
  );
}

/** Convert a stored Praat contour into plot points. */
export function contourPoints(analysis: any): PitchPoint[] {
  const f0: (number | null)[] = analysis?.contour?.f0_hz ?? [];
  if (!Array.isArray(f0)) return [];
  const step: number = analysis.contour.time_step ?? 0.01;
  const t0: number = analysis.contour.t0 ?? 0;
  return f0.map((hz, i) => ({ t: t0 + i * step, hz }));
}
