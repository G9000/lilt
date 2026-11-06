// The lo-fi radio's moods: what each one plays (lofi.ts makes the sound) and the cover it shows.

/** How the chords are played. */
export type Voice = "keys" | "pluck" | "musicbox" | "kalimba" | "pad";
/** The sound around the music. */
export type Ambience = "rain" | "sea" | "fire" | "crickets" | "birds";

/**
 * A mood: its tempo, its four chords (MIDI notes, lowest first, one bar each), how they're played,
 * the bass (two notes a bar, a walk on every beat, or one long note), how much drum, and what's
 * around it: an ambience and how much vinyl crackle.
 */
export interface Mood {
  name: string;
  description: string;
  cover: string;
  bpm: number;
  prog: number[][];
  voice?: Voice;
  bass?: "two" | "walk" | "long";
  drums?: "full" | "soft" | "none";
  ambience?: Ambience;
  vinyl?: number;
}

const pic = (name: string) => `/pictures/${name}.webp`;

export const MOODS: Mood[] = [
  { name: "Rain on the window", description: "Soft keys and rain", cover: pic("window"), bpm: 70, ambience: "rain", prog: [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59]] },
  { name: "Desk lamp", description: "Warm keys and a gentle beat", cover: pic("desk"), bpm: 76, prog: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59, 62], [45, 48, 52, 55]] },
  { name: "City at dusk", description: "Warm keys and a gentle beat", cover: pic("nebula-cliffs"), bpm: 66, prog: [[51, 55, 58, 62], [56, 60, 63, 67], [53, 56, 60, 63], [58, 62, 65, 68]] },
  { name: "Night bus", description: "Warm keys and a gentle beat", cover: pic("galaxy-whirlpool"), bpm: 74, vinyl: 0.5, prog: [[48, 51, 55, 58, 62], [44, 48, 51, 55], [51, 55, 58, 62], [46, 50, 53, 55]] },
  { name: "Sunday morning", description: "Soft keys and brushed drums", cover: pic("plant-succulents"), bpm: 82, drums: "soft", prog: [[55, 59, 62, 66], [52, 55, 59, 62, 66], [57, 60, 64, 67], [50, 54, 57, 60, 64]] },
  { name: "Train window", description: "Warm keys and a gentle beat", cover: pic("cat-window-nap"), bpm: 68, vinyl: 0.3, prog: [[46, 50, 53, 57], [45, 48, 52, 55], [43, 46, 50, 53], [41, 45, 48, 52, 55]] },
  { name: "Snow day", description: "Quiet keys, no drums", cover: pic("cat-blanket"), bpm: 60, drums: "none", vinyl: 0.6, prog: [[57, 61, 64, 68, 71], [54, 57, 61, 64, 68], [50, 54, 57, 61], [52, 56, 59, 61]] },
  { name: "Bedroom cassette", description: "Warm keys and a gentle beat", cover: pic("cat-keyboard"), bpm: 78, vinyl: 0.8, prog: [[51, 55, 58, 62], [55, 58, 62, 65], [48, 51, 55, 58], [46, 51, 53, 58]] },
  { name: "Library, after hours", description: "Soft keys and rain", cover: pic("plant-fern"), bpm: 64, ambience: "rain", drums: "soft", prog: [[50, 53, 57, 60], [46, 50, 53, 57], [55, 58, 62, 65], [57, 61, 64, 67]] },
  // New sounds: each brings an instrument or a place the first nine don't have.
  { name: "Morning coffee", description: "Strummed strings and a bright beat", cover: pic("room-coffee"), bpm: 88, voice: "pluck", prog: [[48, 52, 55, 59, 64], [45, 52, 55, 60], [50, 53, 57, 60, 65], [43, 50, 53, 59]] },
  { name: "Sea breeze", description: "Slow pads and the sea", cover: pic("room-sea"), bpm: 58, voice: "pad", bass: "long", drums: "none", ambience: "sea", prog: [[50, 57, 62, 64, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]] },
  { name: "Fireplace", description: "Plucked strings by a crackling fire", cover: pic("cat-fluff"), bpm: 72, voice: "pluck", drums: "soft", ambience: "fire", prog: [[45, 52, 55, 60], [50, 53, 57, 60], [43, 50, 53, 59], [48, 52, 55, 59]] },
  { name: "Music box", description: "A little music box, no drums", cover: pic("cat-kitten"), bpm: 64, voice: "musicbox", drums: "none", vinyl: 0.4, prog: [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 53, 59]] },
  { name: "Summer crickets", description: "Kalimba and crickets at dusk", cover: pic("room-crickets"), bpm: 70, voice: "kalimba", drums: "soft", ambience: "crickets", prog: [[41, 48, 52, 57], [40, 47, 50, 55], [38, 45, 48, 53], [36, 43, 47, 52]] },
  { name: "Greenhouse", description: "Kalimba, birdsong and a light beat", cover: pic("plant-office"), bpm: 80, voice: "kalimba", ambience: "birds", prog: [[43, 50, 55, 59, 62], [38, 45, 50, 54, 57], [40, 47, 52, 55, 59], [36, 43, 48, 52, 55]] },
  { name: "Midnight jazz", description: "Jazzy keys and a walking bass", cover: pic("room-jazz"), bpm: 84, bass: "walk", drums: "soft", vinyl: 0.35, prog: [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 49, 55, 58, 61]] },
  { name: "Stargazing", description: "Slow pads and a few bells", cover: pic("nebula-pillars"), bpm: 56, voice: "pad", bass: "long", drums: "none", prog: [[52, 56, 59, 63], [49, 56, 59, 64], [45, 52, 56, 61], [47, 54, 56, 59]] },
];

/**
 * A walking bass for one bar, a note on each beat: the chord's root, third and fifth, then a step
 * that leads into the next chord's root (a semitone below it, or above when that's closer).
 */
export function walkingBass(chord: number[], next: number[]): number[] {
  const root = chord[0] - 12, toNext = next[0] - 12;
  const third = root + (chord.some((m) => (m - chord[0]) % 12 === 3) ? 3 : 4);
  const fifth = root + 7;
  const lead = Math.abs(toNext - 1 - fifth) <= Math.abs(toNext + 1 - fifth) ? toNext - 1 : toNext + 1;
  return [root, third, fifth, lead];
}
