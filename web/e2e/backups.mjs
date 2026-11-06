// Isolated Settings fixture; never reads the owner's practice data.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import { chromium } from 'playwright-core';

const web = fileURLToPath(new URL('..', import.meta.url));
let vite, browser;
before(async () => {
  vite = await createServer({ root: web, logLevel: 'error',
    plugins: [{ name: 'backup-settings-fixture', configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (req.url !== '/backup-fixture.html') return next();
      const html = await server.transformIndexHtml('/backup-fixture.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Backup settings</title></head><body><div id="root" style="background:var(--page)"></div><script type="module">
        import React from 'react'; import { createRoot } from 'react-dom/client';
        import { SettingsPage } from '/src/pages/Settings.tsx'; import { api } from '/src/api.ts';
        import '/src/styles.css'; api.profile = async () => ({ timezone: 'UTC' });
        createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(SettingsPage, { start: 'backups' })));
      </script></body></html>`);
      res.setHeader('Content-Type', 'text/html'); res.end(html);
    }); } }],
  });
  await vite.listen(); browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); await vite?.close(); });
const summary = { id: 'saved', created_utc: '2026-11-07T02:00:00Z', files: 21, bytes: 1024, recordings: 3, download_url: '/api/backups/saved/download' };
async function fixture(t, options = {}) {
  const page = await browser.newPage({ viewport: options.narrow ? { width: 390, height: 844 } : { width: 1000, height: 800 } });
  page.setDefaultTimeout(5000); const calls = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.route(/\/api\/backups(?:\/.*)?$/, async route => {
    const req = route.request(), pathname = new URL(req.url()).pathname;
    calls.push({ pathname, method: req.method(), headers: req.headers(), body: req.postData() });
    const isRestore = pathname.endsWith('/restore');
    const body = pathname.endsWith('/restore-preview') ? options.previewError ? { error: 'This backup could not be validated. Choose a ZIP created in Settings.' } : { ...summary, id: 'preview' }
      : isRestore ? options.restoreError ? { error: 'Finish saving your recording, then try again.' } : { restored: true, generation: 'after', safety_backup: { ...summary, id: 'safety', download_url: '/api/backups/safety/download' } }
      : req.method() === 'POST' ? summary : { generation: 'before', last_backup: null, max_upload_bytes: 1024 };
    await route.fulfill({ status: pathname.endsWith('/restore-preview') && options.previewError ? 422 : isRestore && options.restoreError ? 409 : 200, contentType: 'application/json', headers: { 'X-Lilt-Generation': isRestore && !options.restoreError ? 'after' : 'before' }, body: JSON.stringify(body) });
  });
  await page.goto(`${vite.resolvedUrls.local[0]}backup-fixture.html`);
  await page.getByRole('button', { name: 'Create backup', exact: true }).waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('input[type="file"]')?.disabled);
  return { page, calls };
}
async function preview(page) {
  await page.getByLabel('Choose a backup ZIP').setInputFiles({ name: 'practice.zip', mimeType: 'application/zip', buffer: Buffer.from('fixture') });
  await page.getByText('3 recordings', { exact: false }).waitFor().catch(async e => { throw new Error(`${e.message}\n${await page.locator('.sx-main').innerText()}`); });
}
test('backup creation offers a download without claiming the file has been saved', async t => {
  const { page, calls } = await fixture(t);
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  const download = page.getByRole('link', { name: 'Download backup', exact: true });
  assert.equal(await download.getAttribute('href'), summary.download_url);
  assert.match(await page.locator('.sx-main').innerText(), /created/i);
  assert.equal(calls.filter(x => x.method === 'POST')[0].headers['x-lilt-generation'], 'before');
});
test('choosing a backup only previews it; replacement requires explicit confirmation', async t => {
  const { page, calls } = await fixture(t); await preview(page);
  assert.equal(calls.filter(x => x.pathname.endsWith('/restore')).length, 0);
  const restore = page.getByRole('button', { name: 'Restore backup', exact: true });
  assert.equal(await restore.isDisabled(), true);
  if (process.env.LILT_SHOTS) await page.screenshot({ path: path.join(process.env.LILT_SHOTS, 'backup-preview-light.png'), fullPage: true });
  await page.getByRole('checkbox', { name: /Replace my current practice data/ }).focus();
  await page.keyboard.press('Space');
  await restore.focus(); await page.keyboard.press('Enter');
  await page.getByText('Your practice data has been restored.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Download safety copy' }).getAttribute('href'), '/api/backups/safety/download');
  assert.equal(await page.getByRole('button', { name: 'Reload Lilt' }).count(), 1);
  const request = calls.find(x => x.pathname.endsWith('/restore'));
  assert.deepEqual(JSON.parse(request.body), { id: 'preview', generation: 'before', confirm: true });
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Reload Lilt' }).click()]);
  await page.getByRole('button', { name: 'Create backup', exact: true }).waitFor();
});
test('cancel discards the preview without restoring', async t => {
  const { page, calls } = await fixture(t); await preview(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(calls.some(x => x.pathname.endsWith('/restore')), false);
});
test('an invalid backup shows the server explanation without offering replacement', async t => {
  const { page, calls } = await fixture(t, { previewError: true });
  await page.getByLabel('Choose a backup ZIP').setInputFiles({ name: 'old-export.zip', mimeType: 'application/zip', buffer: Buffer.from('fixture') });
  await page.getByRole('alert').getByText(/could not be validated/).waitFor();
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(calls.some(x => x.pathname.endsWith('/restore')), false);
  assert.equal(await page.getByRole('button', { name: 'Create backup', exact: true }).isEnabled(), true);
});
test('busy restore keeps the chosen preview and explains how to retry', async t => {
  const { page } = await fixture(t, { restoreError: true }); await preview(page);
  await page.getByRole('checkbox', { name: /Replace my current practice data/ }).check();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await page.getByRole('alert').getByText(/Finish saving/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Restore backup', exact: true }).isEnabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Reload Lilt' }).count(), 0);
});
test('large files are rejected before upload and narrow dark Settings remains usable', async t => {
  const { page, calls } = await fixture(t, { narrow: true });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.getByLabel('Choose a backup ZIP').setInputFiles({ name: 'large.zip', mimeType: 'application/zip', buffer: Buffer.alloc(1025) });
  await page.getByRole('alert').getByText(/too large/i).waitFor();
  assert.equal(calls.some(x => x.pathname.endsWith('/restore-preview')), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.LILT_SHOTS) await page.screenshot({ path: path.join(process.env.LILT_SHOTS, 'backup-narrow-dark.png'), fullPage: true });
});
