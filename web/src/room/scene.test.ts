// node --test src/room/scene.test.ts  (Node 22+ strips the types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { innerBox, layerOpacity, MAIN_SCREEN, quadMatrix, SIDE_SCREEN, weights } from "./scene.ts";

/** Apply a CSS matrix3d (column-major) to a 2D point. */
function apply(css: string, x: number, y: number) {
  const m = css.slice(9, -1).split(",").map(Number);
  const X = m[0] * x + m[4] * y + m[12], Y = m[1] * x + m[5] * y + m[13], Wp = m[3] * x + m[7] * y + m[15];
  return [X / Wp, Y / Wp];
}

test("the warp puts each corner of the element on the monitor's corner", () => {
  for (const q of [MAIN_SCREEN, SIDE_SCREEN]) {
    const css = quadMatrix(520, 232, q);
    const corners: [number, number][] = [[0, 0], [520, 0], [520, 232], [0, 232]];
    corners.forEach(([x, y], i) => {
      const [X, Y] = apply(css, x, y);
      assert.ok(Math.abs(X - q[i][0]) < 0.01 && Math.abs(Y - q[i][1]) < 0.01, `corner ${i}: ${X},${Y} vs ${q[i]}`);
    });
  }
});

test("the lights always add up to one and follow the clock", () => {
  for (let m = 0; m < 1440; m += 7) {
    const w = weights(m);
    assert.ok(Math.abs(w.day + w.morning + w.sunset + w.night - 1) < 1e-9, `minute ${m}`);
  }
  assert.equal(weights(180).night, 1);
  assert.equal(weights(800).day, 1);
  assert.ok(weights(1155).sunset > 0.99);
});

test("stacked layer opacities reproduce the mix", () => {
  for (const m of [400, 700, 1100, 1200, 1300]) {
    const w = weights(m), o = layerOpacity(w);
    // Composite day → morning → sunset → night and read back each layer's share.
    let share = { day: 1, morning: 0, sunset: 0, night: 0 };
    for (const k of ["morning", "sunset", "night"] as const) {
      for (const j of Object.keys(share) as (keyof typeof share)[]) share[j] *= 1 - o[k];
      share[k] = o[k];
    }
    for (const k of Object.keys(w) as (keyof typeof w)[]) assert.ok(Math.abs(share[k] - w[k]) < 1e-9, `${m} ${k}`);
  }
});

test("the zoom box sits fully inside the screen", () => {
  const b = innerBox(MAIN_SCREEN);
  assert.ok(b.w > 200 && b.h > 80);
  assert.ok(b.x - b.w / 2 >= Math.max(MAIN_SCREEN[0][0], MAIN_SCREEN[3][0]));
  assert.ok(b.y + b.h / 2 <= Math.min(MAIN_SCREEN[2][1], MAIN_SCREEN[3][1]));
});
