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
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto(server.resolvedUrls.local[0]); await page.locator('.room-chair-target').waitFor();
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day' }); });
  const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
  const position = (x, y) => ({ x: stage.x + x * scale, y: stage.y + y * scale });
  const move = async (x, y) => { const p = position(x, y); await page.mouse.move(p.x, p.y); };
  const target = page.locator('.room-chair-target'), outline = page.locator('.room-chair-outline');
  const visible = async value => page.waitForFunction(value => document.querySelector('.room-chair-outline').dataset.visible === String(value), value);
  for (const id of ['original', 'cream', 'sage', 'cane']) {
    await page.evaluate(async id => { const { chooseChair } = await import('/src/room/chairState.ts'); chooseChair(id); document.activeElement?.blur(); }, id);
    await page.waitForFunction(id => document.querySelector('.room-chair-outline').dataset.chair === id, id);
    await move(490, 470); await visible(false);
    assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.classList.contains('room-chair-target'), position(490, 470)), false, `${id}: transparent corner is not a hit target`);
    const clip = { ...position(665, 635), width: 8, height: 8 };
    const before = await page.screenshot({ clip });
    await move(680, 650); await visible(true);
    assert.equal(await target.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await target.evaluate(el => getComputedStyle(el, '::before').content), 'none', 'no radial hotspot');
    const after = await page.screenshot({ clip });
    assert.deepEqual(before, after, `${id}: chair interior is not brightened`);
    if (shots) await page.screenshot({ path: path.join(shots, `${id}-outline.png`), clip: { ...position(480, 445), width: 590 * scale, height: 480 * scale } });
    // Use the actual painted asset, independently of the generated hit path, to find the arm and an opening.
    const points = await page.evaluate(async id => {
      const image = new Image(); image.src = `/room/chair/${id === 'original' ? 'foreground' : id}.png`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1672; canvas.height = 941;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 1672, 941);
      const data = ctx.getImageData(0, 0, 1672, 941).data;
      const solid = (x, y) => data[(y * 1672 + x) * 4 + 3];
      let arm, opening;
      for (let y = 645; y < 685; y += 3) for (let x = 940; x < 990; x += 3) if (!arm && solid(x, y) > 250 && solid(x - 4, y - 4) > 250 && solid(x + 4, y + 4) > 250) arm = { x, y };
      for (let y = 690; y < 725; y += 3) for (let x = 850; x < 920; x += 3) if (!opening && [-6, -3, 0, 3, 6].every(dy => [-6, -3, 0, 3, 6].every(dx => solid(x + dx, y + dy) === 0))) opening = { x, y };
      return { arm, opening };
    }, id);
    assert.ok(points.arm, `${id}: an exposed arm exists`);
    await move(points.arm.x, points.arm.y); await visible(true);
    await page.mouse.click(position(points.arm.x, points.arm.y).x, position(points.arm.x, points.arm.y).y, { delay: 750 });
    await page.getByRole('dialog', { name: 'Choose your chair' }).waitFor(); await visible(false);
    await page.keyboard.press('Escape'); await visible(true);
    await target.evaluate(el => el.blur());
    if (points.opening) { await move(points.opening.x, points.opening.y); await visible(false); }
    await move(490, 470); await target.focus(); await visible(true);
    await page.keyboard.press('Enter'); await page.getByRole('dialog', { name: 'Choose your chair' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await outline.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  }
  console.log('PASS: four silhouette outlines, transparent interiors, shape-aware arm hits/openings, keyboard focus, dialog controls and reduced motion.');
} finally { await browser?.close(); await server.close(); }
