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
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await context.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Isolated chair fixture' } }));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = server.resolvedUrls.local[0];
  await page.goto(url);
  const picker = page.getByRole('dialog', { name: 'Choose your chair' });
  const shown = async id => page.waitForFunction(id => id === 'original'
    ? !document.querySelector('.room-chair-art') && !document.querySelector('.room-chair-clear')
    : document.querySelector('.room-chair-art')?.dataset.chair === id, id);
  const open = async () => { await page.locator('.room-chair-target').click(); await picker.waitFor(); };
  const select = async (name, id) => { await picker.getByRole('button', { name, exact: true }).click(); await shown(id); };
  const setLight = async light => {
    await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
    await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue('--room-' + light + '-opacity') === '1', light);
  };
  await page.locator('.room-player-art').waitFor();
  await open();
  assert.equal(await picker.getByRole('button', { pressed: true }).textContent(), 'Mesh & pink throw');
  for (const [id, name] of [['original', 'Mesh & pink throw'], ['cream', 'Cream upholstered'], ['sage', 'Sage padded'], ['cane', 'Walnut & cane']]) {
    await select(name, id);
    assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.chair')), id);
    await picker.getByRole('button', { name: 'Done', exact: true }).click();
    assert.equal(await page.locator('.room-chair-target').evaluate(el => el === document.activeElement), true);
    for (const light of ['day', 'morning', 'sunset', 'night']) {
      await setLight(light);
      if (shots) await page.screenshot({ path: path.join(shots, `${light}-${id}.png`) });
    }
    if (id !== 'original') {
      assert.equal(await page.locator('.room-chair-art').evaluate(el => getComputedStyle(el).transform), 'none');
      assert.equal(await page.locator('.room-chair-art').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await page.locator('.room-chair-bed').count(), 1);
    }
    assert.equal(await page.locator('.room-player-art').getAttribute('data-playing'), 'false');
    assert.equal(new URL(page.url()).hash, '');
    await open();
  }
  await page.keyboard.press('Escape'); await picker.waitFor({ state: 'hidden' });
  await page.reload(); await shown('cane');
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click(); await shown('cane');
  // Cross-tab storage events update the visible chair, including returning to the original.
  const other = await context.newPage(); await other.goto(url); await other.locator('.room-chair-target').waitFor();
  await other.evaluate(async () => { const { chooseChair } = await import('/src/room/chairState.ts'); chooseChair('original'); });
  await shown('original'); await other.close();
  // Initial artwork failure retains the original, and Original never waits on failed repairs.
  await page.route('**/room/chair/cream.png', route => route.abort());
  await open(); await picker.getByRole('button', { name: 'Cream upholstered', exact: true }).click();
  await picker.getByText(/Couldn't load this chair/).waitFor(); await shown('original');
  await select('Mesh & pink throw', 'original');
  assert.equal(await picker.getByText(/Couldn't load this chair/).count(), 0);
  await page.unroute('**/room/chair/cream.png'); await select('Cream upholstered', 'cream');
  await page.route('**/room/chair/clear-night.png', route => route.abort());
  await page.reload(); await open(); await picker.getByText(/Couldn't load this chair/).waitFor(); await shown('original');
  await select('Mesh & pink throw', 'original');
  await page.unroute('**/room/chair/clear-night.png'); await select('Sage padded', 'sage');
  // A delayed old load cannot bring back a chair after choosing Original.
  await page.evaluate(async () => {
    const NativeImage = window.Image;
    window.Image = class extends NativeImage {
      set src(value) { if (value.endsWith('/cream.png')) setTimeout(() => super.src = value, 250); else super.src = value; }
      get src() { return super.src; }
    };
    const { chooseChair } = await import('/src/room/chairState.ts'); chooseChair('cream'); chooseChair('original');
    setTimeout(() => window.Image = NativeImage, 500);
  });
  await page.waitForTimeout(600); await shown('original');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); }; });
  await select('Walnut & cane', 'cane'); await picker.getByText(/couldn't save/).waitFor();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.room-chair-shortcut').click(); await picker.waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone has no horizontal overflow');
  const box = await picker.boundingBox(); assert.ok(box.width <= 390 && box.height <= 844);
  if (shots) await page.screenshot({ path: path.join(shots, 'phone-picker-dark.png') });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.room-chair-shortcut').evaluate(el => el === document.activeElement), true);
  assert.deepEqual(errors, []);
  console.log('PASS: four chair designs, all lights, stationary art, persistence/reset, cross-tab changes, image/storage failures, stale loads, keyboard and phone controls.');
} finally { await browser?.close(); await server.close(); }
