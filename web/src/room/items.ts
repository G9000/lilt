import { LIGHTS, MAIN_SCREEN, SIDE_SCREEN, type Quad, type Weights } from "./scene.ts";

/**
 * The things in the room you can change. Each slot is a spot in the painting with a few variants;
 * the first variant is the painting as it is, so nothing is drawn for it. For now the slots are the
 * two front monitors, whose pictures are warped onto the screen (no repainting needed). Your
 * choices are kept in the profile as `room_items` ({slot: variant}).
 */

export interface Variant { id: string; name: string; url?: string }
export interface Slot { id: string; name: string; quad: Quad; variants: Variant[] }

const pic = (id: string, name: string): Variant => ({ id, name, url: `pictures/${id}.webp` });

export const SLOTS: Slot[] = [
  { id: "main-screen", name: "Middle screen", quad: MAIN_SCREEN, variants: [
    { id: "painted", name: "Cherry blossom" }, pic("nebula-pillars", "Pillars of Creation"), pic("galaxy-whirlpool", "The Whirlpool Galaxy"),
    pic("plant-fern", "Fern in the shade"), pic("window", "The window"),
  ] },
  { id: "side-screen", name: "Right screen", quad: SIDE_SCREEN, variants: [
    { id: "painted", name: "The cat asleep" }, pic("cat-blanket", "Cat on a blanket"), pic("cat-window-nap", "Cat napping by the window"),
    pic("nebula-cliffs", "Cosmic Cliffs"), pic("plant-succulents", "Succulents by the window"),
  ] },
];

export type Items = Record<string, string>;

/** The variant showing in a slot: an unknown or missing choice is the painting. */
export function chosen(items: Items | undefined, slot: Slot): Variant {
  return slot.variants.find((v) => v.id === items?.[slot.id]) ?? slot.variants[0];
}

/** The next variant in a slot, round to the painting again. The painting is stored as no entry. */
export function cycle(items: Items | undefined, slotId: string): Items {
  const slot = SLOTS.find((s) => s.id === slotId);
  const next = { ...items };
  if (!slot) return next;
  const i = slot.variants.indexOf(chosen(items, slot)), v = slot.variants[(i + 1) % slot.variants.length];
  if (v === slot.variants[0]) delete next[slot.id]; else next[slot.id] = v.id;
  return next;
}

/* A screen glows, so it barely follows the room's light: a little dimmer and warmer at sunset and
   night, so a photo sits in the painting instead of looking pasted on. */
const TONE = { day: [1, 1, 0], morning: [0.97, 0.97, 0.05], sunset: [0.9, 0.93, 0.18], night: [0.82, 0.9, 0.12] } as const;

/** A CSS filter for the screen pictures, mixed from the light weights. */
export function screenTone(w: Weights): string {
  let b = 0, s = 0, sep = 0;
  for (const l of LIGHTS) { b += w[l] * TONE[l][0]; s += w[l] * TONE[l][1]; sep += w[l] * TONE[l][2]; }
  return `brightness(${b.toFixed(3)}) saturate(${s.toFixed(3)}) sepia(${sep.toFixed(3)})`;
}
