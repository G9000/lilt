import { cx } from "../ui/cx";
import { practice } from "../ui/practice";
import { useEffect, useState } from "react";
import { api, PitchReference } from "../api";
import { useDirection } from "../direction";
import { referenceNotes } from "../refnotes";
import { onTone, playTone, stopTone } from "../tone";

let reference: Promise<PitchReference | null> | null = null;
const pitchReference = () => (reference ??= api.texts().then((t) => t.pitch_reference ?? null, () => null));

/**
 * "Reference notes": three tones from the pitch scale's averages, for your direction, to hum along to
 * and compare with. Folded behind one button beside "Play my note"; never while the mic listens.
 */
export function ReferenceNotes({ disabled }: { disabled: boolean }) {
  const direction = useDirection();
  const [ref, setRef] = useState<PitchReference | null>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  useEffect(() => { let live = true; void pitchReference().then((r) => { if (live) setRef(r); }); return () => { live = false; }; }, []);
  useEffect(() => onTone((on) => { if (!on) setPlaying(null); }), []);
  if (!ref) return null;
  const notes = referenceNotes(ref, direction);
  const play = (hz: number) => {
    if (playing === hz) { stopTone(); return; }
    if (playTone(hz)) setPlaying(hz);
  };
  return (
    <span className={cx("ve-refs", practice["ve-refs"])}>
      <button type="button" className={cx("ve-ghost", practice["ve-ghost"])} aria-expanded={open} onClick={() => { if (open) stopTone(); setOpen(!open); }}
        title="Three notes from the average speaking pitches on the pitch scale, to hum along to and compare with. Not targets.">
        Reference notes
      </button>
      {open && notes.map((n) => (
        <button key={n.hz} type="button" className={cx("ve-ghost ve-ref", practice["ve-ghost"])} aria-pressed={playing === n.hz} disabled={disabled}
          onClick={() => play(n.hz)} title={`${n.name}: ${n.about}`} aria-label={`Play ${n.name}, ${n.about}`}>
          {n.name}
        </button>
      ))}
    </span>
  );
}
