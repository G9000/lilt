/**
 * The 3D room (a test): the painted room rebuilt in 3D, and what in it you can change. The bed, the
 * chair, the tall plant and the cabinets move about the floor on a grid and turn in quarter turns;
 * the keyboard, the lamps and the flowers stay put but change colour; the two pictures hang on the
 * back or left wall. Nothing overlaps, nothing leaves the room, and nothing goes through the desk,
 * the shelves or the window. Metres, y up; the window wall is at z = -2 and the left wall at x = -3.2.
 */

export const ROOM = { x0: -3.2, x1: 3.6, z0: -2, z1: 2.6, h: 2.9 };
export const GRID = 0.25;
/** The window: the back wall from here to the right, from the desk up. */
export const WINDOW = { x0: -0.95, x1: 3.6, y0: 0.8, y1: 2.85 };
/** What's fixed on the floor: the long desk under the window, and the shelves and rack at the back left. */
export const FIXED = [
  { id: "desk", x0: -1, x1: 3.3, z0: -2, z1: -1.25 },
  { id: "shelves", x0: -3.2, x1: -1.8, z0: -2, z1: -1.45 },
];
/** Where pictures can't hang: the shelves fill the back wall's left end. */
const WALL_BLOCKS = [{ side: "back" as const, u0: -3.2, u1: -1.8, y0: 0, y1: ROOM.h }];

export type Side = "back" | "left";
export interface Variant { id: string; name: string; color?: string; picture?: string }
export interface Kind {
  id: string; name: string;
  /** Width (x), height and depth (z) before turning; a picture's depth is its thickness. */
  size: [number, number, number];
  wall?: boolean;
  /** Stays where it is (on the desk, on the shelves): it only changes colour. */
  fixed?: boolean;
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
  // Sizes are the models' as the room scales them (Room3D.tsx), so footprints match what you see.
  bed: { id: "bed", name: "Bed", size: [1.63, 0.64, 1.91], variants: [
    { id: "pink", name: "Pink cover", color: "#f1a3c0" }, { id: "blue", name: "Blue cover", color: "#93b4ea" },
    { id: "sage", name: "Sage cover", color: "#a9c79b" }, { id: "cream", name: "Cream cover", color: "#f3e4c8" }, { id: "lilac", name: "Lilac cover", color: "#c4ade8" },
  ] },
  chair: { id: "chair", name: "Chair", size: [0.75, 1.34, 0.7], variants: [
    { id: "pink", name: "Pink blanket", color: "#f0a9c4" }, { id: "lilac", name: "Lilac blanket", color: "#c4ade8" },
    { id: "mint", name: "Mint blanket", color: "#a5dcc8" }, { id: "cream", name: "Cream blanket", color: "#f3e4c8" },
  ] },
  plant: { id: "plant", name: "Tall plant", size: [0.51, 1.57, 0.58], variants: [
    { id: "green", name: "Green leaves", color: "#6fa35b" }, { id: "autumn", name: "Autumn leaves", color: "#e0913c" }, { id: "silver", name: "Silver leaves", color: "#b8c4b8" },
  ] },
  cabinet: { id: "cabinet", name: "Cabinets", size: [0.86, 0.9, 0.86], variants: [
    { id: "cream", name: "Cream", color: "#efe6da" }, { id: "wood", name: "Wood", color: "#c99a6a" }, { id: "mint", name: "Mint", color: "#bfe0d2" },
  ] },
  keyboard: { id: "keyboard", name: "Keyboard", size: [0.68, 0.05, 0.28], fixed: true, variants: [
    { id: "pink", name: "Pink", color: "#f2a7c3" }, { id: "white", name: "White", color: "#f4f1ee" }, { id: "lilac", name: "Lilac", color: "#c4ade8" }, { id: "mint", name: "Mint", color: "#a5dcc8" },
  ] },
  lamps: { id: "lamps", name: "Globe lamps", size: [0.3, 0.3, 0.3], fixed: true, variants: [
    { id: "warm", name: "Warm light", color: "#ffc27a" }, { id: "rose", name: "Rose light", color: "#ff8fbf" }, { id: "lilac", name: "Lilac light", color: "#c9a8ff" }, { id: "moon", name: "Moonlight", color: "#a9c8ff" },
  ] },
  flowers: { id: "flowers", name: "Flowers", size: [0.4, 0.6, 0.4], fixed: true, variants: [
    { id: "pink", name: "Pink blossom", color: "#f6a6c6" }, { id: "white", name: "White blossom", color: "#fbf3f6" }, { id: "yellow", name: "Yellow blossom", color: "#f6d77a" }, { id: "lilac", name: "Lilac blossom", color: "#c9a8ff" },
  ] },
  poster: { id: "poster", name: "Poster", size: [0.55, 0.75, 0.03], wall: true, variants: [
    pic("nebula-pillars", "Pillars of Creation"), pic("cat-window-nap", "Cat napping by the window"), pic("plant-fern", "Fern in the shade"), pic("galaxy-whirlpool", "The Whirlpool Galaxy"),
  ] },
  frame: { id: "frame", name: "Small frame", size: [0.45, 0.45, 0.03], wall: true, variants: [
    pic("cat-blanket", "Cat on a blanket"), pic("plant-succulents", "Succulents by the window"), pic("cat-kitten", "Kitten, paws up"),
  ] },
};

export const DEFAULT_LAYOUT: Item[] = [
  // The bed lies across the front left, its head at the left wall (three quarter turns).
  { id: "bed", kind: "bed", x: -1, z: 1.75, rot: 3, variant: 0 },
  { id: "chair", kind: "chair", x: 0.5, z: -0.5, rot: 2, variant: 0 },
  { id: "plant", kind: "plant", x: -1.45, z: -1.65, rot: 0, variant: 0 },
  { id: "cabinet", kind: "cabinet", x: 2.5, z: 1.5, rot: 3, variant: 0 },
  { id: "keyboard", kind: "keyboard", x: 0.95, z: -1.45, rot: 0, variant: 0 },
  { id: "lamps", kind: "lamps", x: -2.55, z: -1.72, rot: 0, variant: 0 },
  { id: "flowers", kind: "flowers", x: 3.05, z: -1.75, rot: 0, variant: 0 },
  { id: "poster", kind: "poster", x: 0, z: 0, rot: 0, variant: 0, wall: { side: "back", u: -1.375, y: 1.75 } },
  { id: "frame", kind: "frame", x: 0, z: 0, rot: 0, variant: 0, wall: { side: "left", u: 0.75, y: 1.6 } },
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

/** How far along a wall goes: x on the back wall, z on the left. */
const wallSpan = (side: Side): [number, number] => (side === "back" ? [ROOM.x0, ROOM.x1] : [ROOM.z0, ROOM.z1]);

const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - EPS && b0 < a1 - EPS;

/** Whether an item may stand where it is among the others. */
export function fits(items: Item[], it: Item): boolean {
  if (KINDS[it.kind].fixed) return true;
  if (it.wall) {
    const a = wallBox(it), [lo, hi] = wallSpan(it.wall.side);
    if (a.u0 < lo - EPS || a.u1 > hi + EPS || a.y0 < 0.3 - EPS || a.y1 > ROOM.h - 0.1 + EPS) return false;
    if (it.wall.side === "back" && overlap(a.u0, a.u1, WINDOW.x0 - 0.05, WINDOW.x1 + 0.05) && overlap(a.y0, a.y1, WINDOW.y0 - 0.05, WINDOW.y1 + 0.05)) return false;
    if (WALL_BLOCKS.some((b) => b.side === it.wall!.side && overlap(a.u0, a.u1, b.u0, b.u1) && overlap(a.y0, a.y1, b.y0, b.y1))) return false;
    return items.every((o) => o.id === it.id || !o.wall || o.wall.side !== it.wall!.side || (() => {
      const b = wallBox(o);
      return !(overlap(a.u0, a.u1, b.u0, b.u1) && overlap(a.y0, a.y1, b.y0, b.y1));
    })());
  }
  const a = box(it);
  if (a.x0 < ROOM.x0 - EPS || a.x1 > ROOM.x1 + EPS || a.z0 < ROOM.z0 - EPS || a.z1 > ROOM.z1 + EPS) return false;
  if (FIXED.some((f) => overlap(a.x0, a.x1, f.x0, f.x1) && overlap(a.z0, a.z1, f.z0, f.z1))) return false;
  return items.every((o) => {
    if (o.id === it.id || o.wall || KINDS[o.kind].fixed) return true;
    const b = box(o);
    return !(overlap(a.x0, a.x1, b.x0, b.x1) && overlap(a.z0, a.z1, b.z0, b.z1));
  });
}

/** Keeps a floor item's box inside the room. */
function inside(it: Item): Item {
  const [w, d] = footprint(it);
  return { ...it, x: clamp(it.x, ROOM.x0 + w / 2, ROOM.x1 - w / 2), z: clamp(it.z, ROOM.z0 + d / 2, ROOM.z1 - d / 2) };
}

const replace = (items: Item[], it: Item) => items.map((o) => (o.id === it.id ? it : o));
const movable = (it: Item | undefined) => !!it && !it.wall && !KINDS[it.kind].fixed;

/** Moves a floor item towards (x, z) on the grid; where it would overlap something, it stays put. */
export function moveTo(items: Item[], id: string, x: number, z: number): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it || !movable(it)) return items;
  const next = inside({ ...it, x: snap(x), z: snap(z) });
  return fits(items, next) ? replace(items, next) : items;
}

/** Hangs a picture at (u, y) on a wall, on the grid, if there's room. */
export function hang(items: Item[], id: string, side: Side, u: number, y: number): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it?.wall) return items;
  const [w, h] = KINDS[it.kind].size, [lo, hi] = wallSpan(side);
  const next = { ...it, wall: { side, u: clamp(snap(u), lo + w / 2, hi - w / 2), y: clamp(snap(y), 0.3 + h / 2, ROOM.h - 0.1 - h / 2) } };
  return fits(items, next) ? replace(items, next) : items;
}

/** A quarter turn, nudged back inside the room; if it can't fit, it doesn't turn. */
export function turn(items: Item[], id: string): Item[] {
  const it = items.find((o) => o.id === id);
  if (!it || !movable(it)) return items;
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
export const canMove = (it: Item) => !KINDS[it.kind].fixed;
export const canTurn = (it: Item) => movable(it);

/**
 * A saved layout made safe: every default item appears once, from the save where it's sound and
 * still fits, else where it starts. Fixed things keep their place and take only their colour.
 */
export function restore(saved: unknown): Item[] {
  const list = Array.isArray(saved) ? saved : [];
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  let out: Item[] = [];
  for (const d of DEFAULT_LAYOUT) {
    const s = list.find((o) => o && typeof o === "object" && (o as Item).id === d.id) as Partial<Item> | undefined;
    let it: Item = d;
    if (s && num(s.x) && num(s.z) && num(s.rot) && num(s.variant)) {
      const variant = Math.abs(Math.round(s.variant!)) % KINDS[d.kind].variants.length;
      const w = s.wall;
      const wallOk = !d.wall || (!!w && (w.side === "back" || w.side === "left") && num(w.u) && num(w.y));
      if (KINDS[d.kind].fixed) it = { ...d, variant };
      else if (wallOk) it = { ...d, x: s.x!, z: s.z!, rot: ((Math.round(s.rot!) % 4) + 4) % 4, variant, ...(d.wall ? { wall: { ...w! } } : {}) };
    }
    out.push(it);
  }
  // Anything that no longer fits (say, two saves overlapping) goes back to where it starts.
  out = out.map((it, i) => (fits(out.filter((_, j) => j !== i), it) ? it : DEFAULT_LAYOUT[i]));
  return out;
}
