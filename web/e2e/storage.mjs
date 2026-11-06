// Settings-only fixture with an isolated server and synthetic storage counts.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import { chromium } from 'playwright-core';

const web = fileURLToPath(new URL('../', import.meta.url));
let vite, browser;
before(async () => {
  vite = await createServer({ root: web, logLevel: 'error',
    plugins: [{ name: 'storage-fixture', configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (req.url !== '/storage-fixture.html') return next();
      const html = await server.transformIndexHtml('/storage-fixture.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Storage settings</title></head><body><div id="root" style="background:var(--page)"></div><script type="module">
        import React from 'react'; import { createRoot } from 'react-dom/client';
        import { SettingsPage } from '/src/pages/Settings.tsx'; import { api } from '/src/api.ts';
        import '/src/styles.css'; api.profile = async () => ({ timezone: 'UTC' });
        createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(SettingsPage, { start: 'storage' })));
      </script></body></html>`);
      res.setHeader('Content-Type', 'text/html'); res.end(html);
    }); } }],
  });
  await vite.listen(); browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); await vite?.close(); });
const snapshot = () => ({ data_path: 'C:\\People\\A long name\\Lilt\\data', backup_path: 'C:\\People\\A long name\\Lilt\\.data.lilt-backups', scanned_utc: '2026-11-07T04:00:00Z', complete: true, skipped_entries: 0, total_bytes: 6 * 1024 ** 2,
  categories: ['recordings', 'photos', 'backups', 'other'].map((id, i) => ({ id, bytes: (i === 3 ? 0 : i + 1) * 1024 ** 2, files: i === 3 ? 0 : i + 1 })) });
async function fixture(t, options = {}) {
  const page = await browser.newPage({ viewport: options.narrow ? { width: 390, height: 844 } : { width: 1024, height: 850 } });
  page.setDefaultTimeout(5000); const errors = [], state = { summary: snapshot(), fail: !!options.fail, stall: !!options.stall };
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.addInitScript(({ desktop, copyFails }) => {
    window.__LILT_DESKTOP__ = desktop;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { if (copyFails) throw new Error('denied'); window.copied = text; } } });
  }, { desktop: !!options.desktop, copyFails: !!options.copyFails });
  if (options.fastTimeout) await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = (fn, delay, ...args) => schedule(fn, delay === 15000 ? 1000 : delay, ...args);
  });
  if (options.partial) { state.summary.complete = false; state.summary.skipped_entries = 1; }
  if (options.empty) { state.summary.total_bytes = 0; state.summary.categories.forEach(c => { c.bytes = 0; c.files = 0; }); }
  await page.route('**/api/storage', route => { if (state.stall) return; return route.fulfill({ status: state.fail ? 503 : 200, json: state.fail ? { error: 'Lilt is busy restoring. Try again shortly.' } : state.summary }); });
  await page.goto(`${vite.resolvedUrls.local[0]}storage-fixture.html`);
  await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('[data-storage-loading="false"]'));
  return { page, state };
}
const row = (page, name) => page.locator('.sx-row').filter({ has: page.getByText(name, { exact: true }) });
test('storage shows all categories, copies the actual path and refreshes counts', async t => {
  const { page, state } = await fixture(t);
  assert.match(await row(page, 'Recordings & analysis').innerText(), /1 MB/);
  assert.match(await row(page, 'Photos').innerText(), /2 MB/);
  assert.match(await row(page, 'Backups & recovery files').innerText(), /3 MB/);
  assert.match(await row(page, 'Other saved data').innerText(), /0 B/);
  assert.equal(await page.getByText('6 MB', { exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Copy folder path' }).click();
  await page.getByText('Folder path copied.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.copied), state.summary.data_path);
  assert.equal(await page.getByRole('button', { name: 'Open data folder' }).count(), 0);
  state.summary.total_bytes += 1024 ** 2; state.summary.categories[0].bytes += 1024 ** 2;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('7 MB', { exact: true }).waitFor();
});
test('a failed first scan never looks empty and can be retried', async t => {
  const { page, state } = await fixture(t, { fail: true });
  await page.getByRole('alert').getByText(/busy restoring/).waitFor();
  assert.equal(await page.getByText('0 B', { exact: true }).count(), 0);
  state.fail = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('6 MB', { exact: true }).waitFor();
  state.fail = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText(/Showing the previous count/).waitFor();
  assert.equal(await page.getByText('6 MB', { exact: true }).count(), 1);
});
test('partial counts and unavailable clipboard explain their limits', async t => {
  const { page } = await fixture(t, { partial: true, copyFails: true });
  await page.getByText('At least 6 MB', { exact: true }).waitFor();
  await page.getByText(/Some files couldn’t be counted/).waitFor();
  await page.getByRole('button', { name: 'Copy folder path' }).click();
  await page.getByText(/Select the folder path above and copy it/).waitFor();
});
test('an empty scan is distinct from a failed scan', async t => {
  const { page } = await fixture(t, { empty: true });
  assert.equal(await page.getByText('0 B', { exact: true }).count(), 5);
  assert.equal(await page.getByRole('alert').count(), 0);
});
test('a stalled scan times out and lets you refresh', async t => {
  const { page, state } = await fixture(t, { stall: true, fastTimeout: true });
  await page.getByRole('alert').getByText(/Counting took too long/).waitFor();
  state.stall = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('6 MB', { exact: true }).waitFor();
});
test('a missing native response offers the copy-path fallback', async t => {
  const { page } = await fixture(t, { desktop: true, fastTimeout: true });
  await page.getByRole('button', { name: 'Open data folder' }).click();
  await page.getByText(/couldn’t confirm the folder opened/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open data folder' }).isEnabled(), true);
});
test('leaving Storage cancels its pending scan and reopening loads fresh counts', async t => {
  const { page, state } = await fixture(t);
  state.stall = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('Counting saved files…', { exact: true }).waitFor();
  const cancelled = page.waitForEvent('requestfailed', { predicate: req => req.url().endsWith('/api/storage') });
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await cancelled;
  state.stall = false;
  state.summary.total_bytes += 1024 ** 2; state.summary.categories[0].bytes += 1024 ** 2;
  await page.getByRole('button', { name: 'Storage', exact: true }).click();
  await page.getByText('7 MB', { exact: true }).waitFor();
});
test('desktop folder action uses only the fixed route and reports success or error', async t => {
  const { page } = await fixture(t, { desktop: true });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Page.enable');
  const requested = new Promise(resolve => cdp.on('Page.frameRequestedNavigation', event => resolve(event.url)));
  await page.getByRole('button', { name: 'Open data folder' }).focus(); await page.keyboard.press('Enter');
  assert.equal(await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('No folder navigation')), 4000))]), 'lilt://data-folder');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('lilt:data-folder', { detail: { error: 'Use Copy folder path for this separately started Lilt.' } })));
  await page.getByText(/separately started Lilt/).waitFor();
  await page.getByRole('button', { name: 'Open data folder' }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('lilt:data-folder', { detail: { error: null } })));
  await page.getByText('Asked your file manager to open the data folder.', { exact: true }).waitFor();
  await cdp.detach();
});
test('storage remains readable in narrow light and dark layouts', async t => {
  const { page } = await fixture(t, { narrow: true });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const box = await page.getByRole('button', { name: 'Copy folder path' }).boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 390);
    if (process.env.LILT_SHOTS) { await mkdir(process.env.LILT_SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.LILT_SHOTS, `storage-narrow-${theme}.png`), fullPage: true }); }
  }
});
