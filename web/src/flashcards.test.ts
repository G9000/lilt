// node --test src/flashcards.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { TextLevel } from "./api";
import { chapterCards, EMPTY, loadRuns, pile, progress, saveRun, swipe } from "./flashcards.ts";

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

function withSaved(raw: string | null, check: (stored: () => string | null) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => raw,
    setItem: (_key: string, value: string) => { raw = value; },
  } });
  try { check(() => raw); }
  finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("broken saved containers start with an empty run", () => {
  for (const raw of [null, "{", "null", "[]", "42", '{"runs":[]}', '{"runs":"broken"}', '{"runs":true}']) {
    withSaved(raw, () => {
      assert.deepEqual(Object.keys(loadRuns().runs), [], raw ?? "missing");
      assert.doesNotThrow(() => saveRun("pitch", EMPTY));
    });
  }
});

test("a broken chapter does not lose the other chapters' progress", () => {
  const good = { got: ["pitch:intro"], order: ["pitch:text-glide"] };
  withSaved(JSON.stringify({ last: "pitch", runs: { pitch: good, broken: { got: null, order: 3 }, missing: {}, array: [] } }), () => {
    const saved = loadRuns();
    assert.deepEqual(saved.runs.pitch, good);
    for (const chapter of ["broken", "missing", "array"]) {
      assert.doesNotThrow(() => pile(chapterCards(level()), saved.runs[chapter] ?? EMPTY));
    }
    assert.equal(saved.last, "pitch");
  });
});

test("saved card lists keep valid unique ids in order", () => {
  withSaved(JSON.stringify({ runs: { pitch: {
    got: ["pitch:intro", null, "pitch:intro", 3, ""],
    order: ["pitch:text-glide", "pitch:text-glide", {}, "pitch:text-mm-hm", false],
  } } }), () => {
    const saved = loadRuns();
    assert.deepEqual(saved.runs.pitch, {
      got: ["pitch:intro"], order: ["pitch:text-glide", "pitch:text-mm-hm"],
    });
    assert.deepEqual(pile(chapterCards(level({ basis: "Opening." })), saved.runs.pitch).map(c => c.id),
      ["pitch:text-glide", "pitch:text-mm-hm"]);
  });
});

test("only a chapter id can be remembered as the last chapter", () => {
  for (const last of [42, true, {}, [], ""]) {
    withSaved(JSON.stringify({ last, runs: {} }), () => assert.equal(loadRuns().last, undefined));
  }
});

test("a damaged card list keeps the usable part of that chapter", () => {
  withSaved(JSON.stringify({ runs: {
    pitch: { got: ["pitch:intro"], order: null },
    breath: { got: "broken", order: ["breath:intro"] },
  } }), () => {
    assert.deepEqual(loadRuns().runs.pitch, { got: ["pitch:intro"], order: [] });
    assert.deepEqual(loadRuns().runs.breath, { got: [], order: ["breath:intro"] });
  });
});

test("chapter ids cannot pick up inherited object properties", () => {
  withSaved(null, () => {
    for (const chapter of ["constructor", "toString", "__proto__"]) {
      assert.equal(loadRuns().runs[chapter], undefined);
      saveRun(chapter, { got: [`${chapter}:intro`], order: [] });
      assert.deepEqual(loadRuns().runs[chapter], { got: [`${chapter}:intro`], order: [] });
    }
  });
});

test("saving a run preserves the other chapters and remembers the last chapter", () => {
  const other = { got: ["breath:intro"], order: [] };
  withSaved(JSON.stringify({ last: "breath", runs: { breath: other } }), stored => {
    saveRun("pitch", { got: [], order: ["pitch:text-glide"] });
    assert.deepEqual(JSON.parse(stored()!), {
      last: "pitch", runs: { breath: other, pitch: { got: [], order: ["pitch:text-glide"] } },
    });
  });
});

test("unavailable browser storage does not interrupt a run", () => {
  withSaved(null, () => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Storage unavailable"); } });
    assert.deepEqual(Object.keys(loadRuns().runs), []);
    assert.doesNotThrow(() => saveRun("pitch", EMPTY));
  });
});

test("courses keep separate chapter runs while voice retains its original storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  const voice = { got: ["pitch:intro"], order: [] };
  values.set("lilt.flashcards.v1", JSON.stringify({ last: "pitch", runs: { pitch: voice } }));
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    assert.deepEqual(loadRuns("voice").runs.pitch, voice);
    assert.equal(loadRuns("spanish").last, undefined);
    saveRun("pitch", { got: [], order: ["pitch:intro"] }, "spanish");
    saveRun("pitch", { got: ["pitch:text-glide"], order: [] }, "music");
    assert.deepEqual(loadRuns().runs.pitch, voice);
    assert.deepEqual(loadRuns("spanish").runs.pitch, { got: [], order: ["pitch:intro"] });
    assert.deepEqual(loadRuns("music").runs.pitch, { got: ["pitch:text-glide"], order: [] });
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("generic cards preserve the course's introduction without voice care rewriting", () => {
  const chapter = level({ basis: "Read this.\n\n**Careful reading.** Find the subject.\n\n**On track when** you can explain it." });
  const cards = chapterCards(chapter, "reading");
  assert.deepEqual(cards.map(card => card.kind), ["lede", "text", "text"]);
  assert.equal(cards[0].kind === "lede" && cards[0].markdown, chapter.basis);
});
