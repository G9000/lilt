// node --test src/checkIn.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { apartWords, daysApart, lastNote, takesOf, thenAndNow, type TakeLike } from "./checkIn.ts";

const take = (id: string, utc: string, extra: Partial<TakeLike> = {}): TakeLike => ({
  id, prompt_id: "text.start-here.today", created_utc: utc, audio_url: `/a/${id}`, status: "review_ready", note: null, ...extra,
});

test("takes of one text come once each, playable, oldest first", () => {
  const saved = [take("b", "2026-11-05T09:00:00Z"), take("a", "2026-11-01T09:00:00Z")];
  const session = [
    take("b", "2026-11-05T09:00:00Z", { note: "edited today" }),
    take("c", "2026-11-08T09:00:00Z", { status: "recording" }),
    take("d", "2026-11-08T09:00:00Z", { prompt_id: "text.warmup.hum" }),
    take("e", "2026-11-08T10:00:00Z", { audio_url: null }),
  ];
  const ts = takesOf("text.start-here.today", saved, session);
  assert.deepEqual(ts.map((t) => t.id), ["a", "b"]);
  assert.equal(ts[1].note, "edited today", "the later copy of a take wins");
});

test("then and now waits for a second day", () => {
  assert.equal(thenAndNow([]), null);
  assert.equal(thenAndNow([take("a", "2026-11-01T09:00:00Z")]), null);
  assert.equal(thenAndNow([take("a", "2026-11-01T09:00:00Z"), take("b", "2026-11-01T21:00:00Z")]), null);
  const pair = thenAndNow([take("a", "2026-11-01T09:00:00Z"), take("b", "2026-11-03T09:00:00Z"), take("c", "2026-11-13T09:00:00Z")]);
  assert.deepEqual([pair?.first.id, pair?.latest.id, pair?.days], ["a", "c", 12]);
});

test("the day is where you recorded it, not UTC", () => {
  const late = take("b", "2026-11-02T03:00:00Z", { local_date: "2026-11-01" });
  assert.equal(thenAndNow([take("a", "2026-11-01T09:00:00Z"), late]), null);
  assert.equal(daysApart("2026-03-28", "2026-03-30"), 2, "a clock change doesn't shift the count");
  assert.equal(apartWords(1), "a day apart");
  assert.equal(apartWords(12), "12 days apart");
});

test("the newest note is the one that comes back, blank ones skipped", () => {
  const ts = [
    take("a", "2026-11-01T09:00:00Z", { note: "easy start" }),
    take("b", "2026-11-03T09:00:00Z", { note: "  don't push  " }),
    take("c", "2026-11-05T09:00:00Z", { note: "   " }),
  ];
  assert.deepEqual(lastNote(ts), { id: "b", text: "don't push", day: "2026-11-03" });
  assert.deepEqual(lastNote(ts, "b"), { id: "a", text: "easy start", day: "2026-11-01" });
  assert.equal(lastNote([take("a", "2026-11-01T09:00:00Z")]), null);
});
