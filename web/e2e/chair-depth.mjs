import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';

const server = await createIsolatedVite({ logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('.room-player-art').waitFor();
  const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
  const pixels = async (x, y) => {
    const png = await page.screenshot({ clip: { x: stage.x + x * scale, y: stage.y + y * scale, width: 3, height: 3 } });
    return page.evaluate(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    }, png.toString('base64'));
  };
  const difference = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  const hide = async (selector, hidden) => page.locator(selector).evaluateAll((els, hidden) => els.forEach(el => el.style.visibility = hidden ? 'hidden' : ''), hidden);
  for (const chair of ['cream', 'sage', 'cane']) {
    await page.evaluate(async id => { const { chooseChair } = await import('/src/room/chairState.ts'); chooseChair(id); }, chair);
    await page.waitForFunction(id => document.querySelector('.room-chair-art')?.dataset.chair === id, chair);
    const bedPoint = await page.evaluate(async () => {
      const art = document.querySelector('.room-chair-art');
      const bed = new Image(); bed.src = '/room/chair/bed-foreground.png'; await bed.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1672; canvas.height = 941;
      const ctx = canvas.getContext('2d'); ctx.drawImage(art, 0, 0, 1672, 941);
      const a = ctx.getImageData(0, 0, 1672, 941).data;
      ctx.clearRect(0, 0, 1672, 941); ctx.drawImage(bed, 0, 0, 1672, 941);
      const b = ctx.getImageData(0, 0, 1672, 941).data;
      for (let y = 860; y < 930; y += 4) for (let x = 600; x < 940; x += 4) {
        const opaque = [0, 1, 2, 3].every(dy => [0, 1, 2, 3].every(dx => a[((y + dy) * 1672 + x + dx) * 4 + 3] > 250 && b[((y + dy) * 1672 + x + dx) * 4 + 3] > 250));
        if (opaque) return { x, y };
      }
      return null;
    });
    assert.ok(bedPoint, `${chair}: generated chair intersects foreground bedding`);
    for (const light of ['day', 'morning', 'sunset', 'night']) {
      await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
      await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue('--room-' + light + '-opacity') === '1', light);
      for (const player of ['cassette', 'boombox', 'radio', 'turntable']) {
        await page.evaluate(async id => { const { choosePlayer } = await import('/src/room/playerState.ts'); choosePlayer(id); }, player);
        await page.waitForFunction(id => document.querySelector('.room-player-art')?.dataset.player === id, player);
        const composed = await pixels(675, 520);
        await hide('.room-player-art', true); const withoutPlayer = await pixels(675, 520); await hide('.room-player-art', false);
        await hide('.room-chair-art', true); const withoutChair = await pixels(675, 520); await hide('.room-chair-art', false);
        assert.ok(difference(composed, withoutPlayer) < 4, `${chair}/${light}/${player}: chair covers player`);
        assert.ok(difference(composed, withoutChair) > 4, `${chair}/${light}/${player}: sample intersects chair silhouette`);
      }
      const composedBed = await pixels(bedPoint.x, bedPoint.y);
      await hide('.room-chair-art', true); const withoutChair = await pixels(bedPoint.x, bedPoint.y); await hide('.room-chair-art', false);
      await hide('.room-chair-bed', true); const withoutBed = await pixels(bedPoint.x, bedPoint.y); await hide('.room-chair-bed', false);
      assert.ok(difference(composedBed, withoutChair) < 4, `${chair}/${light}: bed covers chair wheels`);
      assert.ok(difference(composedBed, withoutBed) > 4, `${chair}/${light}: actual rendered bed occlusion`);
    }
  }
  // A failed player must not disable the selected chair.
  await page.route('**/room/players/clear-day.png', route => route.abort());
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.room-chair-art')?.dataset.chair === 'cane');
  assert.equal(await page.locator('.room-player-art').count(), 0);
  console.log('PASS: rendered chair/player overlap in 48 combinations, bed occlusion in 12 scenes, and independent chair loading when player artwork fails.');
} finally { await browser?.close(); await server.close(); }
