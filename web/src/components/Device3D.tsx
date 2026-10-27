import { ReactNode } from "react";

/** Today's plan: what the session holds, then one primary action.
 *  (The name is historical; it used to be a hardware-style device.) */
export function Device3D({ screen, onPress, pressLabel, led = false, busy = false }: {
  screen: ReactNode;
  onPress: () => void;
  pressLabel: string;
  /** Short form of the action (kept for callers). */
  pressHint?: string;
  /** Something is under way (a session in progress). */
  led?: boolean;
  busy?: boolean;
}) {
  return (
    <div className={`vplan${led ? " is-live" : ""}`}>
      <div className="vplan-body">{screen}</div>
      <button className="btn-primary vgo" onClick={onPress} disabled={busy} aria-busy={busy || undefined}>
        {pressLabel}
      </button>
    </div>
  );
}
