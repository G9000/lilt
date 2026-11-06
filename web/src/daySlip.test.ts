// node --test src/daySlip.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { daySlip, shortFront } from "./daySlip.ts";

test("the slip says what you practised, grouped by chapter in the order you said them", () => {
  const s = daySlip([
    { front: "mmmmmmm", chapter: "Warm-ups" },
    { front: "One, two, three, four, five, six, seven, eight, nine, ten.", chapter: "Reference" },
    { front: "mmm… hello, how are you?", chapter: "Warm-ups" },
  ]);
  assert.equal(s.lede, "You said three cards out loud today, from two chapters.");
  assert.deepEqual(s.groups.map((g) => g.chapter), ["Warm-ups", "Reference"]);
  assert.deepEqual(s.groups[0].fronts, ["mmmmmmm", "mmm… hello, how are you?"]);
});

test("a card said twice counts once, and one chapter isn't announced", () => {
  const s = daySlip([{ front: "Hum", chapter: "Warm-ups" }, { front: "Hum", chapter: "Warm-ups" }]);
  assert.equal(s.lede, "You said one card out loud today.");
  assert.deepEqual(s.groups[0].fronts, ["Hum"]);
});

test("an empty day is described kindly, never as missed", () => {
  assert.equal(daySlip([]).lede, "Nothing said yet today, and that's fine.");
  assert.doesNotMatch(daySlip([]).lede, /miss|fail|only/i);
});

test("long cards are cut at a word, short ones stay whole", () => {
  assert.equal(shortFront("One, two, three, four, five, six, seven, eight, nine, ten."), "One, two, three, four, five, six…");
  assert.equal(shortFront("  Hello   there "), "Hello there");
  assert.equal(shortFront("x".repeat(50)).length, 34);
});
