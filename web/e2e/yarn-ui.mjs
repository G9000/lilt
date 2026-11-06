// Disposable API fixtures and Chrome's fake microphone; never touches the owner's practice.
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fileURLToPath(new URL('./fake-mic.wav', import.meta.url))}`] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, permissions: ['microphone'], reducedMotion: 'reduce' });
  let profile = { comfort_range_hz: [100, 260], goal: { summary: '' } };
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/profile') {
      if (route.request().method() === 'PUT') profile = route.request().postDataJSON();
      return route.fulfill({ json: profile });
    }
    if (url.pathname === '/api/texts') return route.fulfill({ json: { levels: [] } });
    return route.fulfill({ status: 503, json: { error: 'Isolated yarn test' } });
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}#/yarn`);
  await page.getByRole('button', { name: 'Start playing', exact: true }).waitFor();
  await page.locator('.yn-scene[data-art="ready"]').waitFor();
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-initial.png') });
  assert.equal(await page.locator('.yn-intro').count(), 1, 'setup has an illustrated introduction beside its controls');
  assert.equal(await page.getByRole('checkbox', { name: /Free play/ }).count(), 1, 'free play can be chosen before opening the microphone');
  const canvasPixels = () => page.locator('.yn-scene canvas').evaluate(canvas => canvas.toDataURL());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(150);
  const movingPreview = await canvasPixels();
  await page.waitForTimeout(250);
  assert.ok(await canvasPixels() !== movingPreview, 'preview responds when motion is enabled while Yarn is open');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const stillPreview = await canvasPixels();
  await page.waitForTimeout(250);
  assert.ok(await canvasPixels() === stillPreview, 'reduced motion immediately stops decorative preview movement');
  assert.ok(await page.locator('.yn-intro h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 32), 'introduction typography is applied');
  await page.getByRole('radio', { name: /Hum or lip trill/ }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('radio', { name: /Speak sentences/ }).getAttribute('aria-checked'), 'true');
  await page.keyboard.press('ArrowLeft');
  await page.locator('.yn-help summary').click();
  assert.ok(await page.locator('.yn-how').isVisible(), 'instructions open on demand');
  await page.locator('.yn-help summary').click();
  const fits = async control => {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox(), size = page.viewportSize();
    assert.ok(box && box.x >= 0 && box.x + box.width <= size.width + 1 && box.y >= 0 && box.y + box.height <= size.height + 1, 'control fits within the viewport');
    assert.ok(await control.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), 'control is clickable');
  };
  for (const [width, height] of [[1440,950], [3440,1440], [3840,2160], [1024,768], [844,390], [390,844]]) {
    await page.setViewportSize({ width, height });
    await fits(page.getByRole('button', { name: 'Start playing', exact: true }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
    if (shots) await page.screenshot({ path: path.join(shots, `yarn-setup-${width}.png`) });
    if (width === 390 && shots) {
      await page.locator('.yn-stage').evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: path.join(shots, 'yarn-setup-phone-top.png') });
    }
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Start playing', exact: true }).click();
  await page.locator('.yn-stage.playing').waitFor();
  await page.waitForFunction(() => Number(document.querySelector('.yn-scene').dataset.y) < .85, null, { timeout: 15000 });
  await page.waitForFunction(() => Number.isFinite(Number(document.querySelector('.yn-scene').dataset.threadedAt)), null, { timeout: 15000 });
  await page.waitForTimeout(250);
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-cat-reaction.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(Number(await page.locator('.yn-scene').getAttribute('data-loops')) > 0, 'regular play still brings loops');
  const threadedAt = await page.locator('.yn-scene').getAttribute('data-threaded-at');
  await page.getByRole('button', { name: 'Take a breath', exact: true }).click();
  await page.getByRole('region', { name: 'Breathing break' }).waitFor();
  await page.waitForTimeout(300);
  const pausedTime = await page.locator('.yn-scene').getAttribute('data-time');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.yn-scene').getAttribute('data-time'), pausedTime, 'break freezes reaction time');
  await page.getByRole('button', { name: 'Carry on', exact: true }).click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.yn-scene').getAttribute('data-threaded-at'), threadedAt, 'resuming does not retrigger the same loop');
  for (const [width, height] of [[1440,950], [3440,1440], [3840,2160], [844,390], [390,844]]) {
    await page.setViewportSize({ width, height });
    await fits(page.getByRole('button', { name: 'Take a breath', exact: true }));
    await fits(page.getByRole('button', { name: 'Stop', exact: true }));
    await fits(page.getByRole('button', { name: 'It hurts or feels strained', exact: true }));
    assert.ok((await page.locator('.yn-scene').boundingBox()).height >= 150, 'play controls leave room for the game');
    if (shots) await page.screenshot({ path: path.join(shots, `yarn-play-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Take a breath', exact: true }).click();
  await page.getByRole('region', { name: 'Breathing break' }).waitFor();
  await fits(page.getByRole('button', { name: 'Carry on', exact: true }));
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-breath-phone.png') });
  await page.getByRole('button', { name: 'Carry on', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Play again', exact: true }).waitFor();
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-summary-phone.png') });
  assert.ok(!/score|points|leaderboard|streak/i.test(await page.locator('.yn').innerText()));
  await page.reload();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.getByRole('radio', { name: /Speak sentences/ }).click();
  await page.setViewportSize({ width: 1440, height: 950 });
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-setup-dark.png') });
  await page.getByRole('button', { name: 'Start playing', exact: true }).click();
  await page.locator('.yn-say p').waitFor();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(700); // Let the app's theme/motion transition settle before inspecting its ink.
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-play-dark.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-speak-phone-dark.png') });
  await page.getByRole('button', { name: 'It hurts or feels strained', exact: true }).click();
  await page.getByRole('heading', { name: 'Let’s stop here' }).waitFor();
  assert.equal(await page.locator('.yn-stage.playing').count(), 0);
  await page.reload();
  const free = page.getByRole('checkbox', { name: /Free play/ });
  await free.check();
  assert.equal(await page.getByRole('checkbox', { name: /Play each loop/ }).count(), 0, 'free play hides irrelevant loop sounds');
  await page.reload();
  assert.ok(await free.isChecked(), 'free play preference survives reopening');
  await page.getByRole('button', { name: 'Start playing', exact: true }).click();
  await page.waitForFunction(() => Number(document.querySelector('.yn-scene').dataset.y) < .85, null, { timeout: 15000 });
  await page.waitForTimeout(4000);
  assert.equal(await page.locator('.yn-scene').getAttribute('data-loops'), '0', 'free play never deals loops');
  assert.equal(await page.locator('.yn-scene').getAttribute('data-cues'), '0', 'free play never cues loop notes');
  assert.equal(await page.locator('.yn-scene').getAttribute('data-threaded-at'), '-Infinity', 'a new game starts without an old reaction');
  await page.getByRole('button', { name: 'Take a breath', exact: true }).click();
  await page.getByRole('region', { name: 'Breathing break' }).waitFor();
  await page.getByRole('button', { name: 'Carry on', exact: true }).click();
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-free-play-phone.png') });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Play again', exact: true }).waitFor();
  await page.reload();
  await free.uncheck();
  assert.ok(await page.getByRole('checkbox', { name: /Play each loop/ }).isChecked(), 'returning to loops restores the sound preference');
  profile = { ...profile, comfort_range_hz: null };
  await page.reload();
  await page.getByRole('button', { name: 'Find my range', exact: true }).click();
  await page.getByText('Hum a comfortable low note').waitFor();
  await page.getByText('Now a comfortable high note').waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Save as my comfortable range' }).waitFor({ timeout: 20000 });
  await fits(page.getByRole('button', { name: 'Just for this game' }));
  await page.getByRole('button', { name: 'Just for this game' }).click();
  await page.getByRole('button', { name: 'Start playing', exact: true }).waitFor();
  assert.equal(profile.comfort_range_hz, null, 'temporary calibration does not save a profile');
  // Missing artwork must leave a usable drawn scene, not block the microphone or setup.
  await page.route('**/yarn/*.webp', route => route.abort());
  await page.reload();
  await page.locator('.yn-scene[data-art="fallback"]').waitFor();
  await fits(page.getByRole('button', { name: 'Find my range', exact: true }));
  assert.ok(await page.locator('.yn-scene canvas').evaluate(canvas => {
    const pixel = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    return pixel[3] === 255;
  }), 'fallback scenery is painted when all artwork requests fail');
  if (shots) await page.screenshot({ path: path.join(shots, 'yarn-art-fallback.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: Yarn setup/play controls, fake voice input, breaks, summary, hurt stop and phone through 4K layout');
} finally { await browser?.close(); await server.close(); }
