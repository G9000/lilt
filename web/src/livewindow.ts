// The live pitch chart's window. It never stretches, so the line keeps its shape, but it slides by half
// an octave when your voice settles near an edge: the line is never pinned to the top or the bottom.

import { hzToMidi, midiToHz } from "./pitch.ts";

export type Window = [number, number];
/** Where it starts when nothing is known about your voice. */
export const START: Window = [80, 400];
/** One slide, in semitones. */
export const STEP_ST = 6;
/** How close to an edge your voice has to settle before the window slides. */
export const EDGE_ST = 3;
/** The tracker hears 60–700 Hz; the window stays around that. */
const FLOOR_HZ = 55, CEIL_HZ = 810;
/** About a third of a second of voice at the live tracker's rate: a blip or an octave slip isn't enough. */
const SETTLED = 12;

const shift = (w: Window, st: number): Window => [midiToHz(hzToMidi(w[0]) + st), midiToHz(hzToMidi(w[1]) + st)];
const fits = (w: Window) => w[0] >= FLOOR_HZ - 0.5 && w[1] <= CEIL_HZ + 0.5;

/** The window to open with: the usual one, slid so your comfortable range sits clear of both edges. */
export function startWindow(band?: [number, number] | null): Window {
  let w = START;
  if (!band) return w;
  const mid = (hzToMidi(band[0]) + hzToMidi(band[1])) / 2;
  for (let i = 0; i < 4; i++) {
    const next = slide(w, Array(SETTLED).fill(midiToHz(mid)));
    if (next === w) break;
    w = next;
  }
  return w;
}

/** The window after the latest readings (newest last): the same one, or slid half an octave towards your voice. */
export function slide(w: Window, recent: (number | null)[]): Window {
  const voiced = recent.filter((hz): hz is number => hz !== null).slice(-SETTLED * 2);
  if (voiced.length < SETTLED) return w;
  const sorted = [...voiced].sort((a, b) => a - b), m = hzToMidi(sorted[sorted.length >> 1]);
  const up = shift(w, STEP_ST), down = shift(w, -STEP_ST);
  if (m > hzToMidi(w[1]) - EDGE_ST && fits(up)) return up;
  if (m < hzToMidi(w[0]) + EDGE_ST && fits(down)) return down;
  return w;
}
