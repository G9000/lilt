import test from "node:test";
import assert from "node:assert/strict";
import { clearLiltStorage, clearResetBrowserData, RESET_MARKER_KEY, RESET_PENDING_KEY } from "./resetBrowserData.ts";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

test("clears every Lilt preference and session while preserving unrelated storage and reset metadata", () => {
  const saved = storage({ "lilt.theme": "dark", "lilt.spotify.tokens": "secret", "lilt.step.take": "done", "lilt.flashcards.v1.course.language": "progress", unrelated: "keep", "liltish": "keep", [RESET_MARKER_KEY]: "old", [RESET_PENDING_KEY]: "new" });
  clearLiltStorage(saved);
  assert.equal(saved.length, 4);
  assert.equal(saved.getItem("unrelated"), "keep");
  assert.equal(saved.getItem(RESET_MARKER_KEY), "old");
});

test("acknowledges reset only after capture and monitor storage are removed", async () => {
  const local = storage({ "lilt.theme": "dark" }), session = storage({ "lilt.step.take": "done" });
  const removed: string[] = [];
  await clearResetBrowserData("reset-1", { local, session, deleteCapture: async () => { removed.push("capture"); }, deleteMonitorMedia: async () => { removed.push("media"); } });
  assert.deepEqual(removed.sort(), ["capture", "media"]);
  assert.equal(local.getItem("lilt.theme"), null);
  assert.equal(session.getItem("lilt.step.take"), null);
  assert.equal(local.getItem(RESET_MARKER_KEY), "reset-1");
  assert.equal(session.getItem(RESET_MARKER_KEY), "reset-1");
});

test("cleanup failure is retryable without acknowledging it or repeating server reset", async () => {
  const local = storage(), session = storage();
  let attempts = 0;
  const stores = { local, session, deleteCapture: async () => { if (++attempts === 1) throw new Error("blocked"); }, deleteMonitorMedia: async () => {} };
  await assert.rejects(clearResetBrowserData("reset-2", stores), /blocked/);
  assert.equal(local.getItem(RESET_MARKER_KEY), null);
  await clearResetBrowserData("reset-2", stores);
  assert.equal(local.getItem(RESET_MARKER_KEY), "reset-2");
});

test("another tab clears its own session without deleting newly saved shared data again", async () => {
  const local = storage({ [RESET_MARKER_KEY]: "reset-3", "lilt.theme": "light" });
  const session = storage({ [RESET_MARKER_KEY]: "older", "lilt.step.old": "done" });
  await clearResetBrowserData("reset-3", { local, session, deleteCapture: async () => { assert.fail("already cleared"); }, deleteMonitorMedia: async () => { assert.fail("already cleared"); } });
  assert.equal(local.getItem("lilt.theme"), "light");
  assert.equal(session.getItem("lilt.step.old"), null);
});
