// All files and practice data in this suite belong to a disposable browser context.
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.route('**/api/**', r => r.fulfill({ status: 503, json: { error: 'Isolated media test' } }));
  const page = await context.newPage();
  const errors = [];
  const sentFiles = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.method() !== 'GET') sentFiles.push(r.url()); });
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  assert.equal(await page.getByLabel('Upload main monitor video', { exact: true }).count(), 1, 'main monitor offers a video upload');
  // Generate an actual two-second video locally; nothing is downloaded or recorded from a device.
  const video = Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const g = canvas.getContext('2d'); const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start(); let frame = 0;
    const timer = setInterval(() => { g.fillStyle = '#6f97a6'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#eee7d6'; g.beginPath(); g.arc(80 + frame++ * 2, 60, 24, 0, Math.PI * 2); g.fill(); }, 80);
    await new Promise(resolve => setTimeout(resolve, 1600)); recorder.stop(); await stopped;
    clearInterval(timer); stream.getTracks().forEach(t => t.stop());
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
  }));
  await page.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Rain.webm', mimeType: 'video/webm', buffer: video });
  const screen = page.locator('video.room-monitor-art[data-monitor="main"]');
  await screen.waitFor();
  await page.waitForFunction(() => { const v = document.querySelector('video.room-monitor-art'); return v && !v.paused && v.currentTime > .1; });
  assert.ok(await screen.evaluate(v => v.muted && v.loop && v.playsInline), 'video is a silent inline loop');
  const main = page.getByRole('group', { name: 'Main monitor', exact: true });
  await main.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video.room-monitor-art').paused);
  const pausedTime = await screen.evaluate(v => v.currentTime);
  await page.waitForTimeout(300);
  assert.equal(await screen.evaluate(v => v.currentTime), pausedTime, 'pause holds the video frame');
  await page.reload();
  await screen.waitFor();
  assert.ok(await screen.evaluate(v => v.paused), 'pause survives reload');
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await main.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('video.room-monitor-art').paused);
  console.log('PASS: uploaded video plays silently, pauses and survives reload');

  // Two-frame GIF, built locally with a red/blue palette and a looping extension.
  const gif = Buffer.from('47494638396102000100800000ff00000000ff21ff0b4e45545343415045322e30030100000021f904040a0000002c0000000002000100000202040a0021f904040a0000002c00000000020001000002024c0a003b', 'hex');
  const side = page.getByRole('group', { name: 'Side monitor', exact: true });
  await side.getByLabel('Upload side monitor gif', { exact: true }).setInputFiles({ name: 'Cat.gif', mimeType: 'image/gif', buffer: gif });
  const sideScreen = page.locator('img.room-monitor-art[data-monitor="side"]');
  await sideScreen.waitFor();
  await page.waitForFunction(() => document.querySelector('img.room-monitor-art[data-monitor="side"]').naturalWidth === 2);
  const gifUrl = await sideScreen.getAttribute('src');
  await side.getByRole('button', { name: 'Pause', exact: true }).click();
  await side.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert.notEqual(await sideScreen.getAttribute('src'), gifUrl, 'GIF pause uses its saved still');
  assert.ok(await screen.evaluate(v => !v.paused), 'side pause leaves main video playing');
  await side.getByRole('button', { name: 'Play', exact: true }).click();
  await side.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  assert.equal(await sideScreen.getAttribute('src'), gifUrl, 'GIF can restart');
  await main.getByRole('radio', { name: 'Stars', exact: true }).click();
  await screen.waitFor({ state: 'detached' });
  assert.equal(await screen.count(), 0, 'preset replaces custom video');
  await main.getByRole('button', { name: 'Use upload', exact: true }).click();
  await screen.waitFor();
  const saved = await page.evaluate(() => localStorage.getItem('lilt.room.appearance'));
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Broken.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not a movie') });
  await main.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), saved, 'malformed media preserves selection');
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Unreadable.webm', mimeType: 'video/webm', buffer: Buffer.from('1a45dfa300000000', 'hex') });
  await page.waitForFunction(() => document.querySelector('.room-media-error')?.textContent.includes('cannot play'));
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), saved, 'failed decoding preserves selection');
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Large.webm', mimeType: 'video/webm', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await page.waitForFunction(() => document.querySelector('.room-media-error')?.textContent.includes('25 MB'));
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), saved, 'oversized media preserves selection');

  // Fail each persistence stage independently; neither may replace a working screen.
  await page.evaluate(() => { window.oldPut = Cache.prototype.put; Cache.prototype.put = () => Promise.reject(new DOMException('Full', 'QuotaExceededError')); });
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Replacement.webm', mimeType: 'video/webm', buffer: video });
  await page.waitForFunction(() => document.querySelector('.room-media-error')?.textContent.includes('browser storage'));
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), saved);
  await page.evaluate(() => { Cache.prototype.put = window.oldPut; window.oldSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Replacement.webm', mimeType: 'video/webm', buffer: video });
  await page.waitForFunction(() => document.querySelector('.room-media-error')?.textContent.includes('screen could not be saved'));
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), saved);
  await page.evaluate(() => { Storage.prototype.setItem = window.oldSet; });
  await page.evaluate(async () => {
    const { setRoomAppearance } = await import('/src/room/appearance.ts');
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    await setRoomAppearance({ light: 'night' }); await setRoomAppearance({ warmth: 40 });
    Storage.prototype.setItem = window.oldSet;
  });
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'), 'night', 'temporary light choice survives a second unsaved change');
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ warmth: 0 }); });
  const countFiles = () => page.evaluate(async () => (await (await caches.open('lilt-monitor-media-v1')).keys()).length);
  await page.waitForFunction(async () => (await (await caches.open('lilt-monitor-media-v1')).keys()).length === 4);
  assert.equal(await countFiles(), 4, 'failed uploads leave only two committed files and their stills');
  console.log('PASS: independent GIF controls, presets and transactional upload errors');

  await page.reload();
  await screen.waitFor(); await sideScreen.waitFor();
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('video.room-monitor-art').paused);
  await main.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('video.room-monitor-art').paused);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Sit down at the computer/ }).click();
  await page.waitForFunction(() => location.hash.startsWith('#/deck'));
  await page.waitForFunction(() => document.querySelector('video.room-monitor-art').paused);
  await page.goto(`${server.resolvedUrls.local[0]}#/`);
  await page.reload();
  await screen.waitFor();
  assert.ok(await screen.evaluate(v => v.paused), 'reduced motion starts at a still even with a saved playing preference');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => !document.querySelector('video.room-monitor-art').paused);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => document.querySelector('video.room-monitor-art').paused);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => !document.querySelector('video.room-monitor-art').paused);

  const other = await context.newPage();
  await other.goto(server.resolvedUrls.local[0]);
  await other.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await page.evaluate(() => { window.holdStorage = event => event.stopImmediatePropagation(); window.addEventListener('storage', window.holdStorage, true); });
  await other.getByRole('group', { name: 'Side monitor', exact: true }).getByRole('button', { name: 'Remove', exact: true }).click();
  await other.waitForFunction(() => !JSON.parse(localStorage.getItem('lilt.room.appearance')).sideMedia);
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ warmth: 35 }); });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.appearance')).sideMedia), undefined, 'stale tab cannot restore deleted media during an unrelated change');
  await page.evaluate(() => window.removeEventListener('storage', window.holdStorage, true));
  await sideScreen.waitFor({ state: 'detached' });
  await page.reload(); await screen.waitFor();
  assert.equal(await sideScreen.count(), 0, 'removal reaches another tab and survives reload');
  await other.close();

  // Keep the menu controls usable with an uploaded preview at large and phone sizes.
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  for (const [width, height] of [[3840,2160], [3440,1440], [1440,844], [390,844]]) {
    await page.setViewportSize({ width, height });
    for (const control of [main.getByRole('button', { name: 'Pause', exact: true }), page.getByRole('button', { name: 'Reset room', exact: true })]) {
      await control.scrollIntoViewIfNeeded();
      const b = await control.boundingBox();
      assert.ok(b && b.x >= 0 && b.x + b.width <= width && b.y >= 0 && b.y + b.height <= height, `media control fits ${width}×${height}`);
      assert.ok(await control.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), 'media control receives clicks');
    }
    await main.getByRole('button', { name: 'Pause', exact: true }).scrollIntoViewIfNeeded();
    if (shots) await page.screenshot({ path: path.join(shots, `monitor-media-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Reset room', exact: true }).click();
  await screen.waitFor({ state: 'detached' });
  await page.waitForFunction(async () => (await (await caches.open('lilt-monitor-media-v1')).keys()).length === 0);
  await page.reload();
  assert.equal(await page.locator('.room-monitor-art').count(), 0, 'reset clears media and persists');
  assert.deepEqual(sentFiles.filter(url => !url.endsWith('/api/deck/session')), [], 'media files never leave the browser');
  console.log('PASS: reduced motion, leaving the room, hidden tab, cross-tab removal, responsive controls and reset cleanup');

  await page.setViewportSize({ width: 1440, height: 950 });
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  const picture = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 80; c.height = 40;
    const g = c.getContext('2d'); g.fillStyle = '#93a98e'; g.fillRect(0, 0, 80, 40);
    return c.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await main.getByLabel('Upload main monitor picture', { exact: true }).setInputFiles({ name: 'Leaves.png', mimeType: 'image/png', buffer: picture });
  await page.locator('img.room-monitor-art[data-monitor="main"][data-media-kind="picture"]').waitFor();
  await page.getByRole('button', { name: 'Reset room', exact: true }).click();
  // Open the second tab before the upload holds the shared appearance/cleanup lock.
  const resetTab = await context.newPage(); await resetTab.goto(server.resolvedUrls.local[0]);
  await resetTab.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await page.evaluate(() => {
    window.oldPut = Cache.prototype.put;
    const gate = new Promise(resolve => { window.releaseUpload = resolve; });
    Cache.prototype.put = async function(...args) { window.cacheWaiting = true; await gate; return window.oldPut.apply(this, args); };
  });
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Pending.webm', mimeType: 'video/webm', buffer: video });
  await page.waitForFunction(() => window.cacheWaiting);
  // The queued reset runs after the in-flight cache write and removes its result.
  await resetTab.getByRole('button', { name: 'Reset room', exact: true }).click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { Cache.prototype.put = window.oldPut; window.releaseUpload(); });
  await page.waitForFunction(async () => (await (await caches.open('lilt-monitor-media-v1')).keys()).length === 0);
  await page.waitForFunction(() => document.querySelectorAll('.room-monitor-art').length === 0);
  assert.equal(await page.locator('.room-monitor-art').count(), 0, 'a pending upload cannot resurrect after cross-tab reset');
  await resetTab.close();
  await main.getByLabel('Upload main monitor video', { exact: true }).setInputFiles({ name: 'Rain.webm', mimeType: 'video/webm', buffer: video });
  await screen.waitFor();
  await page.evaluate(() => caches.delete('lilt-monitor-media-v1'));
  await page.reload();
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await main.getByRole('alert').waitFor();
  assert.match(await main.getByRole('alert').textContent(), /no longer saved/);
  await main.getByRole('button', { name: 'Play', exact: true }).click();
  assert.match(await main.getByRole('alert').textContent(), /no longer saved/, 'Play cannot dismiss an unavailable file warning');
  assert.equal(await page.locator('.room-monitor-art').count(), 0, 'eviction falls back to the original painting');
  await page.getByRole('button', { name: 'Reset room', exact: true }).click();
  console.log('PASS: pictures, cross-tab reset during upload and missing browser files');
  assert.deepEqual(errors, []);
} finally { await browser?.close(); await server.close(); }
