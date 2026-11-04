// node --test src/room/items.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { chosen, cycle, screenTone, SLOTS } from "./items.ts";
import { weights } from "./scene.ts";

const main = SLOTS.find((s) => s.id === "main-screen")!;

test("every slot starts with the painting and has a few pictures", () => {
  for (const s of SLOTS) {
    assert.equal(s.variants[0].id, "painted");
    assert.equal(s.variants[0].url, undefined);
    assert.ok(s.variants.length >= 3 && s.variants.length <= 5);
    assert.equal(new Set(s.variants.map((v) => v.id)).size, s.variants.length);
    for (const v of s.variants.slice(1)) assert.match(v.url!, /^pictures\/[a-z0-9-]+\.webp$/);
  }
});

test("a missing or unknown choice shows the painting", () => {
  assert.equal(chosen(undefined, main).id, "painted");
  assert.equal(chosen({ "main-screen": "gone" }, main).id, "painted");
  assert.equal(chosen({ "main-screen": "window" }, main).id, "window");
});

test("cycling steps through the pictures and back to the painting, stored as no entry", () => {
  let items = {};
  const seen: string[] = [];
  for (let i = 0; i < main.variants.length; i++) { items = cycle(items, "main-screen"); seen.push(chosen(items, main).id); }
  assert.deepEqual(seen, [...main.variants.slice(1).map((v) => v.id), "painted"]);
  assert.deepEqual(items, {});
});

test("cycling one slot leaves the others alone, and an unknown slot changes nothing", () => {
  const items = { "side-screen": "nebula-cliffs" };
  assert.deepEqual(cycle(items, "main-screen"), { "side-screen": "nebula-cliffs", "main-screen": "nebula-pillars" });
  assert.deepEqual(cycle(items, "rug"), items);
});

test("the screens are as bright as the painting by day and a little dimmer at night", () => {
  assert.equal(screenTone(weights(12 * 60)), "brightness(1.000) saturate(1.000) sepia(0.000)");
  const night = Number(/brightness\(([\d.]+)\)/.exec(screenTone(weights(2 * 60)))![1]);
  assert.ok(night < 0.9 && night > 0.7);
});
