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
    assert.equal(await page.locator('.tea-widget').count(), 0, 'floating cup is gone');
    const mug = page.getByRole('button', { name: 'Tea break', exact: true });
    const art = page.locator('.room-mug-art');
    const chosen = id => page.waitForFunction(id => document.querySelector('.room-mug-art')?.dataset.mug === id, id);
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}-${colorScheme}.png`) }); };
    await chosen('cream');
    assert.equal(await art.locator('.tea-steam').getAttribute('data-steam'), 'warm');
    assert.equal(await art.locator('.tea-steam').evaluate(el => getComputedStyle(el).opacity), '0.45');
    assert.equal(await mug.evaluate(el => !!el.closest('.fl')), false);
    await mug.click();
    const dialog = page.getByRole('dialog', { name: 'Tea break', exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('checkbox').isChecked(), false);
    assert.equal(await dialog.getByRole('button', { name: 'Cream stoneware' }).getAttribute('aria-pressed'), 'true');
    for (const [name, id] of [['Cream stoneware','cream'], ['Sage cup','sage'], ['Blue stripes','blue'], ['Sleepy cat','cat']]) {
      await dialog.getByRole('button', { name, exact: true }).click();
      await chosen(id);
      await page.keyboard.press('Escape'); await page.mouse.move(1400, 900); await mug.evaluate(el => el.blur());
      await shot(`mug-${id}`); await mug.click();
    }
    if (shots) await page.screenshot({ path: path.join(shots, `tea-picker-${colorScheme}.png`) });
    await dialog.getByRole('button', { name: '3 min', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start break', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.match(await mug.innerText(), /Tea break · 3:00/);
    assert.equal(await art.locator('.tea-steam').getAttribute('data-steam'), 'brewing');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')));
    assert.equal(saved.mug, 'cat');
    assert.equal(saved.minutes, 3);
    await page.reload();
    await page.locator('.room-stage.settled').waitFor();
    await chosen('cat');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt), saved.endsAt);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.tea')).endsAt), saved.endsAt);
    // A delayed interval must catch up to wall time, including time spent asleep.
    await page.clock.setFixedTime(saved.endsAt + 1000);
    await page.waitForTimeout(1200);
    assert.match(await mug.innerText(), /Whenever you're ready/);
    assert.equal(await art.locator('.tea-steam').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await art.locator('.tea-steam').getAttribute('data-steam'), 'settled');
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
    const home = await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.deepEqual(await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]), home);
    if (shots) await page.screenshot({ path: path.join(shots, `tea-room-${colorScheme}.png`) });
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(600);
    const shortcut = page.getByRole('button', { name: 'Tea', exact: true });
    await shortcut.click(); await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 800 && box.y + box.height <= 600);
    if (shots) await page.screenshot({ path: path.join(shots, `tea-small-${colorScheme}.png`) });
    await page.keyboard.press('Escape');
    assert.equal(await shortcut.evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await shortcut.click(); await dialog.waitFor(); await shot('tea-phone'); await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.waitForTimeout(500);
    // A second room can cancel a break without leaving this tab's timer stale.
    const other = await page.context().newPage();
    await other.goto(server.resolvedUrls.local[0]);
    await other.evaluate(() => localStorage.setItem('lilt.room.tea', JSON.stringify({ mug: 'sage', minutes: 5, endsAt: Date.now() + 300000 })));
    await chosen('sage');
    assert.match(await mug.innerText(), /Tea break ·/);
    await other.evaluate(() => localStorage.setItem('lilt.room.tea', JSON.stringify({ mug: 'sage', minutes: 5, endsAt: null })));
    await page.waitForFunction(() => document.querySelector('.room-mug-target').textContent === 'Tea break');
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
    await page.waitForFunction(() => document.querySelector('.room-mug-target').disabled);
    await page.locator('.room-mug-target').evaluate(el => el.click());
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
    await chosen('blue');
    for (const light of ['day', 'morning', 'sunset', 'night']) {
      await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
      await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue(`--room-${light}-opacity`) === '1', light);
      assert.equal(await art.evaluate(el => getComputedStyle(el).filter), await page.locator('.room-plant-art').evaluate(el => getComputedStyle(el).filter));
      await mug.evaluate(el => el.blur()); await page.mouse.move(1400, 900); await shot(`tea-${light}`);
    }
    assert.equal(await page.locator('.room-mug-clear img').count(), 4);
    assert.equal(await art.locator('.tea-steam path').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await art.locator('.tea-steam path').first().evaluate(el => getComputedStyle(el).animationName), 'tea-steam');
    const wisp = art.locator('.tea-steam path').first();
    const firstTransform = await wisp.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(450);
    assert.notEqual(await wisp.evaluate(el => getComputedStyle(el).transform), firstTransform, 'steam drifts over time');
    await shot('tea-animated');
    const transitions = await page.evaluate(() => ['img.room-art', '.room-mug-clear img', '.room-mug-art'].map(selector => {
      const s = getComputedStyle(document.querySelector(selector)); return [s.transitionDuration, s.transitionTimingFunction];
    }));
    assert.deepEqual(transitions, [['2s', 'ease'], ['2s', 'ease'], ['2s', 'ease']]);
    // Reload clears the storage-denial shim and decoded-image cache before simulating missing art.
    await page.route('**/room/mugs/blue.png', route => route.abort());
    await page.reload(); await chosen('sage'); await mug.click();
    await dialog.getByRole('button', { name: 'Blue stripes', exact: true }).click();
    await dialog.getByText(/Couldn't load this mug/).waitFor();
    assert.equal(await art.getAttribute('data-mug'), 'sage');
    await page.unroute('**/room/mugs/blue.png');
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('blue');
    await page.keyboard.press('Escape');
    await page.route('**/room/mugs/clear-day.png', route => route.abort()); await page.reload();
    await mug.click(); await dialog.getByText(/Couldn't load this mug/).waitFor();
    assert.equal(await art.count(), 0, 'first-load failure leaves original painted cup');
    assert.equal(await page.locator('img.room-art').count(), 4);
    await page.unroute('**/room/mugs/clear-day.png');
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('blue');
    assert.deepEqual(errors, []);
    console.log(`PASS ${colorScheme}: painted mugs, timer recovery, cancellation, fixed placement, keyboard, phone shortcut, cross-tab sync, clink, microphone suppression, lighting/steam, load/storage fallback`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
