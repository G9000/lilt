// Real Chrome Web Locks + MediaRecorder, fake microphone, stubbed API, isolated browser storage.
// Start Vite first, then: node --test e2e/recording-lock.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:5173";
let browser;
before(async () => {
  browser = await chromium.launch({ channel: "chrome", headless: true, ignoreDefaultArgs: ["--headless=old"], args: ["--headless=new",
    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required",
  ] });
});
after(async () => { await browser?.close(); });

async function fixture(t, { fallback = false } = {}) {
  const ctx = await browser.newContext({ permissions: ["microphone"] });
  const errors = [];
  t.after(async () => { await ctx.close(); assert.deepEqual(errors, [], "no unhandled page errors"); });
  const open = async () => {
    const page = await ctx.newPage();
    const api = { creates: 0, failCreation: false, creationGate: null, generation: 'original-data', requireGeneration: false, writes: [] };
    page.on("pageerror", (e) => errors.push(e.message));
    if (fallback) await page.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
    await page.route("**/__recording_test", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Recording lock test</title>" }));
    await page.route("**/healthz", route => route.fulfill({ headers: { 'X-Lilt-Generation': api.generation }, json: { ok: true } }));
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const headers = { 'X-Lilt-Generation': api.generation };
      if (req.method() !== 'GET') {
        api.writes.push({ path: new URL(req.url()).pathname, generation: req.headers()['x-lilt-generation'] });
        if (api.requireGeneration && req.headers()['x-lilt-generation'] !== api.generation) return route.fulfill({ status: 409, headers, json: { error: 'Reload Lilt before making changes.' } });
      }
      if (new URL(req.url()).pathname === "/api/takes") {
        api.creates++;
        if (api.creationGate) await api.creationGate;
        if (api.failCreation) return route.fulfill({ status: 422, json: { error: "Take creation refused for this test." } });
      }
      return route.fulfill({ headers, json: { id: "test-take", status: "saved" } });
    });
    await page.goto(`${BASE}/__recording_test`);
    await page.evaluate(async () => {
      const { openMic, TakeRecorder } = await import("/src/recorder.ts");
      window.TakeRecorder = TakeRecorder;
      window.stream = await openMic();
      window.rec = new TakeRecorder(window.stream, () => {});
      window.meta = { session_id: "test-session", role: "exercise", prompt_id: "test", prompt_text: "Testing" };
      window.captureStarts = 0;
      const nativeStart = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (...args) { window.captureStarts++; return nativeStart.apply(this, args); };
    });
    return { page, api };
  };
  return { open };
}

const start = (page) => page.evaluate(() => window.rec.start(window.meta));
const stop = (page) => page.evaluate(() => window.rec.stop());
const denied = (page) => page.evaluate(() => window.rec.start(window.meta).then(() => null, (e) => e.message));
async function unlocked(page) {
  for (let i = 0; i < 100; i++) {
    const held = await page.evaluate(async () => (await navigator.locks.query()).held.some((l) => l.name === "lilt-recording"));
    if (!held) return;
    await page.waitForTimeout(50);
  }
  throw new Error("Recording lock wasn't released within five seconds.");
}

test("competing tabs cannot create takes; the stop tail remains locked, then another tab can record", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  await start(a.page);
  assert.match(await denied(b.page), /already recording/);
  assert.equal(b.api.creates, 0, "denial happens before the take API is called");
  await a.page.evaluate(() => { window.stopping = window.rec.stop(); });
  assert.match(await denied(b.page), /already recording/, "lock stays through the 800 ms audio tail");
  await a.page.evaluate(() => window.stopping);
  await start(b.page);
  await stop(b.page);
});

test("double starts and separate recorders in one page are rejected without unlocking the take", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  const message = await a.page.evaluate(async () => {
    const first = window.rec.start(window.meta);
    const second = await window.rec.start(window.meta).then(() => null, (e) => e.message);
    await first;
    return second;
  });
  assert.match(message, /already recording or saving/);
  assert.match(await a.page.evaluate(() => new window.TakeRecorder(window.stream, () => {}).start(window.meta).then(() => null, (e) => e.message)), /already recording/);
  assert.match(await denied(b.page), /already recording/);
  assert.equal(a.api.creates, 1);
  await stop(a.page);
  await start(b.page);
  await stop(b.page);
});

test("closing a recording tab releases the browser lock", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  await start(a.page);
  await a.page.close();
  await unlocked(b.page);
  await start(b.page);
  await stop(b.page);
});

for (const failure of ["constructor", "start"]) {
  test(`a MediaRecorder ${failure} failure releases the lock and radio claim`, async (t) => {
    const { open } = await fixture(t);
    const a = await open(), b = await open();
    await a.page.evaluate((failure) => {
      const Native = window.MediaRecorder;
      if (failure === "constructor") window.MediaRecorder = class extends Native { constructor() { throw new Error("Test constructor failure"); } };
      else Native.prototype.start = () => { throw new Error("Test start failure"); };
    }, failure);
    await assert.rejects(start(a.page), failure === "start" ? /Test start failure.*empty take remains in Recordings/ : /Test constructor failure/);
    const error = await a.page.evaluate(() => window.rec.error);
    if (failure === "start") assert.match(error, /empty take remains in Recordings/);
    else assert.doesNotMatch(error, /empty take/);
    assert.equal(await a.page.evaluate(async () => (await import("/src/micuse.ts")).micInUse()), false);
    await start(b.page);
    await stop(b.page);
  });
}

test("server refusing take creation never starts capture and releases the lock", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  a.api.failCreation = true;
  await assert.rejects(start(a.page), /Take creation refused/);
  await a.page.waitForFunction(() => window.rec.state === "error");
  assert.equal(await a.page.evaluate(() => window.captureStarts), 0);
  assert.doesNotMatch(await a.page.evaluate(() => window.rec.error), /empty take/);
  await unlocked(a.page);
  await start(b.page);
  await stop(b.page);
});

test("capture waits for delayed server admission while keeping the browser lock", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  let admit;
  a.api.creationGate = new Promise((resolve) => { admit = resolve; });
  await a.page.evaluate(() => { window.startingTake = window.rec.start(window.meta); });
  for (let i = 0; i < 100 && a.api.creates === 0; i++) await a.page.waitForTimeout(10);
  assert.equal(a.api.creates, 1);
  assert.equal(await a.page.evaluate(() => window.captureStarts), 0, "no audio capture before admission");
  assert.match(await denied(b.page), /already recording/);
  admit();
  await a.page.evaluate(() => window.startingTake);
  assert.equal(await a.page.evaluate(() => window.captureStarts), 1);
  await stop(a.page);
});

test("cancelling capture releases the lock", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  await start(a.page);
  await a.page.evaluate(() => window.rec.cancelTracks());
  await unlocked(a.page);
  await start(b.page);
  await stop(b.page);
});

test("native recorder errors release the lock without leaving the radio paused", async (t) => {
  const { open } = await fixture(t);
  const a = await open(), b = await open();
  await a.page.evaluate(() => {
    const Native = window.MediaRecorder;
    window.MediaRecorder = class extends Native { constructor(...args) { super(...args); window.nativeRecorder = this; } };
  });
  await start(a.page);
  await a.page.evaluate(() => window.nativeRecorder.dispatchEvent(new Event("error")));
  await unlocked(a.page);
  assert.equal(await a.page.evaluate(async () => (await import("/src/micuse.ts")).micInUse()), false);
  await start(b.page);
  await stop(b.page);
});

test("without Web Locks, separate recorders in the same page are still excluded", async (t) => {
  const { open } = await fixture(t, { fallback: true });
  const a = await open();
  await start(a.page);
  assert.match(await a.page.evaluate(() => new window.TakeRecorder(window.stream, () => {}).start(window.meta).then(() => null, (e) => e.message)), /already recording/);
  await stop(a.page);
  await a.page.evaluate(() => { window.rec = new window.TakeRecorder(window.stream, () => {}); });
  await start(a.page);
  await stop(a.page);
});

test("a recording persists its original data identity through chunks and finalization", async t => {
  const { open } = await fixture(t); const { page, api } = await open();
  await start(page);
  const pending = await page.evaluate(() => new Promise(resolve => {
    const req = indexedDB.open('lilt-capture', 1);
    req.onsuccess = () => { const db = req.result; const read = db.transaction('takes').objectStore('takes').getAll(); read.onsuccess = () => { resolve(read.result); db.close(); }; };
  }));
  assert.equal(pending[0].generation, 'original-data');
  await stop(page);
  assert.ok(api.writes.some(x => x.path.includes('/chunks/')));
  assert.ok(api.writes.every(x => x.generation === 'original-data'));
});

test("recovery never relabels old or legacy buffered audio after a restore", async t => {
  const { open } = await fixture(t); const { page, api } = await open();
  api.generation = 'restored-data'; api.requireGeneration = true;
  const result = await page.evaluate(async () => {
    const { dataClient } = await import('/src/dataGeneration.ts');
    await dataClient.fetch('/healthz');
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('lilt-capture', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('takes', { keyPath: 'take_id' }); req.result.createObjectStore('chunks', { keyPath: ['take_id', 'seq'] }); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction(['takes', 'chunks'], 'readwrite');
        for (const take of [{ take_id: 'old', generation: 'original-data' }, { take_id: 'legacy' }]) {
          tx.objectStore('takes').put({ ...take, produced: 1, stopped: true });
          tx.objectStore('chunks').put({ take_id: take.take_id, seq: 0, blob: new Blob(['retained audio']) });
        }
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
    const recovered = await (await import('/src/recorder.ts')).recoverPending();
    const remaining = await new Promise(resolve => {
      const req = indexedDB.open('lilt-capture', 1);
      req.onsuccess = () => { const db = req.result; const read = db.transaction('chunks').objectStore('chunks').count(); read.onsuccess = () => { resolve(read.result); db.close(); }; };
    });
    return { recovered, remaining };
  });
  assert.deepEqual(result, { recovered: 0, remaining: 2 });
  assert.equal(api.writes.find(x => x.path.includes('/old/')).generation, 'original-data');
  assert.equal(api.writes.find(x => x.path.includes('/legacy/')).generation, undefined);
  assert.equal(api.writes.some(x => x.path.endsWith('/finalize')), false);
});
