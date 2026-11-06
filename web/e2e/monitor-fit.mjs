// Check the actual painted screen edges, independently of the implementation's corner constants.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const choose = async radio => { await radio.click(); await radio.page().waitForFunction(el => el.checked, await radio.elementHandle()); };
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
  await page.route('**/api/**', r => r.abort());
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/room-appearance.html`);
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await choose(page.getByRole('radio', { name: 'Night', exact: true }));
  await choose(page.getByRole('group', { name: 'Main monitor', exact: true }).getByRole('radio', { name: 'Sleepy cat', exact: true }));
  await choose(page.getByRole('group', { name: 'Side monitor', exact: true }).getByRole('radio', { name: 'Stars', exact: true }));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => [...document.querySelectorAll('.room-art, .room-monitor-art')].every(img => img.complete && img.naturalWidth));
  // A fixed close-up makes a two-pixel gap visible and keeps screenshots comparable.
  await page.locator('.room-stage').evaluate(el => el.style.transform = 'translate(-1660px, -600px) scale(2)');
  if (shots) await page.screenshot({ path: path.join(shots, 'monitor-fit-cat.png'), clip: { x: 30, y: 10, width: 1210, height: 440 } });
  assert.equal(await page.locator('.room-monitor-screen').first().evaluate(el => getComputedStyle(el).overflow), 'hidden');
  // Test image coverage without the blue screen-edge glow changing the sampled colors.
  await page.addStyleTag({ content: '.room-screen-light, .room-fx { visibility: hidden !important; }' });
  await page.locator('.room-monitor-art').evaluateAll(images => images.forEach(img => {
    const canvas = document.createElement('canvas'); canvas.width = 520; canvas.height = 300;
    const g = canvas.getContext('2d'); g.fillStyle = img.dataset.monitor === 'main' ? '#e02424' : '#2440d8'; g.fillRect(0, 0, 520, 300);
    img.removeAttribute('data-decor'); img.src = canvas.toDataURL();
  }));
  await page.locator('.room-monitor-art').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  const capture = (await page.screenshot(shots ? { path: path.join(shots, 'monitor-fit-coverage.png') } : {})).toString('base64');
  const samples = await page.evaluate(async capture => {
    const image = new Image(); image.src = `data:image/png;base64,${capture}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d'); g.drawImage(image, 0, 0);
    return [[1153, 322], [1148, 483], [1000, 476], [1170, 485], [1405, 505]].map(([x, y]) => [...g.getImageData(Math.round(x * 2 - 1660), Math.round(y * 2 - 600), 1, 1).data]);
  }, capture);
  samples.forEach(([r, g, b], i) => assert.ok(i < 3 ? r > 170 && g < 130 && b < 130 : b > 170 && r < 130, `screen edge ${i} is covered: ${r},${g},${b}`));
  assert.deepEqual(errors, []);
  console.log('PASS: both monitor overlays cover the painted right/bottom edges, and the cat crop stays clipped inside its screen.');
} finally { await browser?.close(); await server.close(); }
