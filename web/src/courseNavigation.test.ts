import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPath, flashcardsPath, practicePath, rememberCourse, routeCourse, routeSegments, savedCourse } from "./courseNavigation.ts";

test("voice keeps its links while any other course gets scoped practice links", () => {
  assert.equal(practicePath("voice", "warmup", "hum"), "/studio/warmup/hum");
  assert.equal(dailyPath("voice"), "/deck");
  assert.equal(flashcardsPath("voice", "warmup"), "/flashcards/warmup");
  assert.equal(practicePath("drawing", "warmup", "lines"), "/learn/drawing/chapter/warmup/lines");
  assert.equal(dailyPath("drawing", "drawing/text.warmup.lines"), "/learn/drawing/today?card=drawing%2Ftext.warmup.lines");
  assert.equal(flashcardsPath("drawing", "warmup"), "/flashcards/warmup?course=drawing");
});

test("explicit routes select their course, and unrelated routes keep the saved choice", () => {
  const empty = new URLSearchParams();
  assert.equal(routeCourse("/learn/drawing/today", empty), "drawing");
  assert.equal(routeCourse("/flashcards/warmup", new URLSearchParams("course=drawing")), "drawing");
  assert.equal(routeCourse("/flashcards", empty), "voice");
  assert.equal(routeCourse("/studio/warmup", empty), "voice");
  assert.equal(routeCourse("/", empty), null);
  assert.equal(routeCourse("/courses/drawing", empty), null);
  assert.equal(routeCourse("/learn/missing", empty), "missing");
});

test("chapter and text links round trip spaces and non-ASCII IDs", () => {
  const path = practicePath("reading", "lesson one", "你好");
  assert.deepEqual(routeSegments(path), ["learn", "reading", "chapter", "lesson one", "你好"]);
  assert.deepEqual(routeSegments(flashcardsPath("voice", "lesson one")), ["flashcards", "lesson one"]);
  assert.deepEqual(routeSegments("/learn/reading/chapter/%broken"), ["learn", "reading", "chapter", "%broken"]);
});

test("all server-valid course IDs can be remembered, and malformed saved values fall back", t => {
  let stored: string | null = null;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage"); });
  rememberCourse("-reading");
  assert.equal(savedCourse(), "-reading");
  stored = "../reading";
  assert.equal(savedCourse(), "voice");
});
