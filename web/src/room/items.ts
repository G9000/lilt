import { LAMP_GLOW, type Light, LIGHTS, MAIN_SCREEN, SIDE_SCREEN, type Quad, type Weights } from "./scene.ts";

/**
 * The things in the room you can change. Each slot is a spot in the painting with a few variants;
 * the first variant is the painting as it is, so nothing is drawn for it. The screens show a
 * picture warped onto them; the lamps, the plant and the bed are the painting itself, recoloured
 * inside their outline (only the colours the key picks out, so the cat and the pillow keep theirs).
 * Your choices are kept in the profile as `room_items` ({slot: variant}).
 */

type Pt = [number, number];
/** Which pixels belong to the thing: a hue range in degrees (lo > hi wraps past red), and how
 * colourful and bright they must at least be. */
export interface Key { hue: [number, number]; sat: number; light?: number }
/** How to change them: aim the hue at `to` (keeping a little of the painted variation, so light
 * and shade still differ) or turn it by `hue`, then scale saturation and lightness. */
export interface Tint { to?: number; hue?: number; sat?: number; light?: number }
export interface Variant { id: string; name: string; url?: string; tint?: Tint;
  /** The lamp's glow colour ("r,g,b") for this variant. */
  glow?: string }
export interface Slot { id: string; name: string;
  /** Outlines in painting pixels: where to click, and where a tint may change colours. */
  area: Pt[][];
  /** A screen: the picture is warped onto this quad. */
  quad?: Quad;
  key?: Key;
  /** A different key for a light whose painting colours the thing differently (the night is blue). */
  keys?: Partial<Record<Light, Key>>;
  variants: Variant[] }

const pic = (id: string, name: string): Variant => ({ id, name, url: `pictures/${id}.webp` });
/** A circle as a polygon, for the round lamps. */
const ring = (cx: number, cy: number, r: number, n = 16): Pt[] =>
  Array.from({ length: n }, (_, i) => [Math.round(cx + r * Math.cos((i / n) * 2 * Math.PI)), Math.round(cy + r * Math.sin((i / n) * 2 * Math.PI))]);

export { LAMP_GLOW };

export const SLOTS: Slot[] = [
  { id: "main-screen", name: "Middle screen", quad: MAIN_SCREEN, area: [MAIN_SCREEN], variants: [
    { id: "painted", name: "Cherry blossom" }, pic("nebula-pillars", "Pillars of Creation"), pic("galaxy-whirlpool", "The Whirlpool Galaxy"),
    pic("plant-fern", "Fern in the shade"), pic("window", "The window"),
  ] },
  { id: "side-screen", name: "Right screen", quad: SIDE_SCREEN, area: [SIDE_SCREEN], variants: [
    { id: "painted", name: "The cat asleep" }, pic("cat-blanket", "Cat on a blanket"), pic("cat-window-nap", "Cat napping by the window"),
    pic("nebula-cliffs", "Cosmic Cliffs"), pic("plant-succulents", "Succulents by the window"),
  ] },
  { id: "lamp", name: "Lamps", key: { hue: [15, 65], sat: 0.25, light: 0.55 },
    // the globe on the shelf and the small one behind the plant
    area: [ring(171, 277, 36), ring(421, 401, 19)],
    variants: [
      { id: "painted", name: "Warm", glow: LAMP_GLOW }, { id: "rose", name: "Rose", tint: { to: 335, sat: 0.9 }, glow: "255,138,190" },
      { id: "lilac", name: "Lilac", tint: { to: 275, sat: 0.7 }, glow: "196,160,255" },
      { id: "moon", name: "Moonlight", tint: { to: 210, sat: 0.45, light: 1.04 }, glow: "170,205,255" },
    ] },
  { id: "plant", name: "Plant", key: { hue: [45, 190], sat: 0.1 },
    // the tall plant by the drawers, from just under the small lamp down to its pot
    area: [[[326, 425], [360, 405], [398, 420], [440, 422], [458, 440], [462, 500], [452, 560], [430, 600], [410, 648], [352, 648], [332, 600], [322, 520]]],
    variants: [
      { id: "painted", name: "Green" }, { id: "autumn", name: "Autumn leaves", tint: { to: 32, sat: 1.1 } },
      { id: "red", name: "Red leaves", tint: { to: 5, sat: 0.9, light: 0.95 } },
      { id: "silver", name: "Silver leaves", tint: { sat: 0.25, light: 1.12 } },
    ] },
  // By day the cover is pink with blue shade; at night it is all blue, like the room.
  { id: "bed", name: "Bed cover", key: { hue: [225, 30], sat: 0.14 }, keys: { night: { hue: [190, 15], sat: 0.1 } },
    // the bed and the pillow behind the cat-face one, up to the chair's blanket and wheels
    area: [[[0, 712], [60, 716], [130, 700], [200, 668], [212, 640], [250, 628], [330, 660], [400, 690], [480, 734], [558, 774], [642, 804], [732, 837], [804, 872], [852, 897], [905, 941], [0, 941]]],
    variants: [
      { id: "painted", name: "Pink" }, { id: "blue", name: "Blue", tint: { to: 228, sat: 0.9 } },
      { id: "sage", name: "Sage", tint: { to: 115, sat: 0.4 } },
      { id: "cream", name: "Cream", tint: { to: 38, sat: 0.35, light: 1.06 } },
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

/** The key that picks a slot's thing out of one light's painting. */
export const keyFor = (slot: Slot, l: Light): Key => slot.keys?.[l] ?? slot.key!;

/** The lamp's glow colour for your choice. */
export const lampGlow = (items: Items | undefined) => chosen(items, SLOTS.find((s) => s.id === "lamp")!).glow ?? LAMP_GLOW;

/** The box around a slot's outlines, in painting pixels. */
export function bounds(area: Pt[][]) {
  const xs = area.flat().map((p) => p[0]), ys = area.flat().map((p) => p[1]);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y };
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

/* ---------- recolouring ---------- */

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
// Hues and saturations just outside the key fade out over this much, so edges stay soft.
const FEATHER_HUE = 24, FEATHER_SAT = 0.08, FEATHER_LIGHT = 0.08;
// The mask is blurred this far (pixels) so compression noise near a key's edge can't flip whole blocks.
const SOFTEN = 3;
// How much of the painted hue variation a `to` tint keeps.
const KEEP_SPREAD = 0.3;

function toHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Signed shortest turn from hue b to hue a, -180–180. */
const turn = (a: number, b: number) => ((a - b + 540) % 360) - 180;
const middle = ([lo, hi]: [number, number]) => (lo + (((hi - lo) + 360) % 360) / 2) % 360;

/** How far a hue sits outside a range, in degrees (0 inside). */
function hueOutside(h: number, [lo, hi]: [number, number]) {
  const inside = lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi;
  if (inside) return 0;
  const gap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  return Math.min(gap(h, lo), gap(h, hi));
}

/** How much a colour belongs to the key, 0–1. */
export function membership(r: number, g: number, b: number, key: Key): number {
  const [h, s, l] = toHsl(r, g, b);
  const byHue = clamp(1 - hueOutside(h, key.hue) / FEATHER_HUE);
  const bySat = clamp((s - key.sat) / FEATHER_SAT + 1);
  const byLight = key.light === undefined ? 1 : clamp((l - key.light) / FEATHER_LIGHT + 1);
  return byHue * bySat * byLight;
}

/** A box blur of a w-wide grid, across then down. */
function soften(k: Float32Array, w: number, r: number) {
  const h = k.length / w, tmp = new Float32Array(k.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, n = 0;
    for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) { sum += k[y * w + xx]; n++; } }
    tmp[y * w + x] = sum / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, n = 0;
    for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; n++; } }
    k[y * w + x] = sum / n;
  }
}

/**
 * Recolours RGBA pixels (a `width`-wide image) in place: what the key picks out takes the tint, and
 * its alpha becomes how much it belongs, so the result laid over the painting changes only the
 * thing. Everything else turns transparent.
 */
export function recolor(px: Uint8ClampedArray, width: number, key: Key, tint: Tint) {
  const ks = new Float32Array(px.length / 4);
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]) ks[i / 4] = membership(px[i], px[i + 1], px[i + 2], key);
  soften(ks, width, SOFTEN);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const k = ks[i / 4];
    if (k <= 0.004) { px[i + 3] = 0; continue; }
    const [h, s, l] = toHsl(px[i], px[i + 1], px[i + 2]);
    const h2 = tint.to !== undefined ? tint.to + turn(h, middle(key.hue)) * KEEP_SPREAD : h + (tint.hue ?? 0);
    const [r, g, b] = toRgb(((h2 % 360) + 360) % 360, clamp(s * (tint.sat ?? 1)), clamp(l * (tint.light ?? 1)));
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.round(px[i + 3] * k);
  }
}
