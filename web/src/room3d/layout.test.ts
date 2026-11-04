// node --test src/room3d/layout.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { box, DEFAULT_LAYOUT, fits, footprint, hang, KINDS, moveTo, restore, restyle, ROOM, snap, turn, variantOf } from "./layout.ts";

const get = (items: typeof DEFAULT_LAYOUT, id: string) => items.find((o) => o.id === id)!;

test("the starting room fits: inside the walls, nothing overlapping", () => {
  for (const it of DEFAULT_LAYOUT) assert.ok(fits(DEFAULT_LAYOUT, it), it.id);
  assert.equal(new Set(DEFAULT_LAYOUT.map((o) => o.id)).size, DEFAULT_LAYOUT.length);
  for (const it of DEFAULT_LAYOUT) assert.ok(KINDS[it.kind], it.kind);
});

test("moving snaps to the grid and stays in the room", () => {
  const moved = get(moveTo(DEFAULT_LAYOUT, "chair", 0.12, 0.6), "chair");
  assert.deepEqual([moved.x, moved.z], [0, 0.5]);
  const far = get(moveTo(DEFAULT_LAYOUT, "chair", 99, 99), "chair");
  const b = box(far);
  assert.ok(b.x1 <= ROOM.w / 2 + 1e-9 && b.z1 <= ROOM.d / 2 + 1e-9);
  assert.equal(snap(0.37), 0.25);
});

test("a move onto something else is refused, but things can stand on the rug", () => {
  const before = get(DEFAULT_LAYOUT, "chair");
  const bed = get(DEFAULT_LAYOUT, "bed");
  assert.deepEqual(get(moveTo(DEFAULT_LAYOUT, "chair", bed.x, bed.z), "chair"), before);
  const rug = get(DEFAULT_LAYOUT, "rug");
  const onRug = get(moveTo(DEFAULT_LAYOUT, "chair", rug.x, rug.z), "chair");
  assert.deepEqual([onRug.x, onRug.z], [rug.x, rug.z]);
});

test("turning swaps width and depth, and is refused where it wouldn't fit", () => {
  const desk = get(DEFAULT_LAYOUT, "desk");
  assert.deepEqual(footprint({ ...desk, rot: 1 }), [0.75, 1.4]);
  // Against the back wall with the chair pulled up, the desk has no room to turn.
  assert.equal(get(turn(DEFAULT_LAYOUT, "desk"), "desk").rot, 0);
  const free = moveTo(DEFAULT_LAYOUT, "desk", 0.5, 0.5);
  assert.equal(get(turn(free, "desk"), "desk").rot, 1);
});

test("pictures hang on either wall, on the grid, but never over the window or each other", () => {
  const left = get(hang(DEFAULT_LAYOUT, "poster", "left", 1.1, 1.6), "poster");
  assert.deepEqual(left.wall, { side: "left", u: 1, y: 1.5 });
  const overWindow = get(hang(DEFAULT_LAYOUT, "poster", "back", 1, 1.7), "poster");
  assert.deepEqual(overWindow, get(DEFAULT_LAYOUT, "poster"));
  const frame = get(DEFAULT_LAYOUT, "frame");
  const onFrame = get(hang(DEFAULT_LAYOUT, "poster", "back", frame.wall!.u, frame.wall!.y), "poster");
  assert.deepEqual(onFrame, get(DEFAULT_LAYOUT, "poster"));
  // a floor move doesn't apply to a picture, nor a hang to furniture
  assert.equal(moveTo(DEFAULT_LAYOUT, "poster", 0, 0), DEFAULT_LAYOUT);
  assert.equal(hang(DEFAULT_LAYOUT, "bed", "left", 0, 1.5), DEFAULT_LAYOUT);
});

test("restyling steps through an item's colours and round again", () => {
  let items = DEFAULT_LAYOUT;
  const n = KINDS.bed.variants.length, seen: string[] = [];
  for (let i = 0; i < n; i++) { items = restyle(items, "bed"); seen.push(variantOf(get(items, "bed")).id); }
  assert.deepEqual(seen, [...KINDS.bed.variants.slice(1).map((v) => v.id), "pink"]);
});

test("a saved layout comes back, and a broken one falls back to the start", () => {
  const moved = restyle(moveTo(DEFAULT_LAYOUT, "chair", 0, 0.5), "lamp");
  assert.deepEqual(restore(JSON.parse(JSON.stringify(moved))), moved);
  assert.deepEqual(restore("nonsense"), DEFAULT_LAYOUT);
  assert.deepEqual(restore([{ id: "chair", x: "a" }, { id: "dragon", x: 0, z: 0, rot: 0, variant: 0 }]), DEFAULT_LAYOUT);
  const clash = DEFAULT_LAYOUT.map((o) => (o.id === "chair" ? { ...o, x: get(DEFAULT_LAYOUT, "bed").x, z: get(DEFAULT_LAYOUT, "bed").z } : o));
  assert.deepEqual(get(restore(clash), "chair"), get(DEFAULT_LAYOUT, "chair"));
  assert.equal(get(restore([{ ...get(DEFAULT_LAYOUT, "lamp"), variant: 7, rot: -1 }]), "lamp").rot, 3);
});
