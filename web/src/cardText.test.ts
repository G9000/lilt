// node --test src/cardText.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardHint, friendlyDate } from "./cardText.ts";

test("a card's hint drops the chapter's check-in label", () => {
  assert.equal(cardHint("Your check-in: lips together, teeth apart."), "Lips together, teeth apart.");
  assert.equal(cardHint("Hum, then open into the greeting."), "Hum, then open into the greeting.");
});

test("when cards come back reads as words, never a date", () => {
  assert.equal(friendlyDate("2026-11-08", "2026-11-08"), "later today");
  assert.equal(friendlyDate("2026-11-09", "2026-11-08"), "tomorrow");
  assert.equal(friendlyDate("2026-11-12", "2026-11-08"), "in 4 days");
  assert.equal(friendlyDate("2026-03-30", "2026-03-28"), "in 2 days", "a clock change doesn't shift the count");
});
