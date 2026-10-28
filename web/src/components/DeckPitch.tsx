import { useEffect, useState } from "react";
import { api, Comparison, Take } from "../api";
import { describeTake } from "../insight";
import { noteName } from "../pitch";
import { contourPoints, PitchPoint } from "./PianoRoll";

/** Pitch scale used by the meter and the result chart: log Hz between LO and HI. */
const LO = 75, HI = 450;
const frac = (hz: number) => Math.max(0, Math.min(1, Math.log(hz / LO) / Math.log(HI / LO)));

export interface Measured { median: number | null; take: Take }

/** One observation and one thing to try, in words, above the numbers. */
function InsightNote({ analysis, band }: { analysis: any; band: [number, number] | null }) {
  const m = analysis?.measures ?? {};
  const said = describeTake({ median: m.f0_median_hz?.value ?? null, spanSt: m.f0_p10_p90_span_st?.value ?? null, band, pts: contourPoints(analysis) });
  if (!said) return null;
  return <div className="prc-insight"><p className="n">{said.note}</p><p className="c"><b>Try</b> {said.cue}</p></div>;
}

/** The note for a take that's shown elsewhere (a chapter's players): loads its analysis once ready. */
export function TakeInsight({ take, band }: { take: Take; band: [number, number] | null }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const ready = take.status === "review_ready";
  useEffect(() => {
    if (!ready) return;
    let live = true;
    void api.analysis(take.id).then((a) => { if (live) setAnalysis(a); }, () => undefined);
    return () => { live = false; };
  }, [take.id, ready]);
  return analysis ? <InsightNote analysis={analysis} band={band} /> : null;
}

const fmtHz = (hz: number | null | undefined) => (hz ? `${Math.round(hz)} Hz` : "–");

/** What the analysis measured for a take, with last time on the same card when they're comparable. */
export function TakeResult({ take: initial, band, onMeasured }: { take: Take; band: [number, number] | null; onMeasured?: (m: Measured) => void }) {
  const [take, setTake] = useState(initial);
  const [analysis, setAnalysis] = useState<any>(null);
  const [prev, setPrev] = useState<{ take: Take; cmp: Comparison | null; analysis: any } | null>(null);

  // Analysis runs in the background; poll until it lands.
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const t = await api.take(initial.id).catch(() => null);
      if (!live || !t) return;
      setTake(t);
      if (t.analysis_summary || t.analysis_error || t.status === "analysis_failed") {
        const a = t.analysis_summary ? await api.analysis(t.id).catch(() => null) : null;
        if (!live) return;
        setAnalysis(a);
        onMeasured?.({ median: a?.measures?.f0_median_hz?.value ?? null, take: t });
        return;
      }
      window.setTimeout(tick, 1200);
    };
    void tick();
    return () => { live = false; };
  }, [initial.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Last time on this card (same prompt), if any.
  useEffect(() => {
    if (!analysis) return;
    let live = true;
    void api.history({ prompt_id: take.prompt_id, days: 60 }).then(async (h) => {
      const earlier = h.takes.filter((t) => t.id !== take.id && t.analysis_summary?.f0_median_hz && t.created_utc < take.created_utc).sort((a, b) => b.created_utc.localeCompare(a.created_utc))[0];
      if (!earlier || !live) return;
      const [cmp, a] = await Promise.all([api.compare(earlier.id, take.id).catch(() => null), api.analysis(earlier.id).catch(() => null)]);
      if (live) setPrev({ take: earlier, cmp, analysis: a });
    });
    return () => { live = false; };
  }, [analysis, take.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!analysis) {
    if (take.analysis_error || take.status === "analysis_failed") return <div className="prc-result"><p className="prc-wait">Couldn't measure this one{take.analysis_error ? `: ${take.analysis_error}` : ""}. Your recording is still saved.</p></div>;
    return <div className="prc-result"><p className="prc-wait"><i className="prc-spin" aria-hidden="true" />Measuring your pitch…</p></div>;
  }

  const m = analysis.measures ?? {};
  const median: number | null = m.f0_median_hz?.value ?? null;
  const p10: number | null = m.f0_p10_hz?.value ?? null, p90: number | null = m.f0_p90_hz?.value ?? null;
  const voiced: number | null = m.voiced_frame_coverage?.value ?? null;
  const flags: { code: string; message: string }[] = analysis.quality_flags ?? [];
  const pts = contourPoints(analysis);
  const prevPts = prev?.analysis ? contourPoints(prev.analysis) : null;
  const comparable = prev?.cmp && prev.cmp.outcome !== "not_comparable";
  const prevMedian = prev?.take.analysis_summary?.f0_median_hz ?? null;

  return (
    <div className="prc-result" aria-label="What Lilt measured" role="group">
      {median === null ? (
        <p className="prc-wait">No clear pitch in this take (it may have been very quiet, whispered or noisy). That's fine, it's still saved.</p>
      ) : (
        <>
          <InsightNote analysis={analysis} band={band} />
          <div className="prc-stats">
            <div><span>Middle pitch</span><b>{fmtHz(median)}<small>{noteName(median)}</small></b></div>
            <div><span>Usual range</span><b>{p10 && p90 ? `${Math.round(p10)}–${Math.round(p90)} Hz` : "–"}</b></div>
            <div><span>Voice heard</span><b>{voiced !== null ? `${Math.round(voiced * 100)}%` : "–"}</b></div>
          </div>
          <ContourChart pts={pts} prev={comparable ? prevPts : null} median={median} band={band} />
          {prev && (
            <p className="prc-prev">
              {comparable && prevMedian ? (
                <>Last time on this card ({prev.take.local_date ?? prev.take.created_utc.slice(0, 10)}): <b>{fmtHz(prevMedian)}</b>. This time is <b>{median - prevMedian >= 0 ? "+" : "−"}{Math.abs(Math.round(median - prevMedian))} Hz</b>.</>
              ) : (
                <>Not compared with last time: {prev.cmp?.reasons[0] ?? "the recordings aren't comparable"}.</>
              )}
            </p>
          )}
        </>
      )}
      {flags.length > 0 && <ul className="prc-flags">{flags.map((f) => <li key={f.code}>{f.message}</li>)}</ul>}
      <p className="prc-cap">Describes the recording. Never a grade, never your rating.</p>
    </div>
  );
}

function ContourChart({ pts, prev, median, band }: { pts: PitchPoint[]; prev: PitchPoint[] | null; median: number; band: [number, number] | null }) {
  const Wd = 600, Ht = 96;
  const dur = Math.max(pts.length ? pts[pts.length - 1].t : 1, prev?.length ? prev[prev.length - 1].t : 0, 0.5);
  const path = (ps: PitchPoint[]) => {
    let d = "", pen = false;
    for (const p of ps) {
      if (!p.hz) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${((p.t / dur) * Wd).toFixed(1)},${(Ht - frac(p.hz) * Ht).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const y = (hz: number) => Ht - frac(hz) * Ht;
  return (
    <figure className="prc-chart">
      <svg viewBox={`0 0 ${Wd} ${Ht}`} preserveAspectRatio="none" role="img" aria-label={`Measured pitch over the take; middle ${Math.round(median)} Hz`}>
        {band && <rect x="0" width={Wd} y={y(band[1])} height={y(band[0]) - y(band[1])} className="prc-band" />}
        {[110, 165, 220, 330].map((g) => <line key={g} x1="0" x2={Wd} y1={y(g)} y2={y(g)} className="prc-grid" />)}
        {prev && <path d={path(prev)} className="prc-prevline" vectorEffect="non-scaling-stroke" />}
        <line x1="0" x2={Wd} y1={y(median)} y2={y(median)} className="prc-median" vectorEffect="non-scaling-stroke" />
        <path d={path(pts)} className="prc-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>
        <span><i className="prc-k now" />this take</span>
        {prev && <span><i className="prc-k prev" />last time</span>}
        <span><i className="prc-k mid" />middle</span>
        {band && <span><i className="prc-k band" />your range</span>}
      </figcaption>
    </figure>
  );
}
