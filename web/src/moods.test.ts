// node --test src/moods.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MOODS, walkingBass } from "./desk/moods.ts";

test("every mood has its own name, a cover that exists and a calm tempo", () => {
  assert.equal(new Set(MOODS.map((m) => m.name)).size, MOODS.length);
  assert.ok(MOODS.length >= 17);
  for (const m of MOODS) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public${m.cover}`, import.meta.url))), `${m.name}: ${m.cover}`);
    assert.ok(m.bpm >= 50 && m.bpm <= 96, `${m.name}: ${m.bpm} bpm`);
    assert.ok(m.description.length > 0 && m.description.length <= 40, m.name);
  }
});

test("the first nine moods are unchanged, so a saved favourite still plays", () => {
  assert.deepEqual(MOODS.slice(0, 9).map((m) => m.name), [
    "Rain on the window", "Desk lamp", "City at dusk", "Night bus", "Sunday morning", "Train window", "Snow day", "Bedroom cassette", "Library, after hours",
  ]);
});

test("chords are four bars of real notes, lowest first, in a comfortable register", () => {
  for (const m of MOODS) {
    assert.equal(m.prog.length, 4, m.name);
    for (const chord of m.prog) {
      assert.ok(chord.length >= 3 && chord.length <= 5, m.name);
      assert.deepEqual([...chord].sort((a, b) => a - b), chord, `${m.name}: lowest first`);
      assert.ok(chord[0] >= 36 && chord.at(-1)! <= 72, `${m.name}: ${chord}`);
    }
  }
});

test("a walking bass steps through the chord and leads into the next root", () => {
  // Dm9 to G: D, F (minor third), A, then G-sharp (nearer the A than F-sharp is) down into G.
  assert.deepEqual(walkingBass([50, 53, 57, 60, 64], [43, 53, 57, 59, 64]), [38, 41, 45, 32]);
  // C major to A: C, E, G, then into A from a semitone away.
  const walk = walkingBass([48, 52, 55, 59, 62], [45, 49, 55, 58, 61]);
  assert.deepEqual(walk.slice(0, 3), [36, 40, 43]);
  assert.equal(Math.abs(walk[3] - 33), 1);
});
