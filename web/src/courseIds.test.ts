// node --test src/courseIds.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTextId, textId } from "./courseIds.ts";

test("the Practice course keeps its ids; other courses name themselves", () => {
  assert.equal(textId("voice", "warmup", "hum"), "text.warmup.hum");
  assert.equal(textId("mandarin", "greetings", "nihao"), "mandarin/text.greetings.nihao");
  assert.deepEqual(parseTextId("text.warmup.hum"), { course: "voice", chapter: "warmup", text: "hum" });
  assert.deepEqual(parseTextId("mandarin/text.greetings.nihao"), { course: "mandarin", chapter: "greetings", text: "nihao" });
  assert.equal(parseTextId("ref.count-1-10"), null);
  assert.equal(parseTextId("free"), null);
});
