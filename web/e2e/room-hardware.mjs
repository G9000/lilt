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
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(12000);
  const chosen = (kind, finish) => page.waitForFunction(({ kind, finish }) => document.querySelector(`.room-${kind}-art`)?.dataset.design === finish, { kind, finish });
  const ready = () => page.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  const groups = [['microphone', 'Microphone'], ['main-frame', 'Main monitor frame'], ['side-frame', 'Side monitor frame']];
  const finishes = [['black', 'Original black'], ['cream', 'Warm cream'], ['sage', 'Soft sage'], ['silver', 'Brushed silver']];
  await page.goto(server.resolvedUrls.local[0]); await ready();
  await page.evaluate(async () => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light: 'day', mainDecor: 'leaves', decor: 'stars' }); });
  const stage = await page.locator('.room-stage').boundingBox(), scale = stage.width / 1672;
  const clip = (x, y, width, height) => ({ x: stage.x + x * scale, y: stage.y + y * scale, width: width * scale, height: height * scale });
  for (const [kind, title] of groups) {
    const target = page.locator(`.room-${kind}-target`), outline = page.locator(`.room-${kind}-outline`);
    await target.click({ delay: 750, position: kind === 'microphone' ? { x: 190, y: 110 } : kind === 'main-frame' ? { x: 100, y: 10 } : { x: 110, y: 10 } });
    await page.getByRole('dialog', { name: title, exact: true }).waitFor(); await page.keyboard.press('Escape');
    await target.focus(); if (kind === 'microphone') await target.click({ delay: 750, position: { x: 190, y: 110 } }); else await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: title, exact: true }); await dialog.waitFor();
    const choices = kind === 'microphone' ? finishes : [['retro', 'Cream retro'], ['rounded', 'Sage rounded'], ['studio', 'Silver studio'], ...finishes];
    for (const [finish, label] of choices) {
      await dialog.getByRole('button', { name: label, exact: true }).click(); await chosen(kind, finish);
      assert.equal(await outline.evaluate(el => getComputedStyle(el).opacity), '0');
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      assert.equal(await target.evaluate(el => el === document.activeElement), true);
      assert.equal(await outline.evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await target.evaluate(el => getComputedStyle(el, '::before').display), 'none');
      if (shots) await page.screenshot({ path: path.join(shots, `${kind}-${finish}.png`), clip: clip(550, 205, 900, 370) });
      if (['retro', 'rounded', 'studio'].includes(finish)) {
        const corner = { retro: [866,330], rounded: [871,333], studio: [866,324] }[finish];
        for (const source of kind === 'main-frame' ? [[1149,400], corner] : [[1149,400]]) {
          const point = await page.evaluate(async ({ kind, source }) => {
            const { monitorProjection } = await import('/src/room/monitorModels.ts');
            const p = monitorProjection(kind === 'side-frame').transformPoint({ x: source[0], y: source[1] });
            const stage = document.querySelector('.room-stage').getBoundingClientRect(), scale = stage.width / 1672;
            return { x: stage.x + p.x / p.w * scale, y: stage.y + p.y / p.w * scale };
          }, { kind, source });
          await page.mouse.click(point.x, point.y, { delay: 750 }); await dialog.waitFor();
          assert.equal(await page.locator('.room').evaluate(el => el.classList.contains('inside')), false, 'thick bezel opens picker instead of entering the screen');
          await page.keyboard.press('Escape');
        }
      }
      if (kind === 'microphone') await target.click({ delay: 750, position: { x: 190, y: 110 } }); else await page.keyboard.press('Enter');
    }
    if (shots) await dialog.screenshot({ path: path.join(shots, `${kind}-picker.png`) });
    await page.keyboard.press('Escape');
  }
  await page.mouse.move(0, 0); await page.locator('.room-microphone-target').focus();
  const screenBefore = await page.screenshot({ clip: clip(900, 345, 160, 90) });
  await page.locator('.room-main-frame-art').evaluate(el => { el.style.visibility = 'hidden'; });
  assert.ok((await page.screenshot({ clip: clip(900, 345, 160, 90) })).equals(screenBefore), 'frame finish preserves screen media pixels');
  await page.locator('.room-main-frame-art').evaluate(el => { el.style.visibility = ''; });
  await page.reload(); await ready();
  for (const [kind] of groups) await chosen(kind, 'silver');
  for (const [kind, label] of [['main-frame', 'Cream retro'], ['side-frame', 'Sage rounded']]) {
    await page.locator(`.room-${kind}-target`).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: label, exact: true }).click();
    await chosen(kind, kind === 'main-frame' ? 'retro' : 'rounded'); await page.keyboard.press('Escape');
  }
  for (const light of ['morning', 'sunset', 'night']) {
    await page.evaluate(async light => { const { setRoomAppearance } = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
    if (shots) await page.screenshot({ path: path.join(shots, `hardware-${light}.png`), clip: clip(550, 205, 900, 370) });
  }
  await page.locator('.room-side-frame-target').focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Brushed silver', exact: true }).click(); await chosen('side-frame', 'silver'); await page.keyboard.press('Escape');
  // Both frame stores remain independent, including cross-tab changes.
  const other = await context.newPage(); await other.goto(server.resolvedUrls.local[0]);
  await other.evaluate(() => localStorage.setItem('lilt.room.main-frame', 'cream'));
  await chosen('main-frame', 'cream'); await chosen('side-frame', 'silver'); await other.close();
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click(); await chosen('main-frame', 'cream');
  // Failure retains the last composition, and retry can recover.
  const failedUrl = '**/room/hardware/microphone-sage.png';
  await page.route(failedUrl, route => route.abort());
  await page.locator('.room-microphone-target').click({ delay: 750, position: { x: 190, y: 110 } });
  await page.getByRole('button', { name: 'Soft sage', exact: true }).click();
  await page.getByRole('button', { name: 'Try again', exact: true }).waitFor(); await chosen('microphone', 'silver');
  await page.unroute(failedUrl); await page.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('microphone', 'sage');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    let release; const gate = new Promise(resolve => { release = resolve; });
    window.releaseHardwareDecode = () => { release(); HTMLImageElement.prototype.decode = decode; };
    HTMLImageElement.prototype.decode = async function() {
      await decode.call(this);
      if (this.src.endsWith('/hardware/frames-cream.png')) { window.hardwareDecodeHeld = true; await gate; }
    };
  });
  await page.locator('.room-side-frame-target').focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Warm cream', exact: true }).click(); await page.waitForFunction(() => window.hardwareDecodeHeld);
  assert.equal(await page.locator('.room-paint').evaluate(el => getComputedStyle(el).visibility), 'visible', 'later swaps keep room visible');
  await page.getByRole('button', { name: 'Soft sage', exact: true }).click(); await chosen('side-frame', 'sage');
  await page.evaluate(() => window.releaseHardwareDecode()); await page.waitForLoadState('networkidle'); await chosen('side-frame', 'sage');
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.restoreHardwareStorage = () => { Storage.prototype.setItem = set; };
    Storage.prototype.setItem = function(key, value) { if (key === 'lilt.room.side-frame') throw new Error('full'); return set.call(this, key, value); };
  });
  await page.getByRole('button', { name: 'Brushed silver', exact: true }).click(); await chosen('side-frame', 'silver');
  await page.getByText("Your choice changed here, but this browser couldn't save it for next time.", { exact: true }).waitFor();
  await page.evaluate(() => window.restoreHardwareStorage()); await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.locator('.room-microphone-target').click({ delay: 750, position: { x: 190, y: 110 } });
  if (shots) await page.getByRole('dialog', { name: 'Microphone', exact: true }).screenshot({ path: path.join(shots, 'microphone-picker-dark.png') });
  await page.keyboard.press('Escape');
  // Phone pickers stay in Make it yours; Practice remains a direct shortcut.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [, title] of groups) {
      await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
      await page.getByRole('button', { name: title, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: title, exact: true }), box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 844);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.room-appearance-trigger').evaluate(el => el === document.activeElement), true);
    }
  }
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.locator('.room-microphone-target').click({ delay: 750, position: { x: 190, y: 110 } }); await page.getByRole('dialog').getByRole('button', { name: 'Open Practice', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.room')?.classList.contains('inside'));
  await page.goto(server.resolvedUrls.local[0]); await ready(); await page.locator('.room-hit').click();
  await page.waitForFunction(() => document.querySelector('.room')?.classList.contains('inside'));
  assert.deepEqual(errors, []);
  await context.close();
  // Cold first reveal waits for the selected hardware, including delayed response decoding.
  const cold = await browser.newContext({ viewport: { width: 1600, height: 950 }, reducedMotion: 'reduce' });
  await cold.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await cold.addInitScript(() => localStorage.setItem('lilt.room.main-frame', 'retro'));
  let release; const gate = new Promise(resolve => { release = resolve; });
  await cold.route('**/room/hardware/monitor-retro.png', async route => { await gate; await route.continue(); });
  const coldPage = await cold.newPage(); await coldPage.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
  await coldPage.locator('.room-main-frame-target').waitFor({ state: 'attached' });
  assert.equal(await coldPage.locator('.room-paint').evaluate(el => getComputedStyle(el).visibility), 'hidden');
  release(); await coldPage.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  assert.equal(await coldPage.locator('.room-main-frame-art').getAttribute('data-design'), 'retro');
  const screenPoint = await coldPage.evaluate(() => {
    const stage = document.querySelector('.room-stage').getBoundingClientRect(), scale = stage.width / 1672;
    return { x: stage.x + 990 * scale, y: stage.y + 400 * scale };
  });
  await coldPage.mouse.click(screenPoint.x, screenPoint.y);
  await coldPage.waitForFunction(() => document.querySelector('.room')?.classList.contains('inside'));
  await cold.route('**/room/hardware/monitor-retro.png', route => route.abort());
  await coldPage.goto(server.resolvedUrls.local[0]);
  await coldPage.waitForFunction(() => document.querySelector('.room-paint')?.dataset.ready === 'true');
  assert.equal(await coldPage.locator('.room-main-frame-art').count(), 0, 'failed saved model reveals original artwork');
  await coldPage.locator('.room-main-frame-target').focus(); await coldPage.keyboard.press('Enter');
  await coldPage.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  await cold.close();
  console.log('Room hardware passed: 18 choices, pointer/keyboard outlines, media, saved choices, retry/stale loads, storage errors, phone, entry and cold reveal.');
} finally { await browser?.close(); await server.close(); }
