// Reference notes beside "Play my note": three tones to hum along to and compare with, taken from the
// same population averages as the pitch scale (content/courses/voice/_pitch.md) and rounded to the
// nearest note. They follow your direction. They're for listening and matching, never targets.

import { midiToHz, hzToMidi, noteName } from "./pitch.ts";
import type { Direction, PitchRef } from "./insight.ts";

export interface RefNote { hz: number; name: string; about: string }

const snap = (hz: number) => midiToHz(Math.round(hzToMidi(hz)));

/** Three reference notes, low to high, for the way you're taking your voice. */
export function referenceNotes(r: PitchRef, direction: Direction): RefNote[] {
  const picks: [number, string][] = direction === "lower" ? [
    [r.men_mean - r.men_sd, "the lower part of the average man's speaking range"],
    [r.men_mean, "the average man's speaking pitch"],
    [r.overlap_low, "the bottom of the overlap, where pitch alone can be heard either way"],
  ] : direction === "open" ? [
    [r.men_mean, "the average man's speaking pitch"],
    [Math.sqrt(r.overlap_low * r.overlap_high), "the middle of the overlap, where pitch alone can be heard either way"],
    [r.women_mean, "the average woman's speaking pitch"],
  ] : [
    [r.overlap_high, "the top of the overlap, where pitch alone can be heard either way"],
    [r.women_mean, "the average woman's speaking pitch"],
    [r.women_mean + r.women_sd, "the upper part of the average woman's speaking range"],
  ];
  return picks.map(([hz, about]) => { const s = snap(hz); return { hz: s, name: noteName(s), about }; });
}
