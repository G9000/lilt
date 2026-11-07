import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shots = process.argv[2]; if (shots) await mkdir(shots, { recursive: true });
const server = await createIsolatedVite({ logLevel: 'error' }); await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme, reducedMotion: 'reduce' });
    const errors = [], writes = [];
    await context.route('https://**/*', route => route.abort());
    await context.route('**/api/**', route => {
      if (route.request().method() !== 'GET') writes.push(route.request().url());
      return route.fulfill({ status: 503, json: {} });
    });
    await context.addInitScript(() => { window.supportOpened = []; window.open = url => { window.supportOpened.push(url); return null; }; });
    const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    const chosen = (kind, id) => page.waitForFunction(({ kind, id }) => document.querySelector(`.room-${kind}-art`)?.dataset.design === id, { kind, id });
    const groups = [
      ['coffee', 'Choose your drink', ['Iced latte', 'Cold brew', 'Iced matcha', 'Strawberry milk'], ['latte', 'coldbrew', 'matcha', 'strawberry']],
      ['camera', 'Choose your camera', ['Classic black', 'Silver film', 'Cream instant', 'Sage compact'], ['black', 'silver', 'instant', 'sage']],
    ];
    await chosen('coffee', 'coffee-latte'); await chosen('camera', 'camera-black');
    const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
    const crop = { x: stage.x + 1130 * scale, y: stage.y + 440 * scale, width: 255 * scale, height: 178 * scale };
    for (const [kind, title, names, ids] of groups) {
      const target = page.locator(`.room-${kind}-target`), outline = page.locator(`.room-${kind}-outline`), dialog = page.getByRole('dialog', { name: title });
      await target.focus(); await page.keyboard.press('Enter'); await dialog.waitFor();
      for (let i = 0; i < ids.length; i++) {
        const id = `${kind}-${ids[i]}`;
        await dialog.getByRole('button', { name: names[i], exact: true }).click(); await chosen(kind, id);
        assert.equal(await outline.evaluate(el => getComputedStyle(el).opacity), '0');
        await dialog.getByRole('button', { name: 'Done', exact: true }).click();
        assert.equal(await target.evaluate(el => el === document.activeElement), true);
        assert.equal(await outline.evaluate(el => getComputedStyle(el).opacity), '1');
        assert.equal(await outline.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
        assert.equal(await target.evaluate(el => getComputedStyle(el, '::before').display), 'none');
        assert.equal(await page.evaluate(() => location.hash), '', 'choosing art does not navigate');
        assert.deepEqual(await page.evaluate(() => window.supportOpened), []);
        const art = page.locator(`.room-${kind}-art`);
        const bottom = await art.evaluate(el => parseFloat(el.style.top) + parseFloat(el.style.height));
        assert.ok(Math.abs(bottom - (kind === 'coffee' ? 574 : 590)) < .01, 'stable tabletop baseline');
        if (shots) await page.screenshot({ path: path.join(shots, `${id}-${colorScheme}.png`), clip: crop });
        await target.click(kind === 'camera' ? { position: { x: 50, y: 15 } } : {});
      }
      if (shots) await dialog.screenshot({ path: path.join(shots, `${kind}-picker-${colorScheme}.png`) });
      await page.keyboard.press('Escape');
      const selected = `${kind}-${ids.at(-1)}`;
      await page.reload(); await chosen(kind, selected);
      await page.getByRole('button', { name: 'Reset layout', exact: true }).click(); await chosen(kind, selected);
    }
    for (const light of ['day', 'morning', 'sunset', 'night']) {
      await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
      await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue(`--room-${light}-opacity`) === '1', light);
      for (const kind of ['coffee', 'camera']) {
        assert.equal(await page.locator(`.room-${kind}-clear img`).count(), 4);
        assert.equal(await page.locator(`.room-${kind}-clear img`).nth(['day','morning','sunset','night'].indexOf(light)).evaluate(el => getComputedStyle(el).opacity), '1');
      }
      if (shots) await page.screenshot({ path: path.join(shots, `lighting-${light}-${colorScheme}.png`), clip: crop });
    }
    await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ decor: 'stars' }); });
    await page.locator('.room-monitor-art[data-monitor="side"]').evaluate(image => image.decode());
    const screenClip = { x: stage.x + 1178 * scale, y: stage.y + 476 * scale, width: 6 * scale, height: 6 * scale };
    const screenBefore = await page.screenshot({ clip: screenClip });
    await page.locator('.room-coffee-clear').evaluate(el => { el.style.visibility = 'hidden'; });
    assert.deepEqual(await page.screenshot({ clip: screenClip }), screenBefore, 'the desk repair stays beneath the chosen monitor picture');
    await page.locator('.room-coffee-clear').evaluate(el => { el.style.visibility = ''; });
    await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ decor: 'original' }); });
    await page.locator('.room-camera-target').click({ position: { x: 50, y: 15 } });
    await page.getByRole('dialog').getByRole('link', { name: 'Open Photos' }).click();
    await page.waitForFunction(() => location.hash === '#/photos');
    await page.goto(server.resolvedUrls.local[0]); await chosen('coffee', 'coffee-strawberry');
    await page.locator('.room-coffee-target').click();
    const support = page.getByRole('link', { name: 'Buy me a coffee', exact: true });
    assert.equal(await support.getAttribute('target'), '_blank'); assert.match(await support.getAttribute('rel'), /noopener/);
    await support.click(); await page.waitForFunction(() => window.supportOpened.length === 1);
    assert.deepEqual(await page.evaluate(() => window.supportOpened), ['https://buymeacoffee.com/animaos']);
    // Use a same-origin surrogate to exercise native modifier-click without a remote tab.
    const supportFixture = new URL('__support-fixture', server.resolvedUrls.local[0]).href;
    await context.route('**/__support-fixture', route => route.fulfill({ contentType: 'text/html', body: '<title>Local support fixture</title>' }));
    await page.locator('.room-coffee-target').click();
    await page.getByRole('link', { name: 'Buy me a coffee', exact: true }).evaluate((link, href) => { link.href = href; }, supportFixture);
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Buy me a coffee', exact: true }).click({ modifiers: ['Control'] });
    const popup = await popupPromise; await popup.waitForURL(supportFixture);
    assert.equal(popup.url(), supportFixture); await popup.close();
    assert.equal(await page.evaluate(() => window.supportOpened.length), 1, 'modifier-click does not schedule a second opening');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const shortcuts = page.getByRole('group', { name: 'Room shortcuts' });
      const bounds = await shortcuts.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      for (const [kind, title] of groups) {
        const shortcut = page.locator(`.room-${kind}-shortcut`); const box = await shortcut.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44);
        await shortcut.click(); const dialog = page.getByRole('dialog', { name: title }); const rect = await dialog.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y >= 0 && rect.y + rect.height <= 844);
        await page.keyboard.press('Escape'); assert.equal(await shortcut.evaluate(el => el === document.activeElement), true);
      }
      if (shots) await page.screenshot({ path: path.join(shots, `phone-${width}-${colorScheme}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 950 });
    const other = await context.newPage(); await other.goto(server.resolvedUrls.local[0]);
    await other.evaluate(() => { localStorage.setItem('lilt.room.coffee', 'coffee-matcha'); localStorage.setItem('lilt.room.camera', 'camera-black'); });
    await chosen('coffee', 'coffee-matcha'); await chosen('camera', 'camera-black'); await other.close();
    // A fresh document ensures the failed request cannot use an already-decoded image.
    await page.route('**/room/props/camera-sage.png', route => route.abort()); await page.reload(); await chosen('camera', 'camera-black');
    await page.locator('.room-camera-target').click({ position: { x: 50, y: 15 } }); await page.getByRole('button', { name: 'Sage compact', exact: true }).click();
    await page.getByText(/Couldn't load this camera/).waitFor(); await chosen('camera', 'camera-black');
    await page.unroute('**/room/props/camera-sage.png'); await page.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('camera', 'camera-sage');
    await page.keyboard.press('Escape');
    // Late image completions cannot overwrite a newer selection.
    await page.reload(); await chosen('camera', 'camera-sage');
    let release, reached; const requested = new Promise(resolve => { reached = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/room/props/camera-silver.png', async route => { reached(); await gate; await route.fulfill({ path: fileURLToPath(new URL('../public/room/props/camera-silver.png', import.meta.url)) }); });
    await page.locator('.room-camera-target').click({ position: { x: 50, y: 15 } }); await requested;
    await page.getByRole('button', { name: 'Silver film', exact: true }).click();
    await page.getByRole('button', { name: 'Cream instant', exact: true }).click(); await chosen('camera', 'camera-instant');
    release(); await page.unroute('**/room/props/camera-silver.png');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await chosen('camera', 'camera-instant');
    await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'lilt.room.camera') throw new Error('fixture denied'); return set.call(this, key, value); }; });
    await page.getByRole('button', { name: 'Classic black', exact: true }).click(); await chosen('camera', 'camera-black');
    await page.getByText(/couldn't save it for next time/).waitFor();
    await page.keyboard.press('Escape');
    // No half-painted replacement appears when an initial background layer is missing.
    await page.route('**/room/props/clear-sunset.png', route => route.abort()); await page.reload();
    await page.locator('.room-coffee-target').click(); await page.getByText(/Couldn't load this drink/).waitFor();
    assert.equal(await page.locator('.room-coffee-art, .room-camera-art, .room-coffee-clear, .room-camera-clear').count(), 0);
    assert.equal(await page.locator('.room-coffee-target').getAttribute('data-outlined'), 'false');
    await page.unroute('**/room/props/clear-sunset.png'); await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await chosen('coffee', 'coffee-matcha'); await page.keyboard.press('Escape');
    await page.locator('.room-camera-target').click({ position: { x: 50, y: 15 } });
    await page.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('camera', 'camera-instant');
    // A picker opened from the artwork restores the visible shortcut after a resize.
    await page.setViewportSize({ width: 390, height: 844 }); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.room-camera-shortcut').evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.evaluate(() => { location.hash = '/desk'; });
    await page.waitForFunction(() => document.querySelector('.room-camera-target').disabled);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log(`PASS ${colorScheme}: eight choices, fixed placement, outlines, four lights, Photos/support actions, saved choices, keyboard/phone, cross-tab sync, failed/stale loads and storage fallback.`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
