// Which way you're taking your voice (Practice settings, or Day 1): higher, lower or still open. Only
// words follow it, the nudges about your comfortable range and when Lilt offers to move it; nothing
// is measured differently. Unset reads as higher, the voice course's own direction.

import { useEffect, useState } from "react";
import { api, VoiceDirection } from "./api";

export const DIRECTIONS: { id: VoiceDirection; label: string; help: string }[] = [
  { id: "higher", label: "Higher", help: "A lighter, brighter voice. The voice course is written for this." },
  { id: "lower", label: "Lower", help: "A deeper, darker voice. Lilt won't nudge you upward." },
  { id: "open", label: "Still open", help: "No direction yet: Lilt won't nudge you either way." },
];

export const directionOf = (d: VoiceDirection | null | undefined): VoiceDirection => d ?? "higher";

let cached: Promise<VoiceDirection> | null = null;
const load = () => (cached ??= api.profile().then((p) => directionOf(p.voice_direction), () => "higher" as VoiceDirection));

/** Tell every open view about a new direction (after saving it to the profile). */
export function announceDirection(d: VoiceDirection) {
  cached = Promise.resolve(d);
  window.dispatchEvent(new CustomEvent("lilt:voice-direction", { detail: d }));
}

/** Your direction, read once from the profile and kept in step with changes. */
export function useDirection(): VoiceDirection {
  const [d, setD] = useState<VoiceDirection>("higher");
  useEffect(() => {
    let live = true;
    void load().then((v) => { if (live) setD(v); });
    const on = (e: Event) => setD((e as CustomEvent<VoiceDirection>).detail);
    window.addEventListener("lilt:voice-direction", on);
    return () => { live = false; window.removeEventListener("lilt:voice-direction", on); };
  }, []);
  return d;
}
