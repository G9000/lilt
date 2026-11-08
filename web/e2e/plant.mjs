// The actual floor plant is replaceable painted art, with no floating weekly tile.
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
    const target = page.locator('.room-plant-target'), art = page.locator('.room-plant-art');
    const dialog = page.getByRole('dialog', { name: 'Choose your plant', exact: true });
    const chosen = id => page.waitForFunction(id => document.querySelector('.room-plant-art')?.dataset.plant === id, id);
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}-${colorScheme}.png`) }); };
    await art.waitFor();
    assert.equal(await page.locator('.ds-plant').count(), 0, 'floating tile is gone');
    assert.equal(await target.evaluate(el => !!el.closest('.fl')), false);
    assert.match(await target.getAttribute('aria-label'), /A new week/);
    await target.click({ delay: 750 });
    for (const [name, id] of [['Ficus','sprout'], ['Monstera','monstera'], ['Fern','fern'], ['Jade plant','succulent']]) {
      await dialog.getByRole('button', { name, exact: true }).click(); await chosen(id);
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await shot(`room-${id}`); await target.click({ delay: 750 });
    }
    if (shots) await dialog.screenshot({ path: path.join(shots, `picker-${colorScheme}.png`) });
    await page.keyboard.press('Escape');
    assert.equal(await target.evaluate(el => el === document.activeElement), true);
    for (const count of [0, 3, 7]) {
      days = count; await page.reload(); await art.waitFor();
      assert.equal(await art.getAttribute('data-days'), String(count));
      assert.equal(await art.getAttribute('data-plant'), 'succulent');
      const scale = await art.locator('.room-plant-canopy').evaluate(el => Number(el.style.transform.match(/[\d.]+/)[0]));
      assert.ok(Math.abs(scale - (.9 + count / 70)) < .000001);
      assert.equal(await art.locator('img').first().evaluate(el => getComputedStyle(el).transform), 'none', 'pot stays fixed');
    }
    const home = await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.deepEqual(await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]), home);
    await target.focus(); await page.keyboard.press('Enter'); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Monstera', exact: true }).click(); await chosen('monstera'); await page.keyboard.press('Escape');
    for (const light of ['day','morning','sunset','night']) {
      await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
      await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue(`--room-${light}-opacity`) === '1', light);
      const brightness = await art.evaluate(el => getComputedStyle(el).filter);
      assert.ok(brightness.includes(light === 'night' ? '0.76' : light === 'sunset' ? '0.93' : light === 'morning' ? '0.94' : 'brightness(1)'));
      await shot(`room-${light}`);
    }
    assert.equal(await page.locator('.room-plant-clear img').count(), 4);
    assert.equal(await page.locator('img.room-art').count(), 4, 'original images remain outside plant region');
    await page.setViewportSize({ width: 800, height: 600 });
    await page.getByRole('button', { name: 'Plants', exact: true }).click(); await dialog.waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 800 && bounds.y + bounds.height <= 600);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Plants', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Plants', exact: true }).click(); await dialog.waitFor(); await shot('phone'); await page.keyboard.press('Escape');
    const other = await context.newPage(); await other.goto(server.resolvedUrls.local[0]);
    await other.evaluate(() => localStorage.setItem('lilt.room.plant', 'fern')); await chosen('fern');
    await other.close(); await page.bringToFront();
    await page.evaluate(() => { location.hash = '/desk'; });
    await page.waitForFunction(() => document.querySelector('.room-plant-target').disabled);
    await target.evaluate(el => el.click()); assert.equal(await dialog.count(), 0);
    await page.evaluate(() => { location.hash = '/'; });
    await page.route('**/room/plants/sprout.png', route => route.abort());
    // A fresh document avoids Blink's already-decoded image cache bypassing the failed request.
    await page.reload(); await chosen('fern');
    await page.getByRole('button', { name: 'Plants', exact: true }).click(); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Ficus', exact: true }).click();
    await dialog.getByText(/Couldn't load this plant/).waitFor();
    assert.equal(await art.getAttribute('data-plant'), 'fern', 'load failure keeps previous plant');
    await page.unroute('**/room/plants/sprout.png');
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('sprout');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; });
    await dialog.getByRole('button', { name: 'Monstera', exact: true }).click(); await chosen('monstera');
    assert.match(await dialog.innerText(), /couldn't save/);
    await page.keyboard.press('Escape');
    await page.route('**/room/plants/clear-day.png', route => route.abort());
    await page.reload();
    await page.getByRole('button', { name: 'Plants', exact: true }).click();
    await dialog.getByText(/Couldn't load this plant/).waitFor();
    assert.equal(await art.count(), 0, 'first-load failure preserves the original painted plant');
    assert.equal(await page.locator('img.room-art').count(), 4);
    await page.unroute('**/room/plants/clear-day.png');
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('sprout');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const transitions = await page.evaluate(() => ['img.room-art', '.room-plant-clear img', '.room-plant-art'].map(selector => {
      const s = getComputedStyle(document.querySelector(selector));
      return [s.transitionDuration, s.transitionTimingFunction];
    }));
    assert.deepEqual(transitions, [['2s', 'ease'], ['2s', 'ease'], ['2s', 'ease']]);
    await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day' }); });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-plant-art')).filter === 'brightness(1) saturate(1) sepia(0)');
    await shot('normal-motion');
    assert.deepEqual(writes, []); assert.deepEqual(errors, []);
    console.log(`PASS ${colorScheme}: painted plants, 0/3/7 growth, all lighting, fixed pot/location, picker, phone shortcut, persistence, keyboard and load/storage fallback`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
