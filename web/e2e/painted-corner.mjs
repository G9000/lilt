// Runs without a backend; opening this preview must never touch practice data.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
const sketch = process.env.CORNER_STYLE === 'sketch';
const route = sketch ? '#/sketched-corner' : '#/painted-corner';
const style = sketch ? 'sketch' : 'painted';
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => {
    window.cornerDraws = 0;
    for (const method of ['drawElements', 'drawArrays']) {
      const draw = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function(...args) { window.cornerDraws++; return draw.apply(this, args); };
    }
  });
  const errors = [], api = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', r => { api.push(r.request().url()); return r.abort(); });
  await page.goto(`${server.resolvedUrls.local[0]}${route}`);
  await page.getByRole('heading', { name: 'A quiet corner' }).waitFor({ timeout: 10000 });
  const canvas = page.getByLabel('Painted room. Drag to look around; arrow keys to turn, plus and minus to zoom.');
  const sceneShot = () => canvas.screenshot({ style: '.pc-header, .pc-bottom { visibility: hidden !important; }' });
  const pixelDifference = (a, b) => page.evaluate(async ([a, b]) => {
    const pixels = async base64 => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const surface = document.createElement('canvas'); surface.width = image.width; surface.height = image.height;
      const ctx = surface.getContext('2d'); ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, image.width, image.height).data;
    };
    const x = await pixels(a), y = await pixels(b); let different = 0;
    for (let i = 0; i < x.length; i += 4) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 6) different++;
    return different / (x.length / 4);
  }, [a.toString('base64'), b.toString('base64')]);
  await page.locator('[data-ready="true"]').waitFor();
  const startingStyle = await sceneShot();
  await page.getByRole('link', { name: sketch ? 'Summer paint' : 'Warm sketch', exact: true }).click();
  await page.locator(`.pc[data-style="${sketch ? 'painted' : 'sketch'}"][data-ready="true"]`).waitFor();
  assert.ok(await pixelDifference(await sceneShot(), startingStyle) > 0.2, 'styles change the actual scene appearance');
  await page.getByRole('link', { name: sketch ? 'Warm sketch' : 'Summer paint', exact: true }).click();
  await page.locator(`.pc[data-style="${style}"][data-ready="true"]`).waitFor();
  assert.equal(new URL(page.url()).hash, route);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const before = await sceneShot();
  await page.getByRole('button', { name: 'Lamp', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Lamp', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.ok(!(await sceneShot()).equals(before), 'lamp changes actual room pixels with camera and animation fixed');
  // These are visible geometry positions in the composed desktop view, not DOM stand-ins.
  await page.mouse.click(1005, 475);
  assert.equal(await page.getByRole('button', { name: 'Lamp', exact: true }).getAttribute('aria-pressed'), 'false', 'clicking the lamp shade switches it off');
  await page.mouse.click(375, 662);
  await page.getByRole('button', { name: 'Fan: low' }).waitFor();
  await page.getByRole('button', { name: 'Fan: low' }).click();
  await page.getByRole('button', { name: 'Fan: high' }).click();
  await page.getByRole('button', { name: 'Fan: off' }).click();
  await page.getByRole('button', { name: 'Fan: low' }).click();
  await page.getByRole('button', { name: 'Fan: high' }).waitFor();
  const still = await sceneShot();
  await page.waitForTimeout(150);
  assert.ok((await sceneShot()).equals(still), 'pause motion freezes the canvas');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  assert.ok(!(await sceneShot()).equals(still), 'camera alone changes perspective');
  await page.getByRole('button', { name: 'Reset view' }).click();
  const resetDifference = await pixelDifference(await sceneShot(), still);
  assert.ok(resetDifference < 0.001, `reset restores the camera (changed pixel fraction: ${resetDifference})`);
  // Dragging over an interactive object must turn the camera without activating it.
  await page.mouse.move(1005, 475); await page.mouse.down(); await page.mouse.move(1070, 490, { steps: 8 }); await page.mouse.up();
  assert.equal(await page.getByRole('button', { name: 'Lamp', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.getByRole('button', { name: 'Lamp', exact: true }).click();
  if (shots) await page.screenshot({ path: path.join(shots, 'corner-desktop.png') });
  assert.deepEqual(api, [], 'preview does not request practice APIs');
  await page.getByRole('button', { name: 'Resume motion' }).click();
  const fanClip = { x: 300, y: 590, width: 140, height: 145 };
  const fanBefore = await page.screenshot({ clip: fanClip });
  await page.waitForTimeout(180);
  assert.ok(!(await page.screenshot({ clip: fanClip })).equals(fanBefore), 'the fan blades visibly rotate');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenDraws = await page.evaluate(() => window.cornerDraws);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.cornerDraws), hiddenDraws, 'hidden document stops GPU drawing');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(n => window.cornerDraws > n, hiddenDraws);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const name of ['Lamp', 'Fan: high', 'Reset view']) {
      const b = await page.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(b && b.height >= 44 && b.x >= 0 && b.x + b.width <= width);
    }
    for (const name of ['Summer paint', 'Warm sketch']) {
      const b = await page.getByRole('link', { name, exact: true }).boundingBox();
      assert.ok(b && b.height >= 44 && b.x >= 0 && b.x + b.width <= width, 'style links fit on mobile');
    }
    if (shots) await page.screenshot({ path: path.join(shots, `corner-${width}.png`) });
  }
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.reload();
  await page.locator('[data-ready="true"]').waitFor();
  await page.getByRole('button', { name: 'Resume motion' }).waitFor();
  await page.getByRole('button', { name: 'Lamp', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Lamp', exact: true }).getAttribute('aria-pressed'), 'true');
  // Deliberately lose the context: keep a usable exit and a concrete retry action.
  await canvas.evaluate(c => c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.getByText('The room needs a fresh start.').waitFor();
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.locator('[data-ready="true"]').waitFor();
  for (const [os, saved] of [['dark', 'light'], ['light', 'dark']]) {
    await page.emulateMedia({ colorScheme: os });
    await page.evaluate(value => localStorage.setItem('lilt.theme', value), saved);
    await page.reload(); await page.locator('[data-ready="true"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light'), saved);
    const color = await page.locator('.pc-controls').evaluate(el => getComputedStyle(el).color);
    const expected = sketch ? (saved === 'dark' ? 'rgb(244, 224, 191)' : 'rgb(101, 67, 51)') : (saved === 'dark' ? 'rgb(225, 236, 224)' : 'rgb(36, 73, 75)');
    assert.equal(color, expected, 'saved theme controls the preview');
  }
  // A failed asset and missing WebGL both retain an exit and recovery UI.
  const surfaceUrl = `**/painted-corner/${sketch ? 'sketch-surfaces' : 'surfaces'}.png`;
  await page.route(surfaceUrl, r => r.abort());
  await page.reload();
  await page.getByText('The room needs a fresh start.').waitFor();
  await page.unroute(surfaceUrl);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.locator('[data-ready="true"]').waitFor();
  const noGpu = await browser.newPage();
  await noGpu.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      return kind === 'webgl2' ? null : getContext.call(this, kind, ...args);
    };
  });
  await noGpu.goto(`${server.resolvedUrls.local[0]}${route}`);
  await noGpu.getByText('The room needs a fresh start.').waitFor();
  await noGpu.getByRole('link', { name: 'Back to Lilt' }).first().waitFor();
  await noGpu.close();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/painted-corner.html?style=${style}`);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-ready="true"]').waitFor();
    assert.equal(await page.locator('canvas').count(), 1);
    await page.evaluate(() => window.unmountCorner());
    const afterExit = await page.evaluate(() => window.cornerDraws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => window.cornerDraws), afterExit, 'unmount stops GPU drawing');
    await page.evaluate(() => window.mountCorner());
  }
  await page.locator('[data-ready="true"]').waitFor();
  assert.deepEqual(errors, [], 'browser errors');
  console.log(`PASS (${style}): style comparison, isolated preview, visible light, geometry picking, rotating fan, camera/reset, drag safety, paused/hidden animation, mobile, saved themes, reduced motion, texture/WebGL failure, context recovery and repeated mount cleanup.`);
} finally {
  await browser?.close();
  await server.close();
}
