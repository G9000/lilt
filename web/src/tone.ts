// "Play my note": a soft tone at the middle of your comfortable range, to hum along to. It must
// never reach a take: any recording or live pitch stops it at once, and a take waits until its
// half-second pre-roll no longer reaches back into the tone.

import { micInUse } from "./micuse";
import { hzToMidi, midiToHz } from "./pitch";
import { PRE_ROLL_S } from "./recorder";

/** The middle of your range (geometric), on the nearest note, so the tone matches the name on the button. */
export function noteFor(band: [number, number]): number {
  return midiToHz(Math.round(hzToMidi(Math.sqrt(band[0] * band[1]))));
}

let ctx: AudioContext | null = null;
let current: { stop: () => void } | null = null;
/** When the last tone fell silent (performance.now()). */
let quietAt = -Infinity;
const watchers = new Set<(on: boolean) => void>();
const tell = () => watchers.forEach((f) => f(current !== null));

/** Follow whether a tone is playing; returns the unsubscribe. */
export function onTone(f: (on: boolean) => void): () => void {
  watchers.add(f);
  f(current !== null);
  return () => { watchers.delete(f); };
}

/**
 * Play a gentle tone at `hz`: a triangle softened by a low-pass (closer to a hum than a beep, and
 * still audible on laptop speakers, which barely play a pure sine this low), easing in and out so
 * it never clicks. It won't start while the microphone is listening.
 */
export function playTone(hz: number, seconds = 1.8, volume = 0.14): boolean {
  if (micInUse()) return false;
  stopTone();
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return false;
  ctx ??= new Ctx() as AudioContext;
  const c = ctx;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime + 0.02, end = t0 + seconds;
  const osc = c.createOscillator(), soft = c.createBiquadFilter(), gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = hz;
  soft.type = "lowpass";
  soft.frequency.value = hz * 4;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.12);
  gain.gain.setValueAtTime(volume, end - 0.5);
  gain.gain.linearRampToValueAtTime(0, end);
  osc.connect(soft).connect(gain).connect(c.destination);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    osc.disconnect(); soft.disconnect(); gain.disconnect();
    if (current === me) { current = null; quietAt = performance.now(); tell(); }
  };
  const me = {
    // Stopping early fades out over 20 ms: instant to the ear, but no click.
    stop: () => {
      const now = c.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.02);
      try { osc.stop(now + 0.03); } catch { /* already stopped */ }
      current = null; quietAt = performance.now() + 30; tell();
    },
  };
  osc.onended = finish;
  osc.start(t0);
  osc.stop(end + 0.05);
  current = me;
  tell();
  return true;
}

export function stopTone() {
  current?.stop();
}

/** Stop any tone, then wait until a take's pre-roll can no longer reach back into it. */
export async function clearOfTone(): Promise<void> {
  stopTone();
  const wait = PRE_ROLL_S * 1000 + 80 - (performance.now() - quietAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// Anything that starts listening (a take, live pitch) or stops playback silences the tone.
if (typeof window !== "undefined") {
  window.addEventListener("lilt:mic", (e) => { if ((e as CustomEvent<boolean>).detail) stopTone(); });
  window.addEventListener("lilt:stop-playback", () => stopTone());
}
