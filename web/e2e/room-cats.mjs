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
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, reducedMotion: 'reduce' });
  await context.route('https://**/*', route => route.abort());
  await context.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await context.addInitScript(() => {
    window.petHearts = 0;
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function(...args) {
      if (this.canvas.classList.contains('room-fx') && this.fillStyle === '#ff7eb6') window.petHearts++;
      return fill.apply(this, args);
    };
  });
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(12000);
  const ready = () => page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  const shown = id => page.waitForFunction(id => document.querySelector('.room-fx')?.dataset.cat === id, id);
  const open = async () => {
    await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
    await page.locator('.room-appearance').getByRole('button', { name: 'Choose your cat', exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose your cat', exact: true }).waitFor();
  };
  const dialog = page.getByRole('dialog', { name: 'Choose your cat', exact: true });
  await page.goto(server.resolvedUrls.local[0]); await ready(); await shown('original');
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day' }); });
  const crop = await page.evaluate(() => {
    const s = document.querySelector('.room-stage').getBoundingClientRect(), scale = s.width / 1672;
    return { x: Math.max(0, s.x + 65 * scale), y: s.y + 675 * scale, width: 365 * scale, height: 190 * scale };
  });
  const samples = new Set();
  for (const [id, name] of [['original','Sleepy black & white'],['ginger','Ginger tabby'],['siamese','Siamese'],['white','Fluffy white'],['dilute-tuxedo','Dilute tuxedo']]) {
    await open(); await dialog.getByRole('button', { name, exact: true }).click(); await shown(id);
    assert.equal(await dialog.getByRole('button', { name, exact: true }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.room-appearance-trigger').evaluate(el => el === document.activeElement), true);
    samples.add(await page.locator('.room-fx').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(110,710,220,100).data;
      return Array.from(data).reduce((sum, value, index) => (sum + value * (index % 17 + 1)) >>> 0, 0);
    }));
    if (shots) await page.screenshot({ path: path.join(shots, `cat-${id}.png`), clip: crop });
    const point = await page.evaluate(() => {
      const s = document.querySelector('.room-stage').getBoundingClientRect(), scale = s.width / 1672;
      return { x: s.x + 250 * scale, y: s.y + 770 * scale };
    });
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-cat-outline')).opacity === '1');
    assert.equal(await page.locator('.room-cat-outline img').getAttribute('src').then(src => src.endsWith(id === 'original' ? '/room/cat-v2.webp' : `/room/cats/${id}.png`)), true);
    if (shots) await page.screenshot({ path: path.join(shots, `cat-outline-${id}.png`), clip: crop });
    await page.mouse.click(point.x, point.y);
    await dialog.waitFor();
    assert.equal(await page.locator('.room-cat-target').getAttribute('aria-expanded'), 'true');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-cat-outline')).opacity === '0');
    await dialog.getByRole('button', { name: 'Pet the cat', exact: true }).click();
    await page.waitForFunction(() => /purr|prrrr|mrrp!|happy cat noises/.test(document.querySelector('.room-bubble')?.textContent ?? ''));
    assert.equal(await dialog.count(), 0, 'petting closes the picker to show the cat');
    assert.equal(await page.locator('.room-cat-target').evaluate(el => el === document.activeElement), true);
    await page.mouse.move(800, 100);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.room-cat-outline')).opacity === '1');
    await page.keyboard.press('Enter'); await dialog.waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.room-cat-target').evaluate(el => el === document.activeElement), true);
  }
  assert.equal(samples.size, 5, 'each choice paints different cat pixels');
  assert.equal(await page.evaluate(() => window.petHearts), 0, 'reduced motion never leaves frozen pet hearts on the canvas');
  await page.reload(); await ready(); await shown('dilute-tuxedo');
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click(); await shown('dilute-tuxedo');
  for (const light of ['morning','sunset','night']) {
    await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
    await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue(`--room-${light}-opacity`) === '1', light);
    if (shots) await page.screenshot({ path: path.join(shots, `dilute-tuxedo-${light}.png`), clip: crop });
  }
  await page.emulateMedia({ colorScheme: 'dark' }); await open();
  if (shots) await dialog.screenshot({ path: path.join(shots, 'cat-picker-dark.png') });
  await page.keyboard.press('Escape');
  for (const width of [320,390]) {
    await page.setViewportSize({ width, height: 844 }); await open();
    const box = await dialog.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 844);
    await dialog.getByRole('button', { name: 'Dilute tuxedo', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.room-appearance-trigger').evaluate(el => el === document.activeElement), true);
  }
  await page.setViewportSize({ width: 1600, height: 950 });
  const other = await context.newPage(); await other.goto(server.resolvedUrls.local[0]);
  await other.evaluate(() => localStorage.setItem('lilt.room.cat', 'ginger')); await shown('ginger'); await other.close();
  // Delay decoding even when a preview has already put the image in the memory cache.
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    let release; const gate = new Promise(resolve => { release = resolve; });
    window.releaseCat = () => { release(); HTMLImageElement.prototype.decode = decode; };
    HTMLImageElement.prototype.decode = async function() { await decode.call(this); if (this.src.endsWith('/cats/siamese.png')) { window.catHeld = true; await gate; } };
  });
  await open(); await dialog.getByRole('button', { name: 'Siamese', exact: true }).click(); await page.waitForFunction(() => window.catHeld);
  await shown('ginger'); assert.equal(await page.locator('.room-paint').getAttribute('data-ready'), 'true');
  await dialog.getByRole('button', { name: 'Fluffy white', exact: true }).click(); await shown('white');
  await page.evaluate(() => window.releaseCat()); await page.waitForLoadState('networkidle'); await shown('white');
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode, set = Storage.prototype.setItem;
    window.restoreCat = () => { HTMLImageElement.prototype.decode = decode; Storage.prototype.setItem = set; };
    HTMLImageElement.prototype.decode = function() { return this.src.endsWith('/cats/ginger.png') ? Promise.reject(new Error('unavailable')) : decode.call(this); };
    Storage.prototype.setItem = function(key, value) { if (key === 'lilt.room.cat') throw new Error('full'); return set.call(this, key, value); };
  });
  await dialog.getByRole('button', { name: 'Ginger tabby', exact: true }).click(); await dialog.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  await shown('white'); await dialog.getByText("Your cat changed here, but this browser couldn't save the choice for next time.", { exact: true }).waitFor();
  await page.evaluate(() => window.restoreCat()); await dialog.getByRole('button', { name: 'Try again', exact: true }).click(); await shown('ginger');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []); await context.close();

  const cold = await browser.newContext({ viewport: { width: 1600, height: 950 }, reducedMotion: 'reduce' });
  await cold.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await cold.addInitScript(() => localStorage.setItem('lilt.room.cat', 'dilute-tuxedo'));
  let release; const gate = new Promise(resolve => { release = resolve; });
  await cold.route('**/room/cats/dilute-tuxedo.png', async route => { await gate; await route.continue(); });
  const coldPage = await cold.newPage(); await coldPage.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
  await coldPage.locator('.room-fx').waitFor({ state: 'attached' });
  assert.equal(await coldPage.locator('.room-paint').evaluate(el => getComputedStyle(el).visibility), 'hidden');
  release(); await coldPage.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  assert.equal(await coldPage.locator('.room-fx').getAttribute('data-cat'), 'dilute-tuxedo');
  await cold.route('**/room/cats/dilute-tuxedo.png', route => route.abort()); await coldPage.reload();
  await coldPage.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  assert.equal(await coldPage.locator('.room-fx').getAttribute('data-cat'), 'original', 'failed saved cat falls back to original');
  await cold.route('**/room/cat-v2.webp', route => route.abort()); await coldPage.reload();
  await coldPage.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  assert.equal(await coldPage.locator('.room-fx').getAttribute('data-cat'), 'none', 'missing all cat art cannot block the room');
  await cold.close();
  const moving = await browser.newContext({ viewport: { width: 1600, height: 950 }, reducedMotion: 'no-preference' });
  await moving.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await moving.addInitScript(() => {
    localStorage.setItem('lilt.room.cat', 'dilute-tuxedo'); window.catTransforms = [];
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
      if (this.canvas.classList.contains('room-fx') && image instanceof HTMLImageElement && image.src.endsWith('/cats/dilute-tuxedo.png')) {
        const m = this.getTransform(), outline = document.querySelector('.room-cat-contour');
        const contour = outline ? new DOMMatrix(getComputedStyle(outline).transform) : null;
        window.catTransforms.push({ a: m.a, d: m.d, b: m.b, c: m.c, baseline: m.d * 846 + m.f, box: args,
          outlineMatches: !!contour && Math.abs(contour.a - m.a) < .00001 && Math.abs(contour.d - m.d) < .00001 });
      }
      return draw.call(this, image, ...args);
    };
  });
  const movingPage = await moving.newPage(); await movingPage.goto(server.resolvedUrls.local[0]);
  await movingPage.waitForFunction(() => new Set(window.catTransforms.map(m => m.d)).size > 2);
  assert.equal(await movingPage.evaluate(() => window.catTransforms.every(m => Math.abs(m.baseline - 846) < .001 && m.b === 0 && m.c === 0 && JSON.stringify(m.box) === '[80,689,330,165]')), true, 'breathing stays anchored without rotating or separating the cat');
  assert.equal(await movingPage.evaluate(() => window.catTransforms.every(m => m.outlineMatches)), true, 'outline tracks the same breathing scale on every painted frame');
  await moving.close();
  console.log('Room cats passed: five rendered choices and outlines, click/keyboard picker, petting, lights, phone, persistence, cross-tab, stale/failed loads, storage errors, retry and cold reveal.');
} finally { await browser?.close(); await server.close(); }
