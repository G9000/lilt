// node --test src/chapters.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { byPart, passageTitle, readingTime, sameLabel, textLabel } from "./chapters.ts";

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

test("a long passage is named by its title, with its parts numbered", () => {
  const long = "word ".repeat(140).trim();
  assert.equal(textLabel(long, "night-bus-2"), "Night bus, part 2");
  assert.equal(textLabel(long, "sky-blue"), "Sky blue");
  assert.equal(passageTitle("lemon-cake"), "Lemon cake");
  assert.equal(readingTime(long), "about 1 min");
  assert.equal(readingTime("word ".repeat(300)), "about 2 min");
  assert.equal(textLabel("One, two, three, four, five.", "count-5"), "One, two, three, four, five.", "short texts keep their words");
});

test("a card's tag that repeats its chapter's name counts as the same", () => {
  assert.equal(sameLabel("Warm-ups", "Warm-up"), true);
  assert.equal(sameLabel("Cool-down", "Cool down"), true);
  assert.equal(sameLabel("Warm-ups", "New card"), false);
  assert.equal(sameLabel("Pitch", "Before and after"), false);
});
