/**
 * The 3D room (a test): what's in it and where. Floor things sit on a grid and turn in quarter
 * turns; pictures hang on the back or left wall. Nothing may overlap (the rug lies under things),
 * nothing leaves the room, and a picture keeps clear of the window. Metres, y up; the floor runs
 * x -3…3 and z -2.5…2.5, the back wall is at z = -2.5 and the left wall at x = -3.
 */

export const ROOM = { w: 6, d: 5, h: 3 };
export const GRID = 0.25;
/** The window in the back wall, as x and y ranges. */
export const WINDOW = { x0: -0.4, x1: 2.6, y0: 0.95, y1: 2.6 };

export type Side = "back" | "left";
export interface Variant { id: string; name: string; color?: string; picture?: string }
export interface Kind {
  id: string; name: string;
  /** Width (x), height and depth (z) before turning; a picture's depth is its thickness. */
  size: [number, number, number];
  wall?: boolean;
  /** Lies flat under other things (the rug). */
  flat?: boolean;
  variants: Variant[];
}
export interface Item {
  id: string; kind: string;
  /** Centre on the floor. */
  x: number; z: number;
  /** Quarter turns, 0–3. */
  rot: number;
  variant: number;
  /** A picture: which wall, how far along it (x on the back wall, z on the left) and the centre's height. */
  wall?: { side: Side; u: number; y: number };
}

const pic = (id: string, name: string): Variant => ({ id, name, picture: `pictures/${id}.webp` });

export const KINDS: Record<string, Kind> = {
  bed: { id: "bed", name: "Bed", size: [1.4, 0.55, 2.1], variants: [
    { id: "pink", name: "Pink cover", color: "#f2a7c3" }, { id: "blue", name: "Blue cover", color: "#8fb2e8" },
    { id: "sage", name: "Sage cover", color: "#a9c79b" }, { id: "cream", name: "Cream cover", color: "#f1e3c6" },
  ] },
  desk: { id: "desk", name: "Desk", size: [1.6, 0.75, 0.7], variants: [
    { id: "oak", name: "Oak", color: "#c99a6a" }, { id: "walnut", name: "Walnut", color: "#8a5a3c" }, { id: "white", name: "White", color: "#ece7e1" },
  ] },
  chair: { id: "chair", name: "Chair", size: [0.6, 1, 0.6], variants: [
    { id: "grey", name: "Grey", color: "#6f6f7d" }, { id: "pink", name: "Pink", color: "#e7a1b9" }, { id: "mint", name: "Mint", color: "#9fd3c1" },
  ] },
  lamp: { id: "lamp", name: "Lamp", size: [0.45, 1.6, 0.45], variants: [
    { id: "warm", name: "Warm light", color: "#ffc27a" }, { id: "rose", name: "Rose light", color: "#ff8fbf" }, { id: "moon", name: "Moonlight", color: "#a9c8ff" },
  ] },
  plant: { id: "plant", name: "Plant", size: [0.5, 1.2, 0.5], variants: [
    { id: "green", name: "Green leaves", color: "#6fa35b" }, { id: "autumn", name: "Autumn leaves", color: "#e0913c" }, { id: "silver", name: "Silver leaves", color: "#b8c4b8" },
  ] },
  rug: { id: "rug", name: "Rug", size: [2, 0.02, 1.4], flat: true, variants: [
    { id: "lilac", name: "Lilac", color: "#b9a6d9" }, { id: "peach", name: "Peach", color: "#f3b9a0" }, { id: "sky", name: "Sky", color: "#a7c7e7" },
  ] },
  shelf: { id: "shelf", name: "Bookshelf", size: [0.9, 1.8, 0.35], variants: [
    { id: "oak", name: "Oak", color: "#c99a6a" }, { id: "white", name: "White", color: "#ece7e1" },
  ] },
  poster: { id: "poster", name: "Poster", size: [0.7, 0.9, 0.03], wall: true, variants: [
    pic("nebula-pillars", "Pillars of Creation"), pic("cat-window-nap", "Cat napping by the window"), pic("plant-fern", "Fern in the shade"), pic("galaxy-whirlpool", "The Whirlpool Galaxy"),
  ] },
  frame: { id: "frame", name: "Small frame", size: [0.5, 0.5, 0.03], wall: true, variants: [
    pic("cat-blanket", "Cat on a blanket"), pic("plant-succulents", "Succulents by the window"), pic("cat-kitten", "Kitten, paws up"),
  ] },
};

export const DEFAULT_LAYOUT: Item[] = [
  { id: "bed", kind: "bed", x: -2.25, z: 1.25, rot: 0, variant: 0 },
  { id: "rug", kind: "rug", x: 0.25, z: 0.5, rot: 0, variant: 0 },
  { id: "desk", kind: "desk", x: 1, z: -2.15, rot: 0, variant: 0 },
  { id: "chair", kind: "chair", x: 1, z: -1.25, rot: 2, variant: 0 },
  { id: "lamp", kind: "lamp", x: -2.7, z: -2.2, rot: 0, variant: 0 },
  { id: "plant", kind: "plant", x: 2.7, z: -2.2, rot: 0, variant: 0 },
  { id: "shelf", kind: "shelf", x: -1.5, z: -2.325, rot: 0, variant: 0 },
  { id: "poster", kind: "poster", x: 0, z: 0, rot: 0, variant: 0, wall: { side: "left", u: -0.5, y: 1.7 } },
  { id: "frame", kind: "frame", x: 0, z: 0, rot: 0, variant: 0, wall: { side: "back", u: -1.5, y: 2.3 } },
];

const EPS = 1e-6;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const snap = (v: number, step = GRID) => Math.round(v / step) * step;

/** Width and depth on the floor after turning. */
export function footprint(it: Item): [number, number] {
  const [w, , d] = KINDS[it.kind].size;
  return it.rot % 2 ? [d, w] : [w, d];
}

/** The floor box an item covers. */
export function box(it: Item) {
  const [w, d] = footprint(it);
  return { x0: it.x - w / 2, x1: it.x + w / 2, z0: it.z - d / 2, z1: it.z + d / 2 };
}

/** The wall box a picture covers, in its wall's (u, y). */
export function wallBox(it: Item) {
  const [w, h] = KINDS[it.kind].size, { u, y } = it.wall!;
  return { u0: u - w / 2, u1: u + w / 2, y0: y - h / 2, y1: y + h / 2 };
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - EPS && b0 < a1 - EPS;

/** Whether an item may stand where it is among the others. */
export function fits(items: Item[], it: Item): boolean {
  if (it.wall) {
    const a = wallBox(it), half = it.wall.side === "back" ? ROOM.w / 2 : ROOM.d / 2;
    if (a.u0 < -half - EPS || a.u1 > half + EPS || a.y0 < 0.3 - EPS || a.y1 > ROOM.h - 0.1 + EPS) return false;
    if (it.wall.side === "back" && overlap(a.u0, a.u1, WINDOW.x0 - 0.05, WINDOW.x1 + 0.05) && overlap(a.y0, a.y1, WINDOW.y0 - 0.05, WINDOW.y1 + 0.05)) return false;
    return items.every((o) => o.id === it.id || !o.wall || o.wall.side !== it.wall!.side || (() => {
      const b = wallBox(o);
      return !(overlap(a.u0, a.u1, b.u0, b.u1) && overlap(a.y0, a.y1, b.y0, b.y1));
    })());
  }
  const a = box(it);
  if (a.x0 < -ROOM.w / 2 - EPS || a.x1 > ROOM.w / 2 + EPS || a.z0 < -ROOM.d / 2 - EPS || a.z1 > ROOM.d / 2 + EPS) return false;
  if (KINDS[it.kind].flat) return true;
  return items.every((o) => {
    if (o.id === it.id || o.wall || KINDS[o.kind].flat) return true;
    const b = box(o);
    return !(overlap(a.x0, a.x1, b.x0, b.x1) && overlap(a.z0, a.z1, b.z0, b.z1));
  });
}

/** Keeps a floor item's box inside the room. */
function inside(it: Item): Item {
  const [w, d] = footprint(it);
  return { ...it, x: clamp(it.x, -ROOM.w / 2 + w / 2, ROOM.w / 2 - w / 2), z: clamp(it.z, -ROOM.d / 2 + d / 2, ROOM.d / 2 - d / 2) };
}

const replace = (items: Item[], it: Item) => items.map((o) => (o.id === it.id ? it : o));

/** Moves a floor item towards (x, z) on the grid; where it would overlap something, it stays put. */
export function moveTo(items: Item[], id: string, x: number, z: number): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it || it.wall) return items;
  const next = inside({ ...it, x: snap(x), z: snap(z) });
  return fits(items, next) ? replace(items, next) : items;
}

/** Hangs a picture at (u, y) on a wall, on the grid, if there's room. */
export function hang(items: Item[], id: string, side: Side, u: number, y: number): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it?.wall) return items;
  const [w, h] = KINDS[it.kind].size, half = (side === "back" ? ROOM.w : ROOM.d) / 2;
  const next = { ...it, wall: { side, u: clamp(snap(u), -half + w / 2, half - w / 2), y: clamp(snap(y), 0.3 + h / 2, ROOM.h - 0.1 - h / 2) } };
  return fits(items, next) ? replace(items, next) : items;
}

/** A quarter turn, nudged back inside the room; if it can't fit, it doesn't turn. */
export function turn(items: Item[], id: string): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it || it.wall) return items;
  const next = inside({ ...it, rot: (it.rot + 1) % 4 });
  return fits(items, next) ? replace(items, next) : items;
}

/** The item's next colour or picture. */
export function restyle(items: Item[], id: string): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it) return items;
  return replace(items, { ...it, variant: (it.variant + 1) % KINDS[it.kind].variants.length });
}

export const variantOf = (it: Item) => KINDS[it.kind].variants[it.variant] ?? KINDS[it.kind].variants[0];

/**
 * A saved layout made safe: every default item appears once, from the save where it's sound and
 * still fits, else where it starts. Unknown or broken entries are dropped.
 */
export function restore(saved: unknown): Item[] {
  const list = Array.isArray(saved) ? saved : [];
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  let out: Item[] = [];
  for (const d of DEFAULT_LAYOUT) {
    const s = list.find((o) => o && typeof o === "object" && (o as Item).id === d.id) as Partial<Item> | undefined;
    let it: Item = d;
    if (s && num(s.x) && num(s.z) && num(s.rot) && num(s.variant)) {
      const w = s.wall;
      const wallOk = !d.wall || (!!w && (w.side === "back" || w.side === "left") && num(w.u) && num(w.y));
      if (wallOk) it = { ...d, x: s.x!, z: s.z!, rot: ((Math.round(s.rot!) % 4) + 4) % 4, variant: Math.abs(Math.round(s.variant!)) % KINDS[d.kind].variants.length, ...(d.wall ? { wall: { ...w! } } : {}) };
    }
    out.push(it);
  }
  // Anything that no longer fits (say, two saves overlapping) goes back to where it starts.
  out = out.map((it, i) => (fits(out.filter((_, j) => j !== i), it) ? it : DEFAULT_LAYOUT[i]));
  return out;
}
