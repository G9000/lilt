// Soft paper sounds, off until you turn them on: a rustle as a card is put away, a pencil
// scratch as a note is kept, a gentle chime when the deck is done. Made in the browser (no files),
// quiet, and never while the microphone is listening, so nothing reaches a take.

import { micInUse } from "./micuse.ts";

export type Sound = "rustle" | "pencil" | "chime";
export const SOUNDS_KEY = "lilt.sounds";

/** Saved as "on"; anything else, or nothing, is off. */
export const readSounds = (raw: string | null) => raw === "on";

/** Whether a sound may play now. */
export const mayPlay = (on: boolean, micBusy: boolean, hidden: boolean) => on && !micBusy && !hidden;

export function soundsOn(): boolean {
  try { return readSounds(localStorage.getItem(SOUNDS_KEY)); } catch { return false; }
}

export function setSounds(on: boolean) {
  try { if (on) localStorage.setItem(SOUNDS_KEY, "on"); else localStorage.removeItem(SOUNDS_KEY); } catch { /* private mode: off next time */ }
}

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  ctx ??= new Ctx() as AudioContext;
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A second of soft noise, made once: paper and pencil are both shaped from it. */
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise;
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noise = b);
}

/** A burst of filtered noise that eases in and out (no clicks). */
function burst(c: AudioContext, at: number, len: number, peak: number, filter: BiquadFilterType, from: number, to: number, q = 0.8) {
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c);
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(from, at); f.frequency.linearRampToValueAtTime(to, at + len);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + Math.min(0.02, len / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g).connect(c.destination);
  src.start(at, Math.random() * 0.5); src.stop(at + len + 0.02);
}

/** A soft bell-like note: a sine with a faint octave, fading slowly. */
function bell(c: AudioContext, at: number, hz: number, peak: number) {
  for (const [mult, share] of [[1, 1], [2, 0.18]] as const) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = hz * mult;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak * share, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
    o.connect(g).connect(c.destination);
    o.start(at); o.stop(at + 1.55);
  }
}

/** Play one, if sounds are on and the microphone is free. Returns whether it played. */
export function playSound(kind: Sound, force = false): boolean {
  if (!force && !mayPlay(soundsOn(), micInUse(), typeof document !== "undefined" && document.hidden)) return false;
  if (micInUse()) return false;
  const c = audio();
  if (!c) return false;
  const t = c.currentTime + 0.01;
  if (kind === "rustle") {
    burst(c, t, 0.16, 0.05, "bandpass", 1800, 3600);
    burst(c, t + 0.09, 0.2, 0.035, "bandpass", 3200, 2200);
  } else if (kind === "pencil") {
    for (let i = 0; i < 5; i++) burst(c, t + i * 0.055 + Math.random() * 0.015, 0.045, 0.022 + Math.random() * 0.012, "highpass", 3500, 4200, 0.5);
  } else {
    bell(c, t, 784, 0.045); // G5
    bell(c, t + 0.14, 1175, 0.035); // D6
  }
  return true;
}
