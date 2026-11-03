// node --test src/flashcards.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { TextLevel } from "./api";
import { chapterCards, EMPTY, pile, progress, swipe } from "./flashcards.ts";

const level = (over: Partial<TextLevel> = {}): TextLevel => ({
  id: "pitch", level: 3, title: "Pitch", subtitle: "", kind: "hum", source_url: null, written_by: "",
  basis: "Pitch is how high or low your voice sounds.\n\n**Find where you are.** Record a sentence.\n\n**Be gentle.** Stop if it strains.\n\n**On track when** it feels easy.",
  items: [{ id: "mm-hm", text: "mm-hm!", hint: "Agree." }, { id: "glide", text: "mmm ↗ ↘", hint: "Slide." }],
  ...over,
});

test("a chapter is dealt as its opening, each step, then each text", () => {
  const cards = chapterCards(level());
  assert.deepEqual(cards.map((c) => c.kind), ["lede", "step", "step", "step", "text", "text"]);
  assert.deepEqual(cards.map((c) => c.id), ["pitch:intro", "pitch:step-0", "pitch:step-1", "pitch:step-2", "pitch:text-mm-hm", "pitch:text-glide"]);
  const steps = cards.filter((c) => c.kind === "step");
  // voice care isn't counted as a step; "On track when" reads as signs it's working
  assert.deepEqual(steps.map((s) => [s.label, s.care, s.n, s.of]), [["Find where you are", false, 1, 2], ["Be gentle", true, 1, 2], ["Signs it's working", false, 2, 2]]);
});

test("an intro that isn't written as steps is one card, and a video gets its own", () => {
  const cards = chapterCards(level({ basis: "NHS Fife: just one paragraph.\n\n- and a list", video: { id: "x", title: "Watch", by: "Someone" } }));
  assert.deepEqual(cards.map((c) => c.kind), ["lede", "video", "text", "text"]);
  assert.equal(cards[0].kind === "lede" && cards[0].markdown, "Just one paragraph.\n\n- and a list");
});

test("right takes the top card out of the run; left sends it to the back", () => {
  const cards = chapterCards(level({ basis: "Opening." }));
  const ids = (r: typeof EMPTY) => pile(cards, r).map((c) => c.id);
  assert.deepEqual(ids(EMPTY), ["pitch:intro", "pitch:text-mm-hm", "pitch:text-glide"]);
  let run = swipe(cards, EMPTY, "again");
  assert.deepEqual(ids(run), ["pitch:text-mm-hm", "pitch:text-glide", "pitch:intro"]);
  run = swipe(cards, run, "got");
  assert.deepEqual(ids(run), ["pitch:text-glide", "pitch:intro"]);
  assert.deepEqual(progress(cards, run), { got: 1, total: 3 });
  run = swipe(cards, swipe(cards, run, "got"), "got");
  assert.deepEqual(ids(run), []);
  assert.deepEqual(swipe(cards, run, "got"), run);
});

test("a run follows the chapter as it changes", () => {
  const before = chapterCards(level({ basis: "Opening." }));
  const run = swipe(before, swipe(before, EMPTY, "again"), "got");
  // glide was removed and a new text added: the run keeps its order, drops glide, and deals the new one last
  const after = chapterCards(level({ basis: "Opening.", items: [{ id: "mm-hm", text: "mm-hm!", hint: "" }, { id: "hum", text: "mmm", hint: "" }] }));
  assert.deepEqual(pile(after, run).map((c) => c.id), ["pitch:intro", "pitch:text-hum"]);
  assert.deepEqual(swipe(after, { got: ["pitch:text-gone"], order: [] }, "got").got, ["pitch:intro"]);
});
