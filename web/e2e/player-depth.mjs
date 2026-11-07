// Rendered occlusion checks, independent of owner data and the live app.
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Isolated player depth fixture' } }));
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('.room-chair-foreground').waitFor();
  const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
  const clip = (x, y, width, height) => ({ x: stage.x + x * scale, y: stage.y + y * scale, width: width * scale, height: height * scale });
  const sample = async () => {
    const png = await page.screenshot({ clip: clip(675, 516, 12, 4) });
    return page.evaluate(async encoded => {
      const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    }, png.toString('base64'));
  };
  const difference = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  const visibility = async (selector, hidden) => page.locator(selector).evaluateAll((els, hidden) => els.forEach(el => { el.style.visibility = hidden ? 'hidden' : ''; }), hidden);
  for (const light of ['day', 'morning', 'sunset', 'night']) {
    await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
    await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue('--room-' + light + '-opacity') === '1', light);
    for (const player of ['cassette', 'boombox', 'radio', 'turntable']) {
      await page.evaluate(async player => { const { choosePlayer } = await import('/src/room/playerState.ts'); choosePlayer(player); }, player);
      await page.waitForFunction(player => document.querySelector('.room-player-art')?.dataset.player === player, player);
      const composed = await sample();
      await visibility('.room-chair-foreground', true);
      const withoutChair = await sample();
      await visibility('.room-player-art, .room-player-shadow, .room-player-clear', true);
      const original = await sample();
      await visibility('.room-player-art, .room-player-shadow, .room-player-clear, .room-chair-foreground', false);
      assert.ok(difference(composed, original) < 4, `${light}/${player}: original chair pixels cover the player (${difference(composed, original).toFixed(2)})`);
      assert.ok(difference(withoutChair, original) > 8, `${light}/${player}: sampled chair region actually overlaps the device (${difference(withoutChair, original).toFixed(2)})`);
      if (shots) await page.screenshot({ path: path.join(shots, `${light}-${player}.png`), clip: clip(600, 385, 285, 210) });
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day' }); });
  for (const delay of [100, 400, 800]) {
    await page.waitForTimeout(delay);
    const fades = await page.evaluate(() => {
      const base = Array.from(document.querySelectorAll('.room-art')).map(el => Number(getComputedStyle(el).opacity));
      const front = Array.from(document.querySelectorAll('.room-chair-foreground img')).map(el => Number(getComputedStyle(el).opacity));
      return base.map((opacity, i) => Math.abs(opacity - front[i]));
    });
    assert.ok(fades.every(delta => delta < .02), 'chair and room lighting fades stay aligned');
  }
  for (const player of ['cassette', 'boombox', 'radio', 'turntable']) {
    await page.evaluate(async player => { const { choosePlayer } = await import('/src/room/playerState.ts'); choosePlayer(player); }, player);
    await page.waitForFunction(player => document.querySelector('.room-player-art')?.dataset.player === player, player);
    const body = page.locator('.room-player-art'), before = await body.boundingBox();
    await page.evaluate(async () => { const { radio } = await import('/src/desk/lofi.ts'); await radio.toggle(); });
    await page.waitForFunction(() => document.querySelector('.room-player-art').dataset.moving === 'true');
    await page.waitForTimeout(400);
    assert.deepEqual(await body.boundingBox(), before, `${player}: playback never moves the body off the desk`);
    await page.evaluate(async () => { const { radio } = await import('/src/desk/lofi.ts'); radio.pause(); });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: rendered chair occlusion for all four players in all four lights; player bodies stay fixed during playback.');
} finally { await browser?.close(); await server.close(); }
