import { cx } from "../ui/cx";
import { shared } from "../ui/shared";
import type { VoiceDirection } from "../api";
import { DIRECTIONS } from "../direction";

/** Higher, lower or still open, as one segmented choice. `DIRECTIONS` has a line about each. */
export function DirectionChoice({ value, onChange }: { value: VoiceDirection; onChange: (d: VoiceDirection) => void }) {
  return (
    <div className={cx("segmented", shared["segmented"])} role="group" aria-label="Which way you're taking your voice">
      {DIRECTIONS.map((d) => <button key={d.id} type="button" aria-pressed={value === d.id} onClick={() => onChange(d.id)}>{d.label}</button>)}
    </div>
  );
}
