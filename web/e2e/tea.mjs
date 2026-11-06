// Tea breaks use browser storage only, against a disposable Vite server and stubbed API.
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
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.context().route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const data = pathname === '/api/profile' ? { goal: { summary: 'A quiet moment.' } }
        : pathname === '/api/deck/today' ? { counts: { new: 0, review: 0, again: 0 }, items: [], participation: { days_this_week: 0 } }
        : pathname === '/api/texts' ? { levels: [] }
        : pathname === '/api/photos' ? { uploaded: [], hidden: [] } : null;
      return route.fulfill({ status: data ? 200 : 503, json: data ?? { error: 'Isolated tea fixture' } });
    });
    await page.goto(server.resolvedUrls.local[0]);
    await page.locator('.room-stage.settled').waitFor();
    const mug = page.getByRole('button', { name: 'Tea break', exact: true });
    await mug.click();
    const dialog = page.getByRole('dialog', { name: 'Tea break', exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('checkbox').isChecked(), false);
    assert.equal(await dialog.getByRole('button', { name: 'Cream stoneware' }).getAttribute('aria-pressed'), 'true');
    for (const [name, id] of [['Sage cup','sage'], ['Blue stripes','blue'], ['Sleepy cat','cat']]) {
      await dialog.getByRole('button', { name, exact: true }).click();
      assert.equal(await mug.locator('svg').getAttribute('data-mug'), id);
    }
    if (shots) await page.screenshot({ path: path.join(shots, `tea-picker-${colorScheme}.png`) });
    await dialog.getByRole('button', { name: '3 min', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.match(await mug.innerText(), /Tea break · 3:00/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')));
    assert.equal(saved.mug, 'cat');
    assert.equal(saved.minutes, 3);
    await page.reload();
    await page.locator('.room-stage.settled').waitFor();
    assert.equal(await mug.locator('svg').getAttribute('data-mug'), 'cat');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt), saved.endsAt);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt), saved.endsAt);
    // A delayed interval must catch up to wall time, including time spent asleep.
    await page.clock.setFixedTime(saved.endsAt + 1000);
    await page.waitForTimeout(1200);
    assert.match(await mug.innerText(), /Whenever you're ready/);
    assert.equal(await mug.locator('.tea-steam').evaluate(el => getComputedStyle(el).opacity), '0');
    await mug.click();
    await dialog.getByRole('button', { name: '10 min', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    await mug.click();
    await dialog.getByRole('button', { name: 'End break', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt), null);
    await mug.focus(); await page.keyboard.press('Enter');
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await mug.evaluate(el => el === document.activeElement), true);
    // Dragging moves the mug, without also opening its controls.
    const before = await mug.boundingBox();
    await page.mouse.move(before.x + 55, before.y + 75); await page.mouse.down();
    await page.mouse.move(before.x + 15, before.y + 110, { steps: 8 }); await page.mouse.up();
    assert.equal(await dialog.count(), 0);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('lilt.room.layout.cel-studio.2') ?? '{}').tea);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    await page.waitForTimeout(500);
    if (shots) await page.screenshot({ path: path.join(shots, `tea-room-${colorScheme}.png`) });
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(600);
    await mug.click(); await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 800 && box.y + box.height <= 600);
    if (shots) await page.screenshot({ path: path.join(shots, `tea-small-${colorScheme}.png`) });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.waitForTimeout(500);
    // A second room can cancel a break without leaving this tab's timer stale.
    const other = await page.context().newPage();
    await other.goto(server.resolvedUrls.local[0]);
    await other.evaluate(() => localStorage.setItem('lilt.room.tea', JSON.stringify({ mug: 'sage', minutes: 5, endsAt: Date.now() + 300000 })));
    await page.waitForFunction(() => document.querySelector('.tea-widget svg')?.getAttribute('data-mug') === 'sage');
    assert.match(await mug.innerText(), /Tea break ·/);
    await other.evaluate(() => localStorage.setItem('lilt.room.tea', JSON.stringify({ mug: 'sage', minutes: 5, endsAt: null })));
    await page.waitForFunction(() => document.querySelector('.tea-widget').textContent === 'Tea break');
    await other.close();
    await page.bringToFront();
    // Audio synthesis is observable without relying on speakers in a headless browser.
    await page.evaluate(() => {
      window.teaNotes = 0;
      const original = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) { window.teaNotes++; return original.apply(this, args); };
    });
    await mug.click();
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    const end = await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt);
    await page.clock.setFixedTime(end + 1000);
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => window.teaNotes), 2, 'one clink has two partials');
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => window.teaNotes), 2, 'completion does not ring again');
    await mug.click();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    await page.evaluate(async () => { const { claimMic } = await import('/src/micuse.ts'); window.releaseTeaMic = claimMic(); });
    const micEnd = await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt);
    await page.clock.setFixedTime(micEnd + 1000);
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => window.teaNotes), 2, 'recording suppresses the clink');
    await page.evaluate(() => window.releaseTeaMic());
    await mug.click();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    const sleptEnd = await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt);
    await page.clock.setFixedTime(sleptEnd + 60000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => window.teaNotes), 2, 'returning after suspension is quiet');
    await page.evaluate(() => { location.hash = '/desk'; });
    await page.waitForFunction(() => document.querySelector('.tea-widget').disabled);
    await page.locator('.tea-widget').evaluate(el => el.click());
    assert.equal(await dialog.count(), 0, 'hidden mug cannot open a dialog in practice');
    await page.evaluate(() => { location.hash = '/'; });
    await page.locator('.room-stage.settled').waitFor();
    await mug.click();
    await dialog.getByRole('checkbox').uncheck();
    // Storage denial still allows a local break and explains that it cannot survive reload.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; });
    await dialog.getByRole('button', { name: 'Blue stripes', exact: true }).click();
    assert.match(await dialog.innerText(), /couldn't save/);
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    assert.match(await mug.innerText(), /Tea break · 5:00/);
    assert.deepEqual(errors, []);
    console.log(`PASS ${colorScheme}: mugs, timer recovery, cancellation, reset, keyboard, drag, small screen, cross-tab sync, clink, microphone suppression and unavailable storage`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
