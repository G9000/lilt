import { useEffect, useState } from "react";
import { api, Comparison, PitchReference, Take } from "../api";
import { describeResonance, describeTake, placePitch } from "../insight";
import { noteName } from "../pitch";
import { contourPoints, PianoRoll, PitchPoint } from "./PianoRoll";
import { useTakeAudio } from "./takeAudio";


export interface Measured { median: number | null; take: Take }

/** One observation and one thing to try, in words, above the numbers. */
function InsightNote({ analysis, band }: { analysis: any; band: [number, number] | null }) {
  const m = analysis?.measures ?? {};
  const said = describeTake({ median: m.f0_median_hz?.value ?? null, spanSt: m.f0_p10_p90_span_st?.value ?? null, band, pts: contourPoints(analysis) });
  if (!said) return null;
  return <div className="prc-insight"><p className="n">{said.note}</p><p className="c"><b>Try</b> {said.cue}</p></div>;
}

let reference: Promise<PitchReference | null> | null = null;
const pitchReference = () => (reference ??= api.texts().then((t) => t.pitch_reference ?? null, () => null));

/**
 * Where your middle pitch sits against the average man's and woman's speaking voices, on a scale, with one
 * sentence in semitones. Descriptive only: no percentages, no score. The numbers come from
 * content/courses/voice/_pitch.md.
 */
export function PitchScale({ median, note = true }: { median: number; note?: boolean }) {
  const [ref, setRef] = useState<PitchReference | null>(null);
  useEffect(() => { void pitchReference().then(setRef); }, []);
  if (!ref) return null;
  const LO = 80, HI = 280, at = (hz: number) => Math.max(0, Math.min(100, (Math.log(hz / LO) / Math.log(HI / LO)) * 100));
  const band = (lo: number, hi: number) => ({ left: `${at(lo)}%`, width: `${at(hi) - at(lo)}%` });
  const men: [number, number] = [ref.men_mean - ref.men_sd, ref.men_mean + ref.men_sd], women: [number, number] = [ref.women_mean - ref.women_sd, ref.women_mean + ref.women_sd];
  return (
    <figure className="pscale">
      <div className="pscale-track" role="img" aria-label={placePitch(median, ref)}>
        <span className="men" style={band(...men)} />
        <span className="either" style={band(ref.overlap_low, ref.overlap_high)} />
        <span className="women" style={band(...women)} />
        <i className="avg" style={{ left: `${at(ref.men_mean)}%` }} />
        <i className="avg" style={{ left: `${at(ref.women_mean)}%` }} />
        <b className="you" style={{ left: `${at(median)}%` }} />
      </div>
      <div className="pscale-labels" aria-hidden="true">
        <span style={{ left: `${at(ref.men_mean)}%` }}>Average man<small>{Math.round(men[0])}–{Math.round(men[1])} Hz</small></span>
        <span style={{ left: `${at((ref.overlap_low + ref.overlap_high) / 2)}%` }}>Either<small>{ref.overlap_low}–{ref.overlap_high} Hz</small></span>
        <span style={{ left: `${at(ref.women_mean)}%` }}>Average woman<small>{Math.round(women[0])}–{Math.round(women[1])} Hz</small></span>
      </div>
      <figcaption>
        {placePitch(median, ref)}
        {note && <span title={ref.source}>Pitch is one part of how a voice is heard; resonance and intonation matter as much. Averages from Leung et al. (2022).</span>}
      </figcaption>
    </figure>
  );
}

type Resonance =
  | { k: "start"; unmeasured: boolean }
  | { k: "apart"; reason: string }
  | { k: "change"; first: number; last: number | null };

const shiftOf = (c: Comparison | null) => c?.measures.find((m) => m.name === "resonance_f2_f3_st")?.delta ?? null;

/**
 * Resonance against yourself: how far F2 and F3 moved since your first take of the same text (and since
 * last time), on a darker–brighter strip, in words. Formants depend on the vowel, so only takes of the
 * same text are compared, and only with the same microphone (the comparison says when not).
 */
export function ResonanceNote({ take }: { take: Take }) {
  const [r, setR] = useState<Resonance | null>(null);
  const measured = take.status === "review_ready" && !!take.analysis_summary?.formant_f2_median_hz;
  useEffect(() => {
    if (!measured) return;
    let live = true;
    void (async () => {
      const h = await api.history({ prompt_id: take.prompt_id, days: 3650 }).catch(() => null);
      if (!h || !live) return;
      const earlier = h.takes.filter((t) => t.id !== take.id && t.created_utc < take.created_utc && t.analysis_summary).sort((a, b) => a.created_utc.localeCompare(b.created_utc));
      const withF = earlier.filter((t) => t.analysis_summary?.formant_f2_median_hz);
      if (!withF.length) { setR({ k: "start", unmeasured: earlier.length > 0 }); return; }
      const first = withF[0], last = withF[withF.length - 1];
      const [cf, cl] = await Promise.all([api.compare(first.id, take.id).catch(() => null), last !== first ? api.compare(last.id, take.id).catch(() => null) : null]);
      if (!live) return;
      if (!cf || cf.outcome === "not_comparable" || shiftOf(cf) === null) setR({ k: "apart", reason: cf?.reasons[0] ?? "The takes couldn't be compared." });
      else setR({ k: "change", first: shiftOf(cf)!, last: cl && cl.outcome !== "not_comparable" ? shiftOf(cl) : null });
    })();
    return () => { live = false; };
  }, [take.id, measured]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!measured || !r) return null;
  const at = (st: number) => `${50 + (Math.max(-3, Math.min(3, st)) / 3) * 50}%`;
  return (
    <section className="rz" aria-label="Resonance">
      <div className="rz-head"><b>Resonance</b><small>against your own takes of this text</small></div>
      {r.k === "change" && (
        <>
          <div className="rz-track" role="img" aria-label={describeResonance(r.first, "your first take of this text")}>
            <i className="rz-first" />
            {r.last !== null && <i className="rz-last" title="Last time" style={{ left: at(r.first - r.last) }} />}
            <b className="rz-you" style={{ left: at(r.first) }} />
          </div>
          <div className="rz-labels" aria-hidden="true"><span>Darker</span><span>First take</span><span>Brighter</span></div>
          <p className="rz-say">{describeResonance(r.first, "your first take of this text")}{r.last !== null && <> {describeResonance(r.last, "last time")}</>}</p>
        </>
      )}
      {r.k === "start" && <p className="rz-say">Measured. This take is your starting point for this text; later takes are compared with it.{r.unmeasured && " Your earlier takes were recorded before Lilt measured resonance: measure them again in Recordings to compare them too."}</p>}
      {r.k === "apart" && <p className="rz-say">Not compared: {r.reason}</p>}
      <p className="rz-foot">From F2 and F3, two resonances of your vowels. A rough guide; your ear decides.</p>
    </section>
  );
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
  const median: number | null = analysis?.measures?.f0_median_hz?.value ?? null;
  return analysis ? <><InsightNote analysis={analysis} band={band} />{median && <PitchScale median={median} />}</> : null;
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

  const shift = comparable && prevMedian ? Math.round(median! - prevMedian) : null;
  return (
    <div className="prc-result" aria-label="What Lilt measured" role="group">
      {median === null ? (
        <p className="prc-wait">No clear pitch in this take (it may have been very quiet, whispered or noisy). That's fine, it's still saved.</p>
      ) : (
        <>
          <InsightNote analysis={analysis} band={band} />
          {/* Your pitch: the number once, where it sits, then the other facts in one quiet line. */}
          <section className="tr-pitch" aria-label="Your pitch">
            <p className="tr-head">Your middle pitch <b>{fmtHz(median)}</b><span>{noteName(median)}</span></p>
            <PitchScale median={median} note={false} />
            <p className="tr-facts">
              {p10 && p90 && <span>Usual range <b>{Math.round(p10)}–{Math.round(p90)} Hz</b></span>}
              {voiced !== null && <span>Voice heard <b>{Math.round(voiced * 100)}%</b></span>}
              {prev && comparable && prevMedian && <span>Last time <b>{fmtHz(prevMedian)}</b> ({shift! >= 0 ? "+" : "−"}{Math.abs(shift!)} Hz)</span>}
            </p>
          </section>
          <TakeChart src={take.audio_url} pts={pts} prev={comparable ? prevPts : null} median={median} band={band} />
          <ResonanceNote take={take} />
          {prev && !comparable && <p className="prc-prev">Not compared with last time: {prev.cmp?.reasons[0] ?? "the recordings aren't comparable"}.</p>}
        </>
      )}
      {flags.length > 0 && <ul className="prc-flags">{flags.map((f) => <li key={f.code}>{f.message}</li>)}</ul>}
      <p className="prc-cap">Describes the recording, never a grade. Pitch is one part of how a voice is heard; averages from Leung et al. (2022).</p>
    </div>
  );
}

/**
 * The take's pitch line, playable: the same chart as the live one, with a playhead that follows
 * the recording (shared with the listen-back button above). Click anywhere to hear that moment.
 */
function TakeChart({ src, pts, prev, median, band }: { src: string; pts: PitchPoint[]; prev: PitchPoint[] | null; median: number; band: [number, number] | null }) {
  const play = useTakeAudio(src);
  const dur = Math.max(play.dur, pts.length ? pts[pts.length - 1].t : 0.5);
  return (
    <figure className="prc-chart tr-chart">
      <PianoRoll points={pts} duration={dur} currentTime={play.ended ? undefined : play.t} onSeek={play.seek} band={band} median={median} prev={prev} height={150}
        label={`Your pitch over the take, middle ${Math.round(median)} Hz. Click to hear that moment.`} />
      <figcaption>
        <span><i className="prc-k now" />this take</span>
        {prev && <span><i className="prc-k prev" />last time</span>}
        <span><i className="prc-k mid" />middle</span>
        {band && <span><i className="prc-k band" />your range</span>}
        <span className="tr-hint">Click the line to hear that moment</span>
      </figcaption>
    </figure>
  );
}
