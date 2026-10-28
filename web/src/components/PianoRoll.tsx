import { useEffect, useRef, useState } from "react";
import { cleanContour, ContourPoint, hzToMidi, midiToHz, noteName } from "../pitch";

/** A reading; live ones also carry clarity and loudness (see `ContourPoint`). */
export type PitchPoint = ContourPoint;

interface Props {
  points: PitchPoint[];
  duration: number;
  /** Playback position in seconds, drawn as a playhead. */
  currentTime?: number;
  onSeek?: (t: number) => void;
  /** Learner-chosen comfortable range, shaded. Never a gendered zone. */
  band?: [number, number] | null;
  /** Live mode: show the last `windowS` seconds (filling from the left first) and mark the newest point. */
  live?: boolean;
  windowS?: number;
  /** A fixed pitch range in Hz, so a live chart never rescales under you. Otherwise it fits the take. */
  range?: [number, number];
  /** The take's middle pitch, as a dashed line. */
  median?: number | null;
  /** Last time's take, as a quiet grey line to compare with. */
  prev?: PitchPoint[] | null;
  /** Loudness while live (0..1 over time), drawn as a faint voice-memo waveform behind the line. */
  levels?: { t: number; v: number }[];
  /** No note labels (a slim chart). */
  compact?: boolean;
  height?: number | string;
  label: string;
}

const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11]);

/**
 * The pitch chart, the same everywhere (live while recording, after a take, in a chapter): notes
 * up the side on a semitone grid, your comfortable range shaded, every cleaned reading a faint
 * dot, and a smooth line through them (see `cleanContour`: octave slips, single-frame misreads
 * and clicks are taken out first). After a take, a playhead follows playback; click to play from there.
 */
export function PianoRoll({ points, duration, currentTime, onSeek, band, live, windowS = 8, range, median, prev, levels, compact, height = 200, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ro = new ResizeObserver(() => setSize((n) => n + 1));
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const padL = compact ? 4 : 40;
  const tEnd = live ? Math.max(duration, windowS) : Math.max(duration, 0.1);
  const tStart = live ? tEnd - windowS : 0;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
    const ink = v("--ink", "#333"), muted = v("--ink-3", v("--muted", "#888")), grid = v("--ink-3", "#999");
    const accent = "#e0643c";

    // Only the visible stretch (and a little before it) is cleaned and drawn.
    const seen = points.filter((p) => p.t >= tStart - 0.3);
    const clean = cleanContour(seen).filter((p) => p.t >= tStart);
    const before = prev ? cleanContour(prev) : null;

    // Vertical range: fixed when given; else the take's 5th–95th percentile and the band, at least an octave, padded.
    let lo: number, hi: number;
    if (range) { lo = hzToMidi(range[0]); hi = hzToMidi(range[1]); }
    else {
      const ms = clean.filter((p) => p.hz).map((p) => hzToMidi(p.hz as number)).sort((a, b) => a - b);
      const pick = (f: number) => ms[Math.min(ms.length - 1, Math.floor(ms.length * f))];
      const fit = ms.length ? [pick(0.05), pick(0.95)] : [hzToMidi(110), hzToMidi(330)];
      if (band) fit.push(hzToMidi(band[0]), hzToMidi(band[1]));
      if (median) fit.push(hzToMidi(median));
      lo = Math.min(...fit); hi = Math.max(...fit);
      if (hi - lo < 12) { const mid = (hi + lo) / 2; lo = mid - 6; hi = mid + 6; }
      lo = Math.floor(lo - 2); hi = Math.ceil(hi + 2);
    }
    const X = (t: number) => padL + ((t - tStart) / (tEnd - tStart)) * (w - padL - 6);
    const Y = (m: number) => h - 5 - ((m - lo) / (hi - lo)) * (h - 10);
    const yHz = (hz: number) => Y(hzToMidi(Math.max(midiToHz(lo), Math.min(midiToHz(hi), hz))));

    g.clearRect(0, 0, w, h);
    // Your comfortable range.
    if (band) {
      g.fillStyle = "rgba(224,100,60,0.09)";
      const y1 = yHz(band[1]), y0 = yHz(band[0]);
      g.fillRect(padL, y1, w - padL, y0 - y1);
    }
    // Semitone grid: C strongest, other naturals light, sharps faintest; naturals labelled when there's room.
    g.font = `500 11px ${v("--font", "system-ui, sans-serif")}`;
    g.textBaseline = "middle";
    let lastLabelY = Infinity;
    const step = h / (hi - lo) < 5 ? 2 : 1;
    for (let m = Math.ceil(lo); m <= hi; m++) {
      const pc = ((m % 12) + 12) % 12;
      if (step === 2 && !NATURAL.has(pc)) continue;
      const y = Math.round(Y(m)) + 0.5;
      g.strokeStyle = grid;
      g.globalAlpha = pc === 0 ? 0.32 : NATURAL.has(pc) ? 0.13 : 0.06;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(padL, y); g.lineTo(w, y); g.stroke();
      g.globalAlpha = 1;
      if (!compact && NATURAL.has(pc) && (lastLabelY - y >= 14 || (pc === 0 && lastLabelY - y >= 9))) {
        g.fillStyle = pc === 0 ? ink : muted;
        g.globalAlpha = pc === 0 ? 0.8 : 0.7;
        g.fillText(noteName(midiToHz(m)), 4, y);
        g.globalAlpha = 1;
        lastLabelY = y;
      }
    }
    // Loudness, live: one thin bar every 6 px, faint.
    if (levels?.length) {
      const lEnd = levels[levels.length - 1].t, lStart = Math.max(levels[0].t, lEnd - windowS);
      const lx = (t: number) => padL + ((t - lStart) / windowS) * (w - padL - 6);
      const bars = new Map<number, number>();
      for (const a of levels) { if (a.t < lStart) continue; const k = Math.floor(lx(a.t) / 6); bars.set(k, Math.max(bars.get(k) ?? 0, a.v)); }
      g.fillStyle = grid;
      g.globalAlpha = 0.1;
      for (const [k, val] of bars) { const hh = Math.max(2, val * h * 0.4); g.beginPath(); g.roundRect(k * 6, h / 2 - hh / 2, 2, hh, 1); g.fill(); }
      g.globalAlpha = 1;
    }
    // Last time, quietly.
    if (before) {
      g.strokeStyle = grid; g.globalAlpha = 0.45; g.lineWidth = 1.5; g.lineJoin = g.lineCap = "round";
      g.beginPath();
      let pen = false;
      for (const p of before) { if (!p.line) { pen = false; continue; } const x = X(p.t), y = yHz(p.line); if (pen) g.lineTo(x, y); else g.moveTo(x, y); pen = true; }
      g.stroke(); g.globalAlpha = 1;
    }
    // The middle, dashed.
    if (median) {
      g.strokeStyle = ink; g.globalAlpha = 0.35; g.lineWidth = 1; g.setLineDash([4, 4]);
      const y = Math.round(yHz(median)) + 0.5;
      g.beginPath(); g.moveTo(padL, y); g.lineTo(w, y); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
    }
    // Every reading, a faint dot.
    g.fillStyle = accent;
    g.globalAlpha = 0.28;
    for (const p of clean) { if (!p.hz) continue; g.beginPath(); g.arc(X(p.t), yHz(p.hz), 1.5, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    // The smooth line through them.
    g.strokeStyle = accent; g.lineWidth = compact ? 2 : 2.5; g.lineJoin = g.lineCap = "round";
    g.shadowColor = "rgba(224,100,60,0.35)"; g.shadowBlur = 6;
    g.beginPath();
    let pen = false, tip: [number, number] | null = null;
    for (const p of clean) {
      if (!p.line) { pen = false; tip = null; continue; }
      const x = X(p.t), y = yHz(p.line);
      if (pen) g.lineTo(x, y); else g.moveTo(x, y);
      pen = true; tip = [x, y];
    }
    g.stroke(); g.shadowBlur = 0;
    // Live: the newest point.
    if (live && tip && clean.length && tEnd - clean[clean.length - 1].t < 0.2) {
      g.fillStyle = "rgba(224,100,60,0.22)"; g.beginPath(); g.arc(tip[0], tip[1], 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = accent; g.beginPath(); g.arc(tip[0], tip[1], 4, 0, Math.PI * 2); g.fill();
    }
    // Playhead, with a dot where it meets the line.
    const head = (t: number, alpha: number) => {
      const x = X(t);
      g.strokeStyle = ink; g.globalAlpha = alpha; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, 2); g.lineTo(x, h - 2); g.stroke();
      const near = clean.reduce<{ d: number; p: (typeof clean)[number] | null }>((b, p) => (p.line && Math.abs(p.t - t) < b.d ? { d: Math.abs(p.t - t), p } : b), { d: 0.06, p: null }).p;
      if (near?.line) { g.fillStyle = ink; g.beginPath(); g.arc(x, yHz(near.line), 3.5, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      return near;
    };
    const hovered = !live && hover !== null ? head(hover, 0.25) : null;
    if (!live && currentTime !== undefined && currentTime > 0) head(currentTime, 0.9);
    if (!live && hover !== null) {
      // What's under the pointer, in words: "1.8 s · 172 Hz · F3", on top of everything.
      const near = hovered;
      const text = near?.hz ? `${fmtTime(hover)} · ${Math.round(near.hz)} Hz · ${noteName(near.hz)}` : fmtTime(hover);
      g.font = `600 11.5px ${v("--font", "system-ui, sans-serif")}`;
      const tw = g.measureText(text).width, bw = tw + 16, bh = 22;
      const x = Math.max(padL, Math.min(w - bw - 2, X(hover) - bw / 2));
      const dotY = near?.line ? yHz(near.line) : h / 2;
      const y = dotY - bh - 10 >= 2 ? dotY - bh - 10 : Math.min(h - bh - 2, dotY + 10);
      g.fillStyle = ink; g.globalAlpha = 0.92;
      g.beginPath(); g.roundRect(x, y, bw, bh, 7); g.fill();
      g.globalAlpha = 1; g.fillStyle = v("--panel", "#fff"); g.textBaseline = "middle";
      g.fillText(text, x + 8, y + bh / 2 + 0.5);
    }
  }, [points, duration, currentTime, band, live, windowS, range, median, prev, levels, compact, size, hover, tStart, tEnd, padL]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left - padL) / (r.width - padL - 6);
    return Math.max(0, Math.min(1, f)) * duration;
  };
  return (
    <canvas
      ref={ref}
      className="pianoroll"
      style={{ height, cursor: onSeek && !live ? "pointer" : "default" }}
      role="img"
      aria-label={label}
      onPointerMove={(e) => { if (onSeek && !live) setHover(at(e)); }}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => { if (onSeek && !live) onSeek(at(e)); }}
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

/** "1.8 s" under a minute, "1:04.2" after. */
function fmtTime(t: number): string {
  if (t < 60) return `${t.toFixed(1)} s`;
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
