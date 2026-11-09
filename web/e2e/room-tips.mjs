// Real room tips in disposable Chrome storage, with no practice API or owner server.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createIsolatedVite({ logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], api = [];
  const url = `${server.resolvedUrls.local[0]}e2e/fixtures/room-tips.html`;
  const watch = async page => {
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => { api.push(route.request().url()); return route.abort(); });
  };
  const ready = page => page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true' && document.querySelector('.room-stage')?.classList.contains('settled'));
  const hidden = locator => locator.waitFor({ state: 'hidden' });
  const screenshot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };
  const fits = async (locator, label) => {
    const bounds = await locator.boundingBox(), viewport = locator.page().viewportSize();
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `${label} fits in the viewport: ${JSON.stringify(bounds)}`);
  };
  // Clipped artwork has transparent holes; use an actually painted, hittable point.
  const point = locator => locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (let y = Math.max(1, r.top + 2); y < Math.min(innerHeight - 1, r.bottom); y += 6) {
      for (let x = Math.max(1, r.left + 2); x < Math.min(innerWidth - 1, r.right); x += 6) {
        if (el.contains(document.elementFromPoint(x, y))) return { x, y };
      }
    }
    throw new Error(`No visible hit point for ${el.className}`);
  });
  const replay = async page => {
    await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
    await page.getByRole('button', { name: 'Show room tips', exact: true }).click();
    await page.locator('.room-tips').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.room-tips')?.contains(document.activeElement));
  };
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('tips-test-started')) return;
    sessionStorage.setItem('tips-test-started', '1');
    localStorage.setItem('lilt.room.plant', 'fern');
    const decode = HTMLImageElement.prototype.decode;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    window.releaseTipArtwork = release;
    HTMLImageElement.prototype.decode = function () {
      if (!this.src.endsWith('/room/plants/fern.png')) return decode.call(this);
      window.tipArtworkWaiting = true;
      return gate.then(() => decode.call(this));
    };
  });
  const page = await context.newPage();
  await watch(page);
  await page.goto(url);
  await page.waitForFunction(() => window.tipArtworkWaiting);
  assert.equal(await page.locator('.room-tips').isVisible(), false, 'hint waits for decoded selected artwork');
  await page.getByRole('button', { name: 'Make it yours', exact: true }).focus();
  await page.evaluate(() => window.releaseTipArtwork());
  await ready(page);
  await page.locator('.room-tips').waitFor({ state: 'visible', timeout: 5000 });
  assert.match(await page.locator('.room-tips').textContent(), /This room is yours/);
  assert.match(await page.locator('.room-tips').innerText(), /click.*hold/i);
  assert.equal(await page.getByRole('button', { name: 'Make it yours', exact: true }).evaluate(el => el === document.activeElement), true, 'automatic hint never steals focus');
  await fits(page.locator('.room-tips'), 'first-visit hint');
  await screenshot(page, 'room-tips-first-visit.png');
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await hidden(page.locator('.room-tips'));
  await page.reload();
  await ready(page);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.room-tips').isVisible(), false, 'dismissal survives reload');

  await replay(page);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await hidden(page.locator('.room-tips'));
  assert.equal(await page.getByRole('button', { name: 'Make it yours', exact: true }).evaluate(el => el === document.activeElement), true, 'manual replay returns focus');
  await replay(page);
  await page.keyboard.press('Escape');
  await hidden(page.locator('.room-tips'));
  assert.equal(await page.getByRole('button', { name: 'Make it yours', exact: true }).evaluate(el => el === document.activeElement), true, 'Escape also returns replay focus');

  const camera = page.locator('.room-camera-target');
  assert.ok(await camera.getAttribute('data-room-tip'), 'painted camera supplies its action hint');
  assert.equal(await camera.getAttribute('title'), null, 'native tooltip does not compete with the accessible tooltip');
  const cameraPoint = await point(camera);
  await page.mouse.move(cameraPoint.x, cameraPoint.y);
  const tooltip = page.locator('.room-tooltip[role="tooltip"]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  assert.equal(await tooltip.isVisible(), false, 'Escape during pending hover prevents a late tooltip');
  await page.mouse.move(5, 500);
  await page.mouse.move(cameraPoint.x, cameraPoint.y);
  await tooltip.waitFor({ state: 'visible' });
  assert.match(await tooltip.textContent(), /photo/i);
  assert.match(await tooltip.textContent(), /hold/i);
  await fits(tooltip, 'hover tooltip');
  await page.keyboard.press('Escape');
  await hidden(tooltip);
  await page.waitForTimeout(500);
  assert.equal(await tooltip.isVisible(), false, 'Escape stays dismissed while pointer is stationary');
  await page.mouse.move(5, 500);
  await camera.focus();
  await tooltip.waitFor({ state: 'visible' });
  assert.match(await tooltip.textContent(), /Enter/i, 'keyboard tip explains keyboard activation');
  const tooltipId = await tooltip.getAttribute('id');
  assert.ok(tooltipId && (await camera.getAttribute('aria-describedby'))?.split(' ').includes(tooltipId), 'focused target is described by its tooltip');
  await page.keyboard.press('Escape');
  await hidden(tooltip);
  assert.ok(!(await camera.getAttribute('aria-describedby'))?.split(' ').includes(tooltipId), 'dismissal removes tooltip description');

  const chair = page.locator('.room-chair-target');
  const chairPoint = await point(chair);
  await page.getByRole('button', { name: 'Make it yours', exact: true }).focus();
  await camera.focus();
  await tooltip.waitFor({ state: 'visible' });
  await page.mouse.move(chairPoint.x, chairPoint.y);
  await page.waitForFunction(() => /chair/i.test(document.querySelector('.room-tooltip')?.textContent ?? ''));
  await page.mouse.move(5, 500);
  await page.waitForFunction(() => /photo/i.test(document.querySelector('.room-tooltip')?.textContent ?? ''));
  assert.match(await tooltip.innerText(), /Enter/i, 'leaving a hovered target restores the focused target keyboard tip');
  await replay(page);
  await page.keyboard.press('Tab');
  await camera.focus();
  await tooltip.waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await hidden(tooltip);
  assert.equal(await page.locator('.room-tips').isVisible(), true, 'first Escape dismisses the tooltip only');
  await page.keyboard.press('Escape');
  await hidden(page.locator('.room-tips'));
  await page.mouse.move(chairPoint.x, chairPoint.y);
  await tooltip.waitFor({ state: 'visible' });
  assert.match(await tooltip.textContent(), /chair/i);
  await fits(tooltip, 'clipped chair tooltip');
  assert.equal(await tooltip.evaluate(el => !!el.closest('.room-stage')), false, 'tooltip stays outside scaled and clipped painting');
  await screenshot(page, 'room-tips-chair.png');
  await page.mouse.down();
  await page.waitForTimeout(750);
  await page.mouse.up();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await hidden(tooltip);
  await page.keyboard.press('Escape');
  await hidden(page.getByRole('dialog'));
  assert.equal(await page.evaluate(() => window.entered), 0, 'chair hold never enters the desk');

  await replay(page);
  await page.getByRole('button', { name: /Sit down at the computer/ }).focus();
  await page.keyboard.press('Enter');
  await hidden(page.locator('.room-tips'));
  await hidden(tooltip);
  assert.equal(await page.evaluate(() => window.entered), 1, 'normal monitor activation still enters');
  await page.evaluate(() => window.setInside(false));
  await ready(page);
  await replay(page);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await screenshot(page, 'room-tips-dark.png');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.setInside(true));
  await page.waitForFunction(() => !document.querySelector('.room-stage').classList.contains('settled'));
  await hidden(page.locator('.room-tips'));
  // Inside the desk never has the room's settled marker; let its 1100ms flight finish.
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.setInside(false));
  await page.waitForFunction(() => !document.querySelector('.room-stage').classList.contains('settled'));
  assert.equal(await page.locator('.room-tips').isVisible(), false, 'hint waits while returning camera is moving');
  await ready(page);
  await page.locator('.room-tips').waitFor({ state: 'visible' });
  await context.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const mobile = await phone.newPage();
  await watch(mobile);
  await mobile.goto(url);
  await ready(mobile);
  await mobile.locator('.room-tips').waitFor({ state: 'visible' });
  assert.match(await mobile.locator('.room-tips').innerText(), /tap/i);
  assert.match(await mobile.locator('.room-tips').innerText(), /shortcut/i);
  await fits(mobile.locator('.room-tips'), 'phone hint');
  await screenshot(mobile, 'room-tips-phone.png');
  await mobile.getByRole('button', { name: 'Got it', exact: true }).tap();
  await hidden(mobile.locator('.room-tips'));
  await phone.close();

  const blocked = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage unavailable for test', 'SecurityError'); } });
  });
  const noStorage = await blocked.newPage();
  await watch(noStorage);
  await noStorage.goto(url);
  await ready(noStorage);
  await noStorage.locator('.room-tips').waitFor({ state: 'visible' });
  await noStorage.getByRole('button', { name: 'Got it', exact: true }).click();
  await hidden(noStorage.locator('.room-tips'));
  await noStorage.evaluate(() => window.remountRoom());
  await ready(noStorage);
  await noStorage.waitForTimeout(700);
  assert.equal(await noStorage.locator('.room-tips').isVisible(), false, 'unavailable storage still remembers dismissal during this visit');
  await replay(noStorage);
  await noStorage.getByRole('button', { name: 'Got it', exact: true }).click();
  await hidden(noStorage.locator('.room-tips'));
  await blocked.close();
  assert.deepEqual(api, [], 'fixture makes no practice API requests');
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log('PASS: room tips readiness, first-visit focus, persistent dismissal, replay/focus return, hover/keyboard/Escape, clipped chair, hold, desk entry, phone/dark views and unavailable storage.');
} finally { await browser?.close(); await server.close(); }
