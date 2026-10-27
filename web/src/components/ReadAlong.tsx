import { useEffect, useMemo, useRef, useState } from "react";
import { createFollower, notesFor, tokenize, Follower } from "../readalong";
import { trackLive } from "../pitch";
import { PitchPoint } from "./PianoRoll";

interface Props {
  text: string;
  levelId: string;
  hint: string;
  kind: string;
  stream: MediaStream | null;
  /** Follow the reader while true (recording). */
  active: boolean;
  /** Called when following stops, with each word's start time (s) or null. */
  onStarts?: (starts: (number | null)[]) => void;
  /** After a take: word start times and the measured contour, to draw pitch under words. */
  alignment?: (number | null)[] | null;
  pitch?: PitchPoint[] | null;
}

/** The text to read, set large; the current word lights up in the accent as you read. */
export function ReadAlong({ text, levelId, hint, kind, stream, active, onStarts, alignment, pitch }: Props) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const notes = useMemo(() => notesFor(levelId, hint, tokens), [levelId, hint, tokens]);
  const [cur, setCur] = useState(-1);
  const follower = useRef<Follower | null>(null);
  const lastT = useRef(0);
  const startsCb = useRef(onStarts);
  startsCb.current = onStarts;

  useEffect(() => { setCur(-1); }, [text]);

  useEffect(() => {
    if (!active || !stream) return;
    const f = createFollower(tokens);
    follower.current = f;
    setCur(-1);
    const tr = trackLive(stream, (t, fr) => {
      lastT.current = t;
      const c = f.push(t, fr.rms, fr.hz !== null);
      setCur((p) => (p === c ? p : c));
    });
    return () => {
      tr.stop();
      startsCb.current?.([...f.starts()]);
    };
  }, [active, stream, tokens]);

  // Per-word pitch sketches after a take (approximate alignment).
  const sketches = useMemo(() => {
    if (!alignment || !pitch?.length) return null;
    const voiced = pitch.filter((p) => p.hz) as { t: number; hz: number }[];
    if (voiced.length < 5) return null;
    const st = (hz: number) => 12 * Math.log2(hz);
    const lo = Math.min(...voiced.map((p) => st(p.hz))), hi = Math.max(...voiced.map((p) => st(p.hz)));
    const span = Math.max(3, hi - lo);
    const out = new Map<number, string>();
    alignment.forEach((s, i) => {
      if (s === null) return;
      const next = alignment.slice(i + 1).find((x) => x !== null) ?? s + 0.8;
      const seg = voiced.filter((p) => p.t >= s && p.t < next);
      if (seg.length < 2) return;
      const pts = seg.map((p) => `${(((p.t - s) / Math.max(0.05, next - s)) * 100).toFixed(1)},${(12 - ((st(p.hz) - lo) / span) * 12).toFixed(1)}`);
      out.set(i, pts.join(" "));
    });
    return out;
  }, [alignment, pitch]);

  const anchored = notes.filter((n) => n.word !== null);
  const numFor = (wi: number) => anchored.findIndex((n) => n.word === wi);
  const following = active && cur >= 0;

  return (
    <>
      <p className={`readtext${kind === "passage" ? " passage" : kind === "hum" ? " hum" : ""}${sketches ? " has-pitch" : ""}${active ? " is-following" : ""}`} aria-label={text}>
        {tokens.map((tk, k) => {
          if (!tk.word) return <span key={k} aria-hidden="true">{tk.text}</span>;
          const ni = numFor(tk.index);
          const cls = ["w", tk.index < cur ? "done" : "", tk.index === cur ? "now" : "", ni >= 0 ? "annotated" : ""].join(" ");
          const d = sketches?.get(tk.index);
          return (
            <span key={k} className={cls} aria-hidden="true" data-n={ni >= 0 ? ni + 1 : undefined}
              onClick={() => { if (follower.current && active) { follower.current.jumpTo(tk.index, lastT.current); setCur(tk.index); } }}>
              {tk.text}
              {d && (
                <svg className="wpitch" viewBox="0 0 100 12" preserveAspectRatio="none">
                  <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                </svg>
              )}
            </span>
          );
        })}
      </p>
      <p className="follow-status" aria-live="polite">
        {active
          ? following ? "Following you. Tap a word if I lose your place." : "Start reading. The highlight follows your syllables."
          : sketches ? "Your measured pitch under each word, approximate." : ""}
      </p>
    </>
  );
}

/** Quiet numbered notes, shown under the controls. */
export function ReadNotes({ text, levelId, hint }: { text: string; levelId: string; hint: string }) {
  const notes = useMemo(() => notesFor(levelId, hint, tokenize(text)), [levelId, hint, text]);
  if (!notes.length) return null;
  let n = 0;
  return (
    <ul className="notes" aria-label="Notes">
      {notes.map((x, i) => (
        <li key={i}>
          <b aria-hidden={x.word === null}>{x.word === null ? "" : ++n}</b>
          <span>{x.text} <small>({x.source})</small></span>
        </li>
      ))}
    </ul>
  );
}
