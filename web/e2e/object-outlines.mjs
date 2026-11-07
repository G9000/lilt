import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2]; if (shots) await mkdir(shots, { recursive: true });
const server = await createIsolatedVite({ logLevel: 'error' }); await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let days = 0;
  await page.route('**/api/**', route => route.fulfill(new URL(route.request().url()).pathname === '/api/deck/today'
    ? { json: { counts: { new: 0, review: 0, again: 0 }, items: [], participation: { days_this_week: days } } }
    : { status: 503, json: {} }));
  await page.goto(server.resolvedUrls.local[0]);
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day' }); });
  const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
  const clip = (x, y, width, height) => ({ x: stage.x + x * scale, y: stage.y + y * scale, width: width * scale, height: height * scale });
  const pixels = png => page.evaluate(async encoded => {
    const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  }, png.toString('base64'));
  const groups = [
    { kind: 'mug', target: '.room-mug-target', ids: ['cream', 'sage', 'blue', 'cat'], key: 'lilt.room.tea', box: clip(800, 440, 105, 115) },
    { kind: 'plant', target: '.room-plant-target', ids: ['sprout', 'monstera', 'fern', 'succulent'], key: 'lilt.room.plant', box: clip(280, 355, 210, 380) },
    { kind: 'player', target: '.room-music', ids: ['cassette', 'boombox', 'radio', 'turntable'], box: clip(610, 380, 250, 185) },
  ];
  for (const { kind, target: selector, ids, key, box } of groups) {
    const target = page.locator(selector), outline = page.locator(`.room-${kind}-outline`);
    const visible = value => page.waitForFunction(({ kind, value }) => getComputedStyle(document.querySelector(`.room-${kind}-outline`)).opacity === String(value), { kind, value });
    for (const id of ids) {
      await page.evaluate(async ({ kind, id, key }) => {
        document.activeElement?.blur();
        if (kind === 'player') { const { choosePlayer } = await import('/src/room/playerState.ts'); choosePlayer(id); }
        else {
          const value = kind === 'mug' ? JSON.stringify({ mug: id, minutes: 5, endsAt: null }) : id;
          localStorage.setItem(key, value); window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
        }
      }, { kind, id, key });
      await page.waitForFunction(({ kind, id }) => document.querySelector(`.room-${kind}-art`)?.dataset[kind] === id, { kind, id });
      await page.mouse.move(10, 100); await visible(0);
      const before = await page.screenshot({ clip: box });
      const chairBefore = kind === 'player' ? await page.screenshot({ clip: clip(675, 516, 12, 4) }) : null;
      await target.hover(); await visible(1);
      assert.equal(await target.evaluate(el => getComputedStyle(el, '::before').display), 'none', `${kind}/${id}: no rectangular glow`);
      const after = await page.screenshot({ clip: box });
      assert.notDeepEqual(before, after, `${kind}/${id}: outline is actually rendered`);
      if (chairBefore) {
        const a = await pixels(chairBefore), b = await pixels(await page.screenshot({ clip: clip(675, 516, 12, 4) }));
        const difference = a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
        assert.ok(difference < 1, `${id}: chair covers the player outline (pixel difference ${difference})`);
      }
      if (shots) await page.screenshot({ path: path.join(shots, `${kind}-${id}.png`), clip: box });
      await page.mouse.move(10, 100); await visible(0);
      await target.focus(); await visible(1);
      assert.equal(await target.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor(); await visible(0);
      await page.keyboard.press('Escape');
      // Music restores its opener on the frame after the native dialog releases focus.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await visible(1);
      assert.equal(await target.evaluate(el => el === document.activeElement), true);
      assert.equal(await outline.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await target.evaluate(el => el.blur());
    }
  }
  assert.equal(await page.locator('.room-mug-outline .tea-steam, .room-player-outline .room-player-shadow').count(), 0);
  for (const count of [0, 3, 7]) {
    days = count; await page.reload(); await page.locator('.room-plant-art').waitFor();
    await page.waitForFunction(count => document.querySelector('.room-plant-art').dataset.days === String(count), count);
    assert.equal(await page.locator('.room-plant-canopy').evaluate(el => getComputedStyle(el).transform),
      await page.locator('.room-plant-outline-canopy').evaluate(el => getComputedStyle(el).transform), 'outline follows growing canopy');
    await page.locator('.room-plant-target').hover();
    if (shots) await page.screenshot({ path: path.join(shots, `growth-${count}.png`), clip: groups[1].box });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { kind } of groups) assert.equal(await page.locator(`.room-${kind}-outline`).evaluate(el => getComputedStyle(el).display), 'none');
  assert.deepEqual(errors, []);
  console.log('PASS: twelve rendered object outlines, hover/keyboard/dialog focus, chair occlusion, growing canopy, reduced motion and narrow screens.');
} finally { await browser?.close(); await server.close(); }
