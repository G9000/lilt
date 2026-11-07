import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';

const server = await createIsolatedVite({ logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (localStorage.getItem('lilt.test.hold-monitor') === '1') {
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      window.releaseMonitor = release;
      const match = Cache.prototype.match;
      Cache.prototype.match = async function (...args) {
        if (String(args[0]).includes('/__lilt_monitor_media__/')) { window.monitorRead = true; await gate; }
        return match.apply(this, args);
      };
    }
    if (localStorage.getItem('lilt.test.seeded')) return;
    localStorage.setItem('lilt.test.seeded', '1');
    localStorage.setItem('lilt.room.plant', 'fern');
    localStorage.setItem('lilt.room.chair', 'sage');
    localStorage.setItem('lilt.room.player', 'radio');
    localStorage.setItem('lilt.room.tea', JSON.stringify({ mug: 'cat', minutes: 5, endsAt: null }));
    localStorage.setItem('lilt.room.appearance', JSON.stringify({ light: 'day', mainDecor: 'stars' }));
  });
  const page = await context.newPage();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let requested;
  const request = new Promise(resolve => { requested = resolve; });
  await page.route('**/room/plants/fern.png', async route => { requested(); await held; await route.continue(); });
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/room-readiness.html`, { waitUntil: 'domcontentloaded' });
  await request;
  await page.waitForFunction(() => [...document.querySelectorAll('.room-art')].every(image => image.complete && image.naturalWidth));
  assert.equal(await page.locator('.room-paint').evaluate(el => getComputedStyle(el).visibility), 'hidden', 'base painting must not show while saved plant is pending');
  release();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-paint')).visibility === 'visible');
  assert.equal(await page.locator('.room-plant-art').getAttribute('data-plant'), 'fern');
  assert.equal(await page.locator('.room-chair-art').getAttribute('data-chair'), 'sage');
  assert.equal(await page.locator('.room-player-art').getAttribute('data-player'), 'radio');
  assert.equal(await page.locator('.room-mug-art').getAttribute('data-mug'), 'cat');
  await page.unroute('**/room/plants/fern.png');
  const visible = () => page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  // Every bundle can be last, including repairs and monitor presets.
  for (const asset of ['mugs/cat.png', 'players/radio.png', 'chair/sage.png', 'props/coffee-latte.png', 'props/camera-black.png', 'plants/clear-night.png', 'room-day-v3.webp', '../pictures/nebula-cliffs.webp']) {
    const suffix = asset.startsWith('../') ? asset.slice(3) : `room/${asset}`;
    let unblock, seen;
    const gate = new Promise(resolve => { unblock = resolve; });
    const requested = new Promise(resolve => { seen = resolve; });
    const pattern = `**/${suffix}`;
    await page.route(pattern, async route => { seen(); await gate; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await requested;
    await page.waitForFunction(() => !!document.querySelector('.room-paint'));
    assert.equal(await page.locator('.room-paint').evaluate(el => getComputedStyle(el).visibility), 'hidden', `${asset} holds first reveal`);
    unblock();
    await visible();
    await page.unroute(pattern);
  }
  // Cached images can still be decoding on a new mounted room.
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    window.releaseDecode = release;
    HTMLImageElement.prototype.decode = function () {
      return this.src.endsWith('/room/plants/fern.png') ? gate.then(() => decode.call(this)) : decode.call(this);
    };
    window.remountRoom();
  });
  await page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'false');
  assert.equal(await page.locator('.room-plant-art').count(), 0);
  await page.evaluate(() => window.remountRoom());
  await page.evaluate(() => window.releaseDecode());
  await visible();
  assert.equal(await page.locator('.room-plant-art').getAttribute('data-plant'), 'fern');
  // A genuine failed asset reveals the original fallback and keeps retry available.
  await page.route('**/room/plants/fern.png', route => route.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await visible();
  assert.equal(await page.locator('.room-plant-art').count(), 0);
  await page.getByRole('button', { name: /Choose your plant/ }).click();
  await page.getByText("Couldn't load this plant.", { exact: false }).waitFor();
  await page.unroute('**/room/plants/fern.png');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  assert.equal(await page.locator('.room-paint').getAttribute('data-ready'), 'true', 'retry never hides the revealed room');
  await page.waitForFunction(() => document.querySelector('.room-plant-art')?.dataset.plant === 'fern');
  await page.keyboard.press('Escape');
  // A later choice stays visible and a late old request cannot replace the newer choice.
  let unblock;
  const gate = new Promise(resolve => { unblock = resolve; });
  await page.route('**/room/plants/monstera.png', async route => { await gate; await route.continue(); });
  await page.evaluate(() => {
    localStorage.setItem('lilt.room.plant', 'monstera');
    dispatchEvent(new StorageEvent('storage', { key: 'lilt.room.plant' }));
  });
  assert.equal(await page.locator('.room-paint').getAttribute('data-ready'), 'true');
  assert.equal(await page.locator('.room-plant-art').getAttribute('data-plant'), 'fern');
  await page.evaluate(() => {
    localStorage.setItem('lilt.room.plant', 'succulent');
    dispatchEvent(new StorageEvent('storage', { key: 'lilt.room.plant' }));
  });
  await page.waitForFunction(() => document.querySelector('.room-plant-art')?.dataset.plant === 'succulent');
  const oldResponse = page.waitForResponse('**/room/plants/monstera.png');
  unblock();
  await oldResponse;
  await page.evaluate(async () => { const image = new Image(); image.src = 'room/plants/monstera.png'; await image.decode(); });
  await page.unroute('**/room/plants/monstera.png');
  assert.equal(await page.locator('.room-plant-art').getAttribute('data-plant'), 'succulent');
  // Custom monitor content also waits for browser storage and a decoded poster.
  const mediaId = await page.evaluate(async () => {
    const { saveMonitorFile } = await import('/src/room/monitor-media.ts');
    const blob = await (await fetch('pictures/plant-fern.webp')).blob();
    const id = await saveMonitorFile({ file: blob, poster: blob, kind: 'picture', name: 'Test picture' });
    const prefs = JSON.parse(localStorage.getItem('lilt.room.appearance'));
    localStorage.setItem('lilt.room.appearance', JSON.stringify({ ...prefs, mainDecor: 'custom', mainMedia: { id, kind: 'picture', name: 'Test picture', paused: false } }));
    localStorage.setItem('lilt.test.hold-monitor', '1');
    return id;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.monitorRead && [...document.querySelectorAll('.room-art')].every(image => image.complete && image.naturalWidth));
  assert.equal(await page.locator('.room-paint').getAttribute('data-ready'), 'false', 'custom monitor storage read holds first reveal');
  await page.evaluate(() => window.releaseMonitor());
  await visible();
  assert.equal(await page.locator('[data-monitor="main"]').getAttribute('data-media-kind'), 'picture');
  assert.equal(await page.locator('[data-monitor="main"]').evaluate(image => image.complete && image.naturalWidth > 0), true);
  await page.evaluate(async id => {
    localStorage.removeItem('lilt.test.hold-monitor');
    const { removeMonitorFile } = await import('/src/room/monitor-media.ts');
    await removeMonitorFile(id);
  }, mediaId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await visible();
  assert.equal(await page.locator('[data-monitor="main"]').count(), 0, 'missing custom upload uses original monitor fallback');
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await page.getByText('This upload is no longer saved in this browser. Choose the file again.', { exact: true }).waitFor();
  await page.route('**/room/room-day-v3.webp', route => route.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await visible();
  assert.equal(await page.locator('.room-art').first().getAttribute('src'), 'room/room-morning-v3.webp', 'failed active light uses a loaded painting');
  assert.equal(await page.locator('.room-art').first().evaluate(image => image.complete && image.naturalWidth > 0), true);
  console.log('Room readiness: delayed bundles, refresh, cached decode, StrictMode remount, failure fallback, retry, stale swaps, custom monitor delay and missing upload passed.');
} finally { await browser?.close(); await server.close(); }
