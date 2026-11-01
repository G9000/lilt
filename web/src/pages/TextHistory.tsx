import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_COURSE, parseTextId } from "../courses";
import { api, Take, Texts } from "../api";
import { go } from "../App";
import { AudioPlayer } from "../components/AudioPlayer";
import { hzToMidi, midiToHz, noteName } from "../pitch";

/**
 * One text over time: your middle pitch on every take of it as a line across the weeks (your comfortable
 * range shaded), every take below to play, and any two side by side. Opens from a text's "All N takes".
 */

const day = (t: Take) => new Date(t.created_utc).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const time = (t: Take) => new Date(t.created_utc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const middle = (t: Take) => t.analysis_summary?.f0_median_hz ?? null;

export function TextHistory({ promptId }: { promptId: string }) {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [texts, setTexts] = useState<Texts | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);
  // The two takes side by side, older first: your first and your latest until you pick others.
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    void api.history({ prompt_id: promptId, days: 3650 }).then((h) => {
      const ts = h.takes.filter((t) => t.prompt_id === promptId && t.status !== "recording");
      setTakes(ts);
      setPicked(ts.length > 1 ? [ts[0].id, ts[ts.length - 1].id] : []);
    }, () => setTakes([]));
    void api.texts().then(setTexts, () => setTexts(null));
    void api.profile().then((p) => setBand(p.comfort_range_hz ?? null), () => undefined);
  }, [promptId]);

  const named = parseTextId(promptId);
  const level = named && named.course === DEFAULT_COURSE ? texts?.levels.find((l) => l.id === named.chapter) : null;
  const item = level?.items.find((i) => i.id === named?.text);
  const text = item?.text ?? takes?.[0]?.prompt_text ?? "";
  // Picking a third take lets go of the earlier pick; the pair always plays older as A.
  const pick = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]);
  const pair = (takes ?? []).filter((t) => picked.includes(t.id));

  return (
    <div className="rl th">
      <a className="th-back" href="#/history">Recordings</a>
      <header className="rl-head">
        <h1>{level?.title ?? "This text"}</h1>
        <p className="th-text">{text}</p>
        {takes && takes.length > 0 && <p className="th-sub">{takes.length} take{takes.length === 1 ? "" : "s"} since {day(takes[0])}{level && <> · <a href={`#/studio/${level.id}`}>Practise it</a></>}</p>}
      </header>
      {takes && takes.length === 0 && <p className="rl-empty">No takes of this text yet.</p>}
      {takes && takes.filter(middle).length > 1 && <Trend takes={takes} band={band} picked={picked} onPick={pick} />}

      {pair.length === 2 && (
        <section className="th-pair" aria-label="Two takes side by side">
          <h2>Side by side</h2>
          <div className="ab">
            {pair.map((t, i) => <AudioPlayer key={t.id} src={t.audio_url} tag={i ? "B" : "A"} label={`${day(t)}, ${time(t)}`} knownDuration={t.analysis_summary?.duration_s} pitchTakeId={t.id} band={band} compact />)}
          </div>
          <p className="th-hint">Listen to both. Which feels more like you? Pick any two takes below to swap them in. <button className="th-link" onClick={() => go(`/compare?a=${pair[0].id}&b=${pair[1].id}`)}>Detailed comparison</button></p>
        </section>
      )}

      {takes && takes.length > 0 && (
        <section aria-label="Every take">
          <h2 className="th-h2">Every take</h2>
          <ul className="th-list">
            {[...takes].reverse().map((t) => {
              const n = picked.indexOf(t.id), hz = middle(t);
              return (
                <li key={t.id} className={n >= 0 ? "on" : undefined}>
                  <button className="th-pick" aria-pressed={n >= 0} onClick={() => pick(t.id)} aria-label={`${n >= 0 ? "Remove from" : "Add to"} side by side: ${day(t)}, ${time(t)}`}>
                    {n >= 0 ? (pair[0]?.id === t.id ? "A" : "B") : ""}
                  </button>
                  <div className="th-when"><b>{day(t)}</b><span>{time(t)}{t.favourite ? " · favourite" : ""}</span></div>
                  <div className="th-hz">{hz ? <><b>{Math.round(hz)} Hz</b><span>{noteName(hz)}</span></> : <span>not measured</span>}</div>
                  <div className="th-play"><AudioPlayer src={t.audio_url} label="" knownDuration={t.analysis_summary?.duration_s} compact /></div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

const PAD = { l: 52, r: 16, t: 12, b: 26 };
const H = 190;

/** Middle pitch per take across time, one dot each; hover for the take, click to put it side by side. */
function Trend({ takes, band, picked, onPick }: { takes: Take[]; band: [number, number] | null; picked: string[]; onPick: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<Take | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = takes.filter(middle).map((t) => ({ t, m: hzToMidi(middle(t)!) }));
  // Fitted to the takes, not the range: a wide comfortable range would flatten the line. The band is clipped.
  const ms = pts.map((p) => p.m);
  let lo = Math.min(...ms) - 1.5, hi = Math.max(...ms) + 1.5;
  if (hi - lo < 8) { const c = (hi + lo) / 2; lo = c - 4; hi = c + 4; }
  // Takes on one day bunch up on a time axis, so each take gets an even step instead; dates label the ends.
  const X = (i: number) => PAD.l + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (w - PAD.l - PAD.r);
  const Y = (m: number) => PAD.t + (1 - (m - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  // Gridlines on round Hz, about four of them.
  const hzLo = midiToHz(lo), hzHi = midiToHz(hi);
  const stepHz = [5, 10, 20, 25, 50, 100].find((s) => (hzHi - hzLo) / s <= 5) ?? 100;
  const grid: number[] = [];
  for (let v = Math.ceil(hzLo / stepHz) * stepHz; v <= hzHi; v += stepHz) grid.push(v);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.m).toFixed(1)}`).join(" ");
  const hi_ = hover ? pts.findIndex((p) => p.t.id === hover.id) : -1;

  return (
    <figure className="th-trend" ref={box}>
      <svg width={w} height={H} role="img" aria-label={`Middle pitch on each take, from ${Math.round(middle(pts[0].t)!)} Hz on the first to ${Math.round(middle(pts[pts.length - 1].t)!)} Hz on the latest`}>
        {band && (() => {
          const top = Math.max(PAD.t, Y(hzToMidi(band[1]))), bottom = Math.min(H - PAD.b, Y(hzToMidi(band[0])));
          return bottom > top && <rect className="th-band" x={PAD.l} width={w - PAD.l - PAD.r} y={top} height={bottom - top} />;
        })()}
        {grid.map((v) => (
          <g key={v}>
            <line className="th-grid" x1={PAD.l} x2={w - PAD.r} y1={Y(hzToMidi(v))} y2={Y(hzToMidi(v))} />
            <text className="th-ax" x={PAD.l - 8} y={Y(hzToMidi(v))} textAnchor="end" dominantBaseline="middle">{v} Hz</text>
          </g>
        ))}
        <path className="th-line" d={path} />
        {pts.map((p, i) => {
          const on = picked.includes(p.t.id);
          return (
            <g key={p.t.id} onMouseEnter={() => setHover(p.t)} onMouseLeave={() => setHover(null)} onClick={() => onPick(p.t.id)} style={{ cursor: "pointer" }}>
              <circle cx={X(i)} cy={Y(p.m)} r={14} fill="transparent" />
              <circle className={`th-dot${on ? " on" : ""}`} cx={X(i)} cy={Y(p.m)} r={on ? 6 : 4.5} />
            </g>
          );
        })}
        <text className="th-ax" x={PAD.l} y={H - 6}>{day(pts[0].t)}</text>
        {pts.length > 1 && <text className="th-ax" x={w - PAD.r} y={H - 6} textAnchor="end">{day(pts[pts.length - 1].t)}</text>}
      </svg>
      {hover && hi_ >= 0 && (
        <div className="th-tip" style={{ left: Math.min(w - 150, Math.max(0, X(hi_) - 75)), top: Y(pts[hi_].m) - 62 }}>
          <b>{Math.round(middle(hover)!)} Hz <span>{noteName(middle(hover)!)}</span></b>
          <span>{day(hover)}, {time(hover)}</span>
        </div>
      )}
      <figcaption>Your middle pitch on each take{band ? ", with your comfortable range shaded" : ""}. Click a dot to put that take side by side.</figcaption>
    </figure>
  );
}
