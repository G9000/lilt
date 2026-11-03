// How noisy the room is, from the microphone check: a short quiet moment gives the room's own level
// (the floor), then a few words give your voice's. What matters for pitch is the gap between them.

/** Input levels as frame RMS (0..1), the way `levelMeter` reports them. */
export type Levels = number[];

/** The level the mic check already treats as hearing you (about −40 dBFS). */
export const HEARD = 0.01;

/**
 * Under this many decibels between your voice and the room, background sound starts to throw off pitch
 * readings: a fan or traffic gets read as voice in the gaps, and quiet syllables get lost in it. 20 dB
 * is a tenth of your voice's loudness; the pitch line already drops steady hum under a fifth (14 dB).
 */
export const NOISY_GAP_DB = 20;

/** Frames needed before saying anything: about half a second of quiet, and a quarter second of voice, at 60 a second. */
const MIN_QUIET = 30, MIN_VOICE = 15;

export const db = (rms: number) => 20 * Math.log10(Math.max(rms, 1e-6));

function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

export interface Room { floorDb: number; voiceDb: number; gapDb: number; noisy: boolean }

/**
 * The room against your voice. `quiet` is the levels from the quiet moment; its lower quarter is the
 * floor, so a cough or a word at its end doesn't count. `heard` is the levels after it: the loud end
 * (90th percentile) of what rose above `HEARD` is your voice. None until both are long enough to say.
 * When the room itself is over `HEARD`, every frame counts as voice, and the gap comes out small,
 * which is the right answer: you can't be told apart from the room.
 */
export function judgeRoom(quiet: Levels, heard: Levels): Room | null {
  if (quiet.length < MIN_QUIET) return null;
  const floor = percentile(quiet, 0.25);
  const voice = heard.filter((r) => r > HEARD);
  if (voice.length < MIN_VOICE) return null;
  const floorDb = db(floor), voiceDb = db(percentile(voice, 0.9));
  const gapDb = voiceDb - floorDb;
  return { floorDb, voiceDb, gapDb, noisy: gapDb < NOISY_GAP_DB };
}
