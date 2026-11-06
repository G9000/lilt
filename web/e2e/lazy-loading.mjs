// Exercise actual production chunks, including stalled and failed downloads.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { productionPreview } from './production-preview.mjs';

const preview = await productionPreview();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: [
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${fileURLToPath(new URL('./fake-mic.wav', import.meta.url))}`,
  ] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce', permissions: ['microphone'] });
  const texts = { note: '', home: 'A comfortable start.', levels: [{ id: 'warmup', level: 1, title: 'Warm-ups', subtitle: 'An easy beginning', kind: 'phrase', part: 'Begin', basis: '', items: [{ id: 'first', text: 'Good morning.', hint: 'Go gently.' }] }] };
  let textRequests = 0;
  await context.route('**/api/**', route => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/api/texts') textRequests++;
    const value = p === '/api/profile' ? { comfort_range_hz: [100, 260], goal: { summary: '', descriptors: [] }, session_minutes: 5 }
      : p === '/api/courses' ? { courses: [{ id: 'voice', title: 'Your voice', kind: 'voice' }] }
      : p === '/api/texts' ? texts
      : p === '/api/history' ? { takes: [] }
      : p === '/api/photos' ? { uploaded: [], hidden: [] }
      : p === '/api/deck/today' ? { items: [], paused: false, counts: { new: 0, review: 0, again: 0 }, open_stage: 1, cap: 5 }
      : null;
    return route.fulfill({ status: value ? 200 : 503, json: value ?? { error: 'Isolated loading test' } });
  });
  await context.addInitScript(() => {
    window.__micOpens = 0;
    const open = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.__micOpens++;
      const stream = await open(constraints);
      window.__micStream = stream;
      return stream;
    };
  });
  const page = await context.newPage(), requests = [];
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.js')) requests.push(new URL(request.url()).pathname.slice(1)); });
  const yarnFile = preview.manifest['src/pages/Yarn.tsx'].file;
  const settingsFile = preview.manifest['src/pages/Settings.tsx'].file;
  const photosFile = preview.manifest['src/pages/Photos.tsx'].file;
  await page.goto(preview.url);
  await page.getByRole('banner').getByRole('button', { name: 'Settings', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  const eager = new Set();
  function visit(key) { const entry = preview.manifest[key]; if (eager.has(entry.file)) return; eager.add(entry.file); (entry.imports ?? []).forEach(visit); }
  visit('index.html');
  assert.deepEqual([...new Set(requests)].sort(), [...eager].filter(file => file.endsWith('.js')).sort(), 'the room loads only the static entry graph');
  assert.ok(!requests.includes(yarnFile) && !requests.includes(settingsFile) && !requests.includes(photosFile), 'screens remain deferred');

  let releaseYarn;
  const yarnGate = new Promise(done => { releaseYarn = done; });
  await page.route(`**/${yarnFile}`, async route => { await yarnGate; await route.continue(); });
  await page.evaluate(() => { window.location.hash = '/yarn'; });
  await page.getByRole('status').filter({ hasText: 'Opening…' }).waitFor();
  assert.equal(await page.locator('.room').count(), 1, 'room stays mounted while a screen loads');
  releaseYarn();
  await page.getByRole('button', { name: 'Start playing', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start playing', exact: true }).click();
  await page.locator('.yn-stage.playing').waitFor();
  await page.waitForFunction(() => window.__micOpens === 1 && window.__micStream?.active);
  const track = await page.evaluate(() => window.__micStream.getAudioTracks()[0].id);
  await page.evaluate(() => { window.location.hash = '/studio/free'; });
  await page.locator('.ve-note').waitFor();
  assert.equal(await page.evaluate(() => window.__micOpens), 1, 'opening practice reuses the same microphone provider');
  assert.equal(await page.evaluate(() => window.__micStream.getAudioTracks()[0].id), track, 'microphone stream survives loading another screen');
  const beforeSwitch = textRequests;
  await page.evaluate(() => { window.location.hash = '/progress'; });
  await page.locator('.ve-embed').waitFor();
  await page.evaluate(() => { window.location.hash = '/studio/free'; });
  await page.locator('.ve-note').waitFor();
  assert.equal(textRequests, beforeSwitch, 'healthy VoicePage is not remounted between its full-window routes');

  // Closing Settings while its first download is pending must keep it closed when it arrives.
  let releaseSettings;
  const settingsGate = new Promise(done => { releaseSettings = done; });
  const fresh = await context.newPage();
  await fresh.route(`**/${settingsFile}`, async route => { await settingsGate; await route.continue(); });
  await fresh.goto(preview.url);
  await fresh.getByRole('banner').getByRole('button', { name: 'Settings', exact: true }).click();
  await fresh.locator('.ss').getByRole('status').waitFor();
  await fresh.keyboard.press('Escape');
  releaseSettings();
  await fresh.waitForLoadState('networkidle');
  assert.equal(await fresh.locator('.ss').getAttribute('aria-hidden'), 'true');
  await fresh.getByRole('banner').getByRole('button', { name: 'Settings', exact: true }).click();
  await fresh.getByRole('button', { name: 'Reset to orange', exact: true }).waitFor();
  await fresh.keyboard.press('Escape');
  await fresh.close();

  const failed = await context.newPage();
  await failed.route(`**/${yarnFile}`, route => route.abort('failed'));
  await failed.goto(`${preview.url}#/yarn`);
  await failed.getByRole('alert').filter({ hasText: "This screen couldn't load" }).waitFor();
  await failed.getByRole('button', { name: 'Reload Lilt', exact: true }).waitFor();
  assert.equal(await failed.locator('.room').count(), 1, 'a failed download does not blank the room');
  await failed.evaluate(() => { window.location.hash = '/photos'; });
  await failed.getByRole('heading', { name: 'Photos', exact: true }).waitFor();
  assert.equal(await failed.getByRole('button', { name: 'Reload Lilt', exact: true }).count(), 0, 'navigation resets only a failed screen boundary');
  await failed.evaluate(() => { window.location.hash = '/yarn'; });
  await failed.getByRole('button', { name: 'Reload Lilt', exact: true }).waitFor();
  await failed.unroute(`**/${yarnFile}`);
  await failed.getByRole('button', { name: 'Reload Lilt', exact: true }).click();
  await failed.getByRole('button', { name: 'Start playing', exact: true }).waitFor();
  await failed.close();

  const direct = await context.newPage();
  await direct.setViewportSize({ width: 390, height: 844 });
  await direct.goto(`${preview.url}#/yarn`);
  await direct.getByRole('button', { name: 'Start playing', exact: true }).waitFor();
  assert.ok(await direct.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await direct.close();
  console.log('PASS: deferred production requests, slow/failed downloads, direct links, Settings dismissal, route state and microphone continuity.');
} finally { await browser?.close(); await preview.close(); }
