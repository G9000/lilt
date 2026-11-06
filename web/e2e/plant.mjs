// Weekly plant choices, with disposable browser storage and a stubbed practice API.
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
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    let days = 0;
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('**/api/**', route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (request.method() !== 'GET') writes.push(pathname);
      const data = pathname === '/api/profile' ? { goal: { summary: 'A little room to grow.' } }
        : pathname === '/api/deck/today' ? { counts: { new: 0, review: 0, again: 0 }, items: [], participation: { days_this_week: days } }
        : pathname === '/api/texts' ? { levels: [] }
        : pathname === '/api/photos' ? { uploaded: [], hidden: [] } : null;
      return route.fulfill({ status: data ? 200 : 503, json: data ?? { error: 'Isolated plant fixture' } });
    });
    await page.goto(server.resolvedUrls.local[0]);
    await page.locator('.room-stage.settled').waitFor();
    const widget = page.locator('.ds-plant');
    const dialog = page.getByRole('dialog', { name: 'Choose your plant', exact: true });
    await widget.waitFor();
    assert.match(await widget.innerText(), /A new week/);
    assert.equal(await widget.locator('[data-grown="true"]').count(), 0);
    await widget.click();
    assert.equal(await dialog.getByRole('button', { name: 'Original sprout', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await widget.evaluate(el => el === document.activeElement), true);
    const originalSize = await widget.evaluate(el => [el.offsetWidth, el.offsetHeight]);
    for (const count of [0, 3, 7]) {
      days = count;
      await page.reload();
      await widget.waitFor();
      await page.locator('.room-stage.settled').waitFor();
      await widget.click();
      for (const [name, id] of [['Original sprout', 'sprout'], ['Monstera', 'monstera'], ['Fern', 'fern'], ['Succulent', 'succulent']]) {
        await dialog.getByRole('button', { name, exact: true }).click();
        assert.equal(await widget.locator('svg').getAttribute('data-plant'), id);
        assert.equal(await widget.locator('[data-grown="true"]').count(), count, `${id}: ${count} days of growth`);
        assert.deepEqual(await widget.evaluate(el => [el.offsetWidth, el.offsetHeight]), originalSize, 'choosing does not resize the widget');
        assert.match(await widget.innerText(), count ? new RegExp(`${count} days`) : /A new week/);
      }
      if (shots) await dialog.screenshot({ path: path.join(shots, `plants-${count}-${colorScheme}.png`) });
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await dialog.waitFor({ state: 'detached' });
    }
    await page.reload();
    await widget.waitFor();
    await page.locator('.room-stage.settled').waitFor();
    assert.equal(await widget.locator('svg').getAttribute('data-plant'), 'succulent', 'choice survives reload');
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.equal(await widget.locator('svg').getAttribute('data-plant'), 'succulent', 'layout reset preserves choice');
    assert.equal(await widget.locator('.leaf').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await widget.locator('.leaf').first().evaluate(el => getComputedStyle(el).animationName), 'ds-sway');
    assert.equal(await widget.locator('.leaf').first().locator('path').count(), 2, 'leaf and vein move together');
    await page.waitForTimeout(800);
    if (shots) await page.screenshot({ path: path.join(shots, `plant-sway-${colorScheme}.png`), clip: await widget.boundingBox() });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await widget.focus(); await page.keyboard.press('Enter');
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await widget.evaluate(el => el === document.activeElement), true);
    const before = await widget.boundingBox();
    await page.mouse.move(before.x + 30, before.y + 40); await page.mouse.down();
    await page.mouse.move(before.x + 80, before.y + 65, { steps: 10 }); await page.mouse.up();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('lilt.room.layout.cel-studio.2') ?? '{}').plant);
    assert.equal(await dialog.count(), 0, 'dragging does not open the picker');
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    await page.waitForTimeout(500);
    if (shots) await page.screenshot({ path: path.join(shots, `room-${colorScheme}.png`) });
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    await widget.click();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 800 && bounds.y + bounds.height <= 600);
    await page.keyboard.press('Escape');
    const other = await context.newPage();
    await other.goto(server.resolvedUrls.local[0]);
    await other.evaluate(() => localStorage.setItem('lilt.room.plant', 'fern'));
    await page.waitForFunction(() => document.querySelector('.ds-plant svg')?.getAttribute('data-plant') === 'fern');
    await other.close(); await page.bringToFront();
    await page.evaluate(() => { location.hash = '/desk'; });
    await page.waitForFunction(() => document.querySelector('.ds-plant').disabled);
    await widget.evaluate(el => el.click());
    assert.equal(await dialog.count(), 0, 'hidden plant cannot open from the desk');
    await page.evaluate(() => { location.hash = '/'; });
    await page.locator('.room-stage.settled').waitFor();
    await widget.click();
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; });
    await dialog.getByRole('button', { name: 'Monstera', exact: true }).click();
    assert.match(await dialog.innerText(), /couldn't save/);
    assert.equal(await widget.locator('svg').getAttribute('data-plant'), 'monstera');
    assert.deepEqual(writes, [], 'plant choices never change practice data');
    assert.deepEqual(errors, []);
    console.log(`PASS ${colorScheme}: all plants at 0/3/7 days, saved choice, fixed footprint, keyboard, drag, reset, reduced motion, small screen, cross-tab sync and storage fallback`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
