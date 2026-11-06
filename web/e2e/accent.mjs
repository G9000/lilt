// Isolated visual and persistence checks; never calls the owner's server.
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const errors = [], api = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/api/**', r => { api.push(r.request().url()); return r.abort(); });
  const url = `${server.resolvedUrls.local[0]}e2e/fixtures/accent.html`;
  await page.goto(url);
  const open = () => page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await open();
  const picker = page.getByRole('dialog').getByRole('group', { name: 'Accent color' });
  const token = name => page.evaluate(name => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), name);
  assert.equal(await token('--accent'), '#e0643c');
  const canvas = page.locator('canvas');
  const orangeChart = await canvas.evaluate(c => c.toDataURL());
  await picker.getByRole('radio', { name: 'Blue', exact: true }).check();
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.accent')), '#467aca');
  await page.waitForFunction(before => document.querySelector('canvas').toDataURL() !== before, orangeChart);
  assert.notEqual(await token('--accent'), '#e0643c');
  assert.equal(await token('--rec'), '#ff4255');
  assert.ok(await page.getByRole('region', { name: 'Settings appearance' }).getByRole('radio', { name: 'Blue', exact: true }).isChecked());
  const hex = picker.getByLabel('Hex color');
  await hex.fill('#12nope'); await hex.press('Enter');
  assert.ok(await picker.getByRole('alert').isVisible());
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.accent')), '#467aca');
  await hex.fill('#ABC'); await hex.press('Enter');
  assert.equal(await hex.inputValue(), '#aabbcc');
  await picker.getByLabel('Custom color').fill('#298579');
  assert.equal(await hex.inputValue(), '#298579');
  await page.reload(); await open();
  assert.equal(await hex.inputValue(), '#298579');
  const other = await context.newPage(); await other.goto(url);
  await other.getByRole('region', { name: 'Settings appearance' }).getByRole('radio', { name: 'Rose', exact: true }).check();
  await page.waitForFunction(() => document.querySelector('input[type="color"]').value === '#c85b7a');
  await other.evaluate(() => localStorage.removeItem('lilt.accent'));
  await page.waitForFunction(() => document.querySelector('input[type="color"]').value === '#e0643c');
  await other.close();
  await hex.fill('#000000'); await hex.press('Enter');
  assert.ok(await page.locator('.fc-card').evaluate(el => {
    const css = getComputedStyle(el); return css.getPropertyValue('--focus').trim() === css.getPropertyValue('--accent').trim();
  }), 'dark cards use their own readable focus color even in light theme');
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await hex.fill('#ffffff'); await hex.press('Enter');
  for (const selector of ['.ve .w.now.annotated', '.vrec .w.now.annotated']) {
    await page.waitForFunction(selector => { const el = document.querySelector(selector); return getComputedStyle(el, '::after').color === getComputedStyle(el).color; }, selector);
    assert.ok(await page.locator(selector).evaluate(el => getComputedStyle(el, '::after').color === getComputedStyle(el).color), 'annotation numbers follow the readable highlighted-word color');
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await hex.fill('#ffff00'); await hex.press('Enter');
      assert.notEqual(await token('--accent'), '#e0643c');
      for (const label of ['Custom color', 'Hex color']) {
        const control = picker.getByLabel(label);
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width, `${label} fits at ${width}/${theme}`);
      }
      await picker.scrollIntoViewIfNeeded();
      if (shots) await page.screenshot({ path: path.join(shots, `accent-${width}-${theme}.png`) });
    }
  }
  await picker.getByRole('button', { name: 'Reset to orange' }).click();
  assert.equal(await token('--accent'), '#e0643c');
  await picker.getByRole('radio', { name: 'Plum', exact: true }).focus();
  await page.keyboard.press('Space');
  assert.equal(await hex.inputValue(), '#8b68b2');
  await page.getByRole('button', { name: 'Reset room', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('lilt.accent') === null);
  await page.keyboard.press('Escape');
  assert.ok(await page.getByRole('button', { name: 'Make it yours', exact: true }).evaluate(el => el === document.activeElement));
  await page.evaluate(() => localStorage.setItem('lilt.accent', 'invalid'));
  await page.reload(); await open();
  assert.equal(await token('--accent'), '#e0643c');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
  await picker.getByRole('radio', { name: 'Teal', exact: true }).check();
  assert.ok(await picker.getByRole('status').isVisible());
  assert.notEqual(await token('--accent'), '#e0643c');
  assert.deepEqual(errors, []); assert.deepEqual(api, []);
  console.log('PASS: accent presets, native picker, hex validation, contrast themes, live chart, reload, cross-tab sync, resets, keyboard, storage failure and narrow layouts.');
} finally { await browser?.close(); await server.close(); }
