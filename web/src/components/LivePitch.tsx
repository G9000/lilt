import { useEffect, useRef, useState } from "react";
import { noteName, recentMedian, steadinessSt, trackLive } from "../pitch";
import { PianoRoll, PitchPoint } from "./PianoRoll";

/** Live pitch frames from a stream while `active`. Display only; nothing here is saved. */
export function useLivePitch(stream: MediaStream | null, active: boolean) {
  const [points, setPoints] = useState<PitchPoint[]>([]);
  const buf = useRef<PitchPoint[]>([]);
  useEffect(() => {
    if (!stream || !active) return;
    buf.current = [];
    setPoints([]);
    let raf = 0;
    const tracker = trackLive(stream, (t, f) => { buf.current.push({ t, hz: f.hz }); });
    const paint = () => {
      // Keep the last 30 s for display.
      const b = buf.current;
      const cut = b.length && b[b.length - 1].t - 30;
      if (cut && b[0].t < cut) buf.current = b.filter((p) => p.t >= cut);
      setPoints([...buf.current]);
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => { cancelAnimationFrame(raf); tracker.stop(); };
  }, [stream, active]);
  return points;
}

export function LiveReadout({ points, band, showSteadiness }: { points: PitchPoint[]; band?: [number, number] | null; showSteadiness?: boolean }) {
  const hz = recentMedian(points.map((p) => p.hz));
  const last2s = points.length ? points.filter((p) => p.t > points[points.length - 1].t - 2).map((p) => p.hz) : [];
  const sd = steadinessSt(last2s);
  const inBand = hz !== null && band ? hz >= band[0] && hz <= band[1] : null;
  // Steadiness bar: 0 st wobble → full, 1.5 st or more → empty.
  const steadyPct = sd === null ? 0 : Math.max(0, Math.min(100, 100 - (sd / 1.5) * 100));
  return (
    <div className="vreadout">
      <div className="readout" aria-live="off">
        <span className="hz">{hz ? `${hz.toFixed(0)} Hz` : "Listening…"}</span>
        <span className="note">{hz ? noteName(hz) : "–"}</span>
        {inBand !== null && (
          <span className={`vpill${inBand ? " ok" : ""}`}>{inBand ? "In your range" : "Outside your range"}</span>
        )}
      </div>
      {showSteadiness && (
        <div className="steady" aria-label={sd === null ? "Steadiness: waiting for a hum" : `Steadiness: pitch wavers about ${sd.toFixed(2)} semitones`}>
          <span className="steady-k">Steadiness</span>
          <div className="steady-bar"><div style={{ width: `${steadyPct}%` }} /></div>
          <span className="steady-v">{sd === null ? "hum to see" : sd < 0.3 ? "smooth" : sd < 0.8 ? "a little wobbly" : "moving"}</span>
        </div>
      )}
    </div>
  );
}

export function LiveRoll({ points, band, height = 200 }: { points: PitchPoint[]; band?: [number, number] | null; height?: number }) {
  const dur = points.length ? points[points.length - 1].t : 0;
  return <PianoRoll points={points} duration={dur} live windowS={8} band={band} height={height} label="Live pitch over the last eight seconds" />;
}
