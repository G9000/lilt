// Synthetic Settings and real cleanup bootstrap, on an isolated Vite port only.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';

const web = fileURLToPath(new URL('../', import.meta.url));
let vite, browser;
before(async () => {
  vite = await createServer({ root: web, logLevel: 'error', plugins: [{ name: 'reset-fixture', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/reset-fixture.html')) return next();
      const script = `if (new URL(location.href).searchParams.has('lilt-reset')) { await import('/src/main.tsx'); } else {
        const { default: React } = await import('react'); const { createRoot } = await import('react-dom/client');
        const { SettingsPage } = await import('/src/pages/Settings.tsx'); const { api } = await import('/src/api.ts');
        const { dataClient } = await import('/src/dataGeneration.ts');
        const { watchBrowserReset } = await import('/src/resetBrowserData.ts');
        await import('/src/styles.css'); api.profile = async () => ({ timezone: 'UTC' });
        watchBrowserReset(dataClient, null);
        createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(SettingsPage, { start: 'storage' })));
      }`;
      const html = await server.transformIndexHtml('/reset-fixture.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset data fixture</title></head><body><div id="root" style="background:var(--page)"></div><script type="module">${script}</script></body></html>`);
      res.setHeader('Content-Type', 'text/html'); res.end(html);
    });
  } }] });
  await vite.listen(); browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); await vite?.close(); });

async function fixture(t, options = {}) {
  const context = await browser.newContext({ viewport: options.narrow ? { width: 390, height: 844 } : { width: 1100, height: 900 } });
  const errors = [], calls = [], state = { marker: null, pending: false, fail: options.fail, abort: options.abort };
  context.on('page', page => { page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message)); });
  t.after(async () => { await context.close(); assert.deepEqual(errors, []); });
  await context.route('**/api/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    const isReset = pathname === '/api/reset';
    if (isReset && request.method() === 'POST') {
      calls.push({ body: request.postDataJSON(), headers: request.headers() });
      if (state.abort) { await route.abort('connectionfailed'); return; }
      state.marker = 'fixture-reset-1'; state.pending = !!state.fail;
    }
    const headers = { 'X-Lilt-Generation': state.marker ? 'after' : 'before', ...(state.marker ? { 'X-Lilt-Reset': state.marker } : {}) };
    const status = isReset && request.method() === 'POST' && state.fail ? 503 : 200;
    const json = pathname === '/api/storage' ? { data_path: 'C:/synthetic/Lilt/data', backup_path: 'C:/synthetic/Lilt/.data.lilt-backups', scanned_utc: '2026-11-07T04:00:00Z', complete: true, total_bytes: 1024, categories: ['recordings', 'photos', 'backups', 'other'].map(id => ({ id, bytes: 256, files: 1 })) }
      : isReset ? request.method() === 'POST' ? state.fail ? { error: 'Some old files still need deletion. Restart Lilt to finish cleanup.' } : { reset: true, generation: 'after', reset_id: state.marker }
        : { generation: state.marker ? 'after' : 'before', reset_id: state.marker, pending_cleanup: state.pending } : {};
    await route.fulfill({ status, headers, json });
  });
  await context.route('**/healthz', route => route.fulfill({ json: {}, headers: { 'X-Lilt-Generation': state.marker ? 'after' : 'before', ...(state.marker ? { 'X-Lilt-Reset': state.marker } : {}) } }));
  const page = await context.newPage();
  await page.goto(`${vite.resolvedUrls.local[0]}reset-fixture.html`);
  await page.getByRole('button', { name: 'Reset all data…', exact: true }).waitFor({ timeout: 30000 });
  return { context, page, state, calls };
}
const open = page => page.getByRole('button', { name: 'Reset all data…', exact: true }).click();
async function confirm(page) { await open(page); await page.getByLabel('Type DELETE ALL DATA to confirm').fill('DELETE ALL DATA'); await page.getByRole('button', { name: 'Delete all data', exact: true }).click(); }

async function seed(page) {
  await page.evaluate(async () => {
    localStorage.setItem('lilt.spotify.tokens', 'synthetic-secret'); localStorage.setItem('lilt.room.appearance', '{"decor":"synthetic"}'); localStorage.setItem('unrelated', 'keep');
    sessionStorage.setItem('lilt.step.synthetic', 'done'); sessionStorage.setItem('unrelated', 'session-keep');
    await new Promise((resolve, reject) => { const req = indexedDB.open('lilt-capture', 1); req.onupgradeneeded = () => req.result.createObjectStore('synthetic'); req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = reject; });
    await new Promise((resolve, reject) => { const req = indexedDB.open('unrelated-db', 1); req.onupgradeneeded = () => req.result.createObjectStore('keep'); req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = reject; });
    await (await caches.open('lilt-monitor-media-v1')).put('/synthetic-media', new Response('synthetic'));
    await (await caches.open('unrelated-cache')).put('/keep', new Response('keep'));
  });
}
async function cleared(page) {
  const actual = await page.evaluate(async () => ({ local: localStorage.getItem('lilt.spotify.tokens'), appearance: localStorage.getItem('lilt.room.appearance'), session: sessionStorage.getItem('lilt.step.synthetic'), unrelated: localStorage.getItem('unrelated'), unrelatedSession: sessionStorage.getItem('unrelated'), dbs: (await indexedDB.databases()).map(x => x.name), caches: await caches.keys() }));
  assert.equal(actual.local, null); assert.equal(actual.appearance, null); assert.equal(actual.session, null);
  assert.equal(actual.unrelated, 'keep'); assert.equal(actual.unrelatedSession, 'session-keep');
  assert.deepEqual(actual.dbs, ['unrelated-db']); assert.deepEqual(actual.caches, ['unrelated-cache']);
}

test('warning, Cancel focus and exact typed confirmation prevent unconfirmed deletion', async t => {
  const { page, calls } = await fixture(t, { narrow: true }); await open(page);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Cancel');
  for (const copy of ['recordings, photos, progress, custom courses', 'Lilt-managed backups', 'No safety backup is made', 'Copies you downloaded or exported elsewhere are not removed', 'uploaded monitor media']) assert.match(await page.locator('section[aria-label="Reset all data"]').innerText(), new RegExp(copy));
  const action = page.getByRole('button', { name: 'Delete all data', exact: true });
  for (const text of ['', 'delete all data', 'DELETE ALL DATA ']) { await page.getByLabel('Type DELETE ALL DATA to confirm').fill(text); assert.equal(await action.isDisabled(), true); }
  await page.getByLabel('Type DELETE ALL DATA to confirm').fill('DELETE ALL DATA'); assert.equal(await action.isEnabled(), true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.LILT_SHOTS) { await mkdir(process.env.LILT_SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.LILT_SHOTS, `reset-narrow-${theme}.png`), fullPage: true }); }
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Reset all data…'); assert.equal(calls.length, 0);
  await open(page); assert.equal(await page.getByLabel('Type DELETE ALL DATA to confirm').inputValue(), '');
});

test('one confirmed POST clears only Lilt stores through the real bootstrap', async t => {
  const { page, calls } = await fixture(t); await seed(page); await confirm(page);
  await page.getByRole('heading', { name: 'Lilt data has been reset' }).waitFor().catch(async error => { throw new Error(`${error.message}\n${page.url()}\n${await page.locator('body').innerText()}`); }); await cleared(page);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].body, { generation: 'before', confirmation: 'DELETE ALL DATA' }); assert.equal(calls[0].headers['x-lilt-generation'], 'before');
});

test('another tab clears its session after the shared reset signal', async t => {
  const { page, context, calls } = await fixture(t); await seed(page);
  const other = await context.newPage(); await other.goto(page.url()); await other.getByRole('button', { name: 'Reset all data…', exact: true }).waitFor();
  await other.evaluate(() => { sessionStorage.setItem('lilt.step.synthetic', 'done'); sessionStorage.setItem('unrelated', 'session-keep'); });
  await confirm(page); await page.getByRole('heading', { name: 'Lilt data has been reset' }).waitFor();
  await other.getByRole('heading', { name: 'Browser data has been cleared' }).waitFor(); await cleared(other); assert.equal(calls.length, 1);
});

test('server cleanup failure clears browser data but never announces full success', async t => {
  const { page, calls } = await fixture(t, { fail: true }); await seed(page); await confirm(page);
  await page.getByRole('heading', { name: 'Reset cleanup is unfinished' }).waitFor();
  assert.match(await page.locator('main').innerText(), /Restart the Lilt server or installed app/); await cleared(page);
  await page.getByRole('button', { name: 'Check again' }).click(); await page.getByRole('heading', { name: 'Reset cleanup is unfinished' }).waitFor(); assert.equal(calls.length, 1);
});

test('blocked recording storage retries browser cleanup without repeating the POST', async t => {
  const { page, context, calls } = await fixture(t); await seed(page);
  const holder = await context.newPage(); await holder.goto(`${vite.resolvedUrls.local[0]}e2e/fixtures/settings-comparison.html`);
  await holder.evaluate(async () => { window.heldCapture = await new Promise((resolve, reject) => { const req = indexedDB.open('lilt-capture'); req.onsuccess = () => resolve(req.result); req.onerror = reject; }); });
  await confirm(page); await page.getByRole('heading', { name: 'Browser cleanup is unfinished' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.reset.marker')), null);
  await holder.evaluate(() => window.heldCapture.close());
  await page.getByRole('button', { name: 'Retry browser cleanup' }).click();
  await page.getByRole('heading', { name: 'Lilt data has been reset' }).waitFor(); await cleared(page); assert.equal(calls.length, 1);
});

test('an uncertain connection result never enables an automatic reset retry', async t => {
  const { page, calls } = await fixture(t, { abort: true }); await confirm(page);
  await page.getByRole('alert').getByText(/reset may have happened/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Delete all data', exact: true }).isDisabled(), true); assert.equal(calls.length, 1);
});

test('a delayed reset snapshot cannot arrive after a newer tab finishes cleanup', async t => {
  const context = await browser.newContext(); t.after(() => context.close());
  let requests = 0, current = 'reset-one', releaseFirst, firstStarted;
  const started = new Promise(resolve => { firstStarted = resolve; });
  const blocked = new Promise(resolve => { releaseFirst = resolve; });
  await context.route('**/api/reset', async route => {
    const snapshot = current; requests++;
    if (requests === 1) { firstStarted(); await blocked; }
    await route.fulfill({ json: { generation: snapshot, reset_id: snapshot, pending_cleanup: false }, headers: { 'X-Lilt-Reset': snapshot } });
  });
  const first = await context.newPage(), second = await context.newPage();
  const url = `${vite.resolvedUrls.local[0]}reset-fixture.html?lilt-reset=reset-one`;
  await first.goto(url); await started;
  await second.goto(url);
  await second.waitForFunction(async () => (await navigator.locks.query()).pending.some(lock => lock.name === 'lilt.room.appearance'));
  assert.equal(requests, 1, 'the second snapshot must wait for the first cleanup lock');
  current = 'reset-two'; releaseFirst();
  await first.getByRole('heading', { name: 'Browser data has been cleared' }).waitFor();
  await second.getByRole('heading', { name: 'Browser data has been cleared' }).waitFor();
  assert.equal(await second.evaluate(() => localStorage.getItem('lilt.reset.marker')), 'reset-two');
  await second.evaluate(() => localStorage.setItem('lilt.room.new-choice', 'keep new choice'));
  await first.reload(); await first.getByRole('heading', { name: 'Browser data has been cleared' }).waitFor();
  assert.equal(await first.evaluate(() => localStorage.getItem('lilt.room.new-choice')), 'keep new choice');
});

test('a monitor upload prepared before reset cannot put deleted media back', async t => {
  const { page } = await fixture(t);
  await page.evaluate(async () => {
    const { uploadMonitorMedia } = await import('/src/room/appearance.ts');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'synthetic.png', { type: 'image/png' });
    const slice = file.slice.bind(file);
    const gate = new Promise(resolve => { window.finishPreparing = resolve; });
    file.slice = (...args) => {
      const chunk = slice(...args), read = chunk.arrayBuffer.bind(chunk);
      chunk.arrayBuffer = async () => { await gate; return read(); };
      return chunk;
    };
    window.oldUpload = uploadMonitorMedia('main', file).then(() => 'unexpected success', error => error.message);
    const { clearBrowserAfterReset } = await import('/src/resetBrowserData.ts');
    await clearBrowserAfterReset('new-reset');
    window.finishPreparing();
  });
  const message = await page.evaluate(() => window.oldUpload);
  assert.match(message, /data was reset/);
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.room.appearance')), null);
  assert.equal(await page.evaluate(() => caches.has('lilt-monitor-media-v1')), false);
});
