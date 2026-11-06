import { test } from "node:test";
import assert from "node:assert/strict";
import { storageSize, folderResult } from "./storage.ts";

test("storage sizes stay readable from empty folders through large recordings", () => {
  assert.equal(storageSize(0), "0 B");
  assert.equal(storageSize(24), "24 B");
  assert.equal(storageSize(1024), "1 KB");
  assert.equal(storageSize(1536), "1.5 KB");
  assert.equal(storageSize(20 * 1024 ** 2), "20 MB");
  assert.equal(storageSize(2.75 * 1024 ** 3), "2.8 GB");
  assert.equal(storageSize(1024 ** 4), "1 TB");
});

test("unknown sizes never look like an empty folder", () => {
  for (const bytes of [-1, NaN, Infinity]) assert.equal(storageSize(bytes), "Unavailable");
});

test("native folder outcomes accept only explicit success or a plain error", () => {
  assert.deepEqual(folderResult({ error: null }), { error: null });
  assert.deepEqual(folderResult({ error: "Couldn't open it." }), { error: "Couldn't open it." });
  for (const value of [undefined, null, true, {}, { error: false }, { error: 123 }]) assert.equal(folderResult(value), null);
});
