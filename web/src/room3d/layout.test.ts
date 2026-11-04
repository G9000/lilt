// node --test src/room3d/layout.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { box, canMove, canTurn, DEFAULT_LAYOUT, FIXED, fits, footprint, hang, KINDS, moveTo, restore, restyle, ROOM, snap, turn, variantOf } from "./layout.ts";

const get = (items: typeof DEFAULT_LAYOUT, id: string) => items.find((o) => o.id === id)!;

test("the starting room fits: inside the walls, clear of the desk and shelves, nothing overlapping", () => {
  for (const it of DEFAULT_LAYOUT) assert.ok(fits(DEFAULT_LAYOUT, it), it.id);
  assert.equal(new Set(DEFAULT_LAYOUT.map((o) => o.id)).size, DEFAULT_LAYOUT.length);
  for (const it of DEFAULT_LAYOUT) assert.ok(KINDS[it.kind], it.kind);
});

test("moving snaps to the grid and stays in the room", () => {
  const moved = get(moveTo(DEFAULT_LAYOUT, "chair", 1.12, 0.6), "chair");
  assert.deepEqual([moved.x, moved.z], [1, 0.5]);
  const far = get(moveTo(DEFAULT_LAYOUT, "chair", 99, 99), "chair");
  const b = box(far);
  assert.ok(b.x1 <= ROOM.x1 + 1e-9 && b.z1 <= ROOM.z1 + 1e-9);
  assert.equal(snap(0.37), 0.25);
});

test("nothing moves into the desk, the shelves or another thing", () => {
  const chair = get(DEFAULT_LAYOUT, "chair");
  const desk = FIXED.find((f) => f.id === "desk")!, shelves = FIXED.find((f) => f.id === "shelves")!;
  assert.deepEqual(get(moveTo(DEFAULT_LAYOUT, "chair", (desk.x0 + desk.x1) / 2, (desk.z0 + desk.z1) / 2), "chair"), chair);
  assert.deepEqual(get(moveTo(DEFAULT_LAYOUT, "chair", (shelves.x0 + shelves.x1) / 2, (shelves.z0 + shelves.z1) / 2), "chair"), chair);
  const bed = get(DEFAULT_LAYOUT, "bed");
  assert.deepEqual(get(moveTo(DEFAULT_LAYOUT, "chair", bed.x, bed.z), "chair"), chair);
});

test("the keyboard, lamps and flowers stay put but change colour", () => {
  for (const id of ["keyboard", "lamps", "flowers"]) {
    const it = get(DEFAULT_LAYOUT, id);
    assert.equal(canMove(it), false);
    assert.equal(canTurn(it), false);
    assert.equal(moveTo(DEFAULT_LAYOUT, id, 0, 1), DEFAULT_LAYOUT);
    assert.equal(turn(DEFAULT_LAYOUT, id), DEFAULT_LAYOUT);
    assert.equal(get(restyle(DEFAULT_LAYOUT, id), id).variant, 1);
  }
});

test("turning swaps width and depth, and is refused where it wouldn't fit", () => {
  const bed = get(DEFAULT_LAYOUT, "bed");
  assert.deepEqual(footprint({ ...bed, rot: 0 }), [1.63, 1.91]);
  // Whatever a turn gives back still fits: it turns where there is room, and stays put where there isn't.
  const tight = moveTo(DEFAULT_LAYOUT, "bed", -2.25, 2);
  const turned = get(turn(tight, "bed"), "bed");
  assert.ok(fits(tight, turned));
  const chair = get(turn(DEFAULT_LAYOUT, "chair"), "chair");
  assert.equal(chair.rot, 3);
  assert.deepEqual(footprint(chair), [0.7, 0.75]);
});

test("pictures hang on either wall, on the grid, never over the window, the shelves or each other", () => {
  const left = get(hang(DEFAULT_LAYOUT, "poster", "left", -0.6, 1.6), "poster");
  assert.deepEqual(left.wall, { side: "left", u: -0.5, y: 1.5 });
  const original = get(DEFAULT_LAYOUT, "poster");
  assert.deepEqual(get(hang(DEFAULT_LAYOUT, "poster", "back", 1, 1.7), "poster"), original); // the window
  assert.deepEqual(get(hang(DEFAULT_LAYOUT, "poster", "back", -2.5, 1.7), "poster"), original); // the shelves
  const frame = get(DEFAULT_LAYOUT, "frame");
  assert.deepEqual(get(hang(DEFAULT_LAYOUT, "poster", "left", frame.wall!.u, frame.wall!.y), "poster"), original);
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
  const moved = restyle(restyle(moveTo(DEFAULT_LAYOUT, "chair", 1, 0.5), "lamps"), "bed");
  assert.deepEqual(restore(JSON.parse(JSON.stringify(moved))), moved);
  assert.deepEqual(restore("nonsense"), DEFAULT_LAYOUT);
  assert.deepEqual(restore([{ id: "chair", x: "a" }, { id: "dragon", x: 0, z: 0, rot: 0, variant: 0 }]), DEFAULT_LAYOUT);
  const clash = DEFAULT_LAYOUT.map((o) => (o.id === "chair" ? { ...o, x: get(DEFAULT_LAYOUT, "bed").x, z: get(DEFAULT_LAYOUT, "bed").z } : o));
  assert.deepEqual(get(restore(clash), "chair"), get(DEFAULT_LAYOUT, "chair"));
  // A fixed thing keeps its place even if a save says otherwise, but keeps its colour.
  const lamps = get(restore([{ ...get(DEFAULT_LAYOUT, "lamps"), x: 2, z: 2, variant: 6 }]), "lamps");
  assert.deepEqual([lamps.x, lamps.z, lamps.variant], [get(DEFAULT_LAYOUT, "lamps").x, get(DEFAULT_LAYOUT, "lamps").z, 2]);
});
