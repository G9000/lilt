// node --test src/room/items.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { bounds, chosen, cycle, keyFor, lampGlow, LAMP_GLOW, membership, recolor, screenTone, SLOTS } from "./items.ts";
import { weights } from "./scene.ts";

const main = SLOTS.find((s) => s.id === "main-screen")!;

test("every slot starts with the painting and has a few variants of its kind", () => {
  assert.deepEqual(SLOTS.map((s) => s.id), ["main-screen", "side-screen", "lamp", "plant", "bed"]);
  for (const s of SLOTS) {
    assert.equal(s.variants[0].id, "painted");
    assert.equal(s.variants[0].url ?? s.variants[0].tint, undefined);
    assert.ok(s.variants.length >= 3 && s.variants.length <= 5);
    assert.equal(new Set(s.variants.map((v) => v.id)).size, s.variants.length);
    assert.ok(s.area.length > 0 && s.area.every((poly) => poly.length >= 3));
    for (const v of s.variants.slice(1)) {
      if (s.quad) assert.match(v.url!, /^pictures\/[a-z0-9-]+\.webp$/);
      else { assert.ok(s.key && v.tint, `${s.id}/${v.id}`); assert.equal(v.url, undefined); }
    }
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

test("the lamp glows warm unless you chose another colour", () => {
  assert.equal(lampGlow(undefined), LAMP_GLOW);
  assert.equal(lampGlow({ lamp: "rose" }), "255,138,190");
  assert.equal(lampGlow({ lamp: "nope" }), LAMP_GLOW);
});

test("a slot's box holds all its outlines", () => {
  assert.deepEqual(bounds([[[10, 20], [30, 20], [30, 40]], [[50, 5], [60, 5], [55, 8]]]), { x: 10, y: 5, w: 50, h: 35 });
});

test("the key picks out the thing's colours, with soft edges, and wraps past red", () => {
  const pink = { hue: [270, 25] as [number, number], sat: 0.16 };
  assert.equal(membership(230, 120, 170, pink), 1); // pink
  assert.equal(membership(200, 90, 60, pink), 1); // red-orange, inside the wrap
  assert.equal(membership(80, 160, 90, pink), 0); // green
  assert.equal(membership(200, 200, 200, pink), 0); // grey: the cat's white fur
  const edge = membership(210, 150, 90, pink); // orange, a little past 25°
  assert.ok(edge > 0 && edge < 1, String(edge));
  const bright = { hue: [15, 65] as [number, number], sat: 0.25, light: 0.55 };
  assert.equal(membership(255, 200, 120, bright), 1);
  assert.equal(membership(120, 80, 30, bright), 0); // warm but dark: the shelf, not the lamp
});

test("recolouring turns the hue of what the key picks and clears everything else", () => {
  // a column of pixels: pink ones, then green ones, then a transparent one, far enough apart that
  // the softened mask settles in each
  const col = [...Array(8).fill([230, 120, 170, 255]), ...Array(8).fill([80, 160, 90, 255]), [230, 120, 170, 0]];
  const px = new Uint8ClampedArray(col.flat());
  recolor(px, 1, { hue: [270, 25], sat: 0.16 }, { hue: -120 });
  const [r, g, b, a] = px.slice(0, 4);
  assert.equal(a, 255);
  assert.ok(b > r && b > g, `pink turned blue-ish: ${r},${g},${b}`);
  assert.equal(px[15 * 4 + 3], 0); // the green pixels are left to the painting
  assert.ok(px[8 * 4 + 3] > 0 && px[8 * 4 + 3] < 255, "the edge between them is soft");
  assert.equal(px[16 * 4 + 3], 0); // already transparent stays so
});

test("a target tint gathers the thing's hues near one colour, keeping a little of their spread", () => {
  // sunlit pink and shaded lavender, as the bed is painted
  const px = new Uint8ClampedArray([235, 120, 150, 255, 160, 120, 220, 255]);
  recolor(px, 2, { hue: [270, 25], sat: 0.16 }, { to: 215 });
  const hue = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const a = hue(px[0], px[1], px[2]), b = hue(px[4], px[5], px[6]);
  for (const h of [a, b]) assert.ok(h > 185 && h < 245, String(h));
  assert.ok(Math.abs(a - b) > 5, "light and shade still differ");
});

test("the bed has its own key at night, when the painting turns it blue", () => {
  const bed = SLOTS.find((s) => s.id === "bed")!, lamp = SLOTS.find((s) => s.id === "lamp")!;
  const navy = [60, 70, 140] as const;
  assert.equal(membership(...navy, keyFor(bed, "night")), 1);
  assert.equal(keyFor(bed, "day"), bed.key);
  assert.equal(keyFor(lamp, "night"), lamp.key);
});
