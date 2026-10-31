// node --test src/chapters.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { byPart, textLabel } from "./chapters.ts";

test("a vocalise is named by its id", () => {
  assert.equal(textLabel("mmmmmmm", "forward-hum"), "Forward hum");
  assert.equal(textLabel("mmm ↗ ↘", "glide"), "Glide");
  assert.equal(textLabel("mmmee · mmmaa · mmmoo", "m-vowels"), "M vowels");
  assert.equal(textLabel("brrrrrrr", "lip-trill"), "Lip trill");
  assert.equal(textLabel("nnnnggg", "ng"), "nnnnggg");
  assert.equal(textLabel("zzzzzz · vvvvvv", "zzz"), "Zzz");
  assert.equal(textLabel("A, B, C, D, E, F", "alphabet"), "Alphabet");
});

test("words stay as they are", () => {
  assert.equal(textLabel("mmm… hello, how are you?", "hum-to-hello"), "mmm… hello, how are you?");
  assert.equal(textLabel("eye · air · ear", "giggle"), "eye · air · ear");
  assert.equal(textLabel("One, two, three, four, five.", "count-5"), "One, two, three, four, five.");
  assert.equal(textLabel("Où est la gare ?", "gare"), "Où est la gare ?");
});

test("a short id falls back to the text", () => {
  assert.equal(textLabel("eeeeee", "ee"), "eeeeee");
  assert.equal(textLabel("oooooo", "oo"), "oooooo");
});

test("chapters group in runs of the same part", () => {
  const g = byPart([{ id: "a", part: "Get ready" }, { id: "b", part: "Get ready" }, { id: "c", part: "The skills" }, { id: "d" }]);
  assert.deepEqual(g.map((x) => [x.part, x.levels.map((l) => l.id)]), [["Get ready", ["a", "b"]], ["The skills", ["c"]], [null, ["d"]]]);
  assert.deepEqual(byPart([{ id: "a" }, { id: "b", part: " " }]).map((x) => x.part), [null]);
});
