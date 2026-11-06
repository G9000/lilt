// Bundled update UI with a stub native bridge, plus Settings in an isolated Vite server.
// Run from the repository root: node --test web/e2e/desktop-updates.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as httpServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';

const web = fileURLToPath(new URL('../', import.meta.url));
const ui = fileURLToPath(new URL('../../desktop/ui/', import.meta.url));
let browser, files, vite, uiUrl;
const base = { phase: 'idle', current: '0.2.1', version: null, notes: '', downloaded: 0, total: null, error: null };
before(async () => {
  files = httpServer(async (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (!/^updates\.(html|js|css)$/.test(name)) { res.writeHead(404).end(); return; }
    try {
      const bytes = await readFile(path.join(ui, name));
      res.setHeader('Content-Type', name.endsWith('.html') ? 'text/html' : name.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => files.listen(0, '127.0.0.1', resolve));
  uiUrl = `http://127.0.0.1:${files.address().port}/updates.html`;
  vite = await createServer({ root: web, logLevel: 'error',
    plugins: [{ name: 'update-settings-fixture', configureServer(server) { server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/update-settings-fixture.html') return next();
    const html = await server.transformIndexHtml('/update-settings-fixture.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Settings updates test</title></head><body><div id="root"></div><script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { SettingsPage } from '/src/pages/Settings.tsx';
      import { InboxButton, NotificationCenter, useInbox } from '/src/desk/Inbox.tsx';
      import { api } from '/src/api.ts';
      import '/src/styles.css';
      api.profile = async () => ({ timezone: 'UTC' });
      api.today = async () => null;
      function Fixture() {
        const inbox = useInbox(null, 0);
        return React.createElement(React.Fragment, null,
          React.createElement(InboxButton, { inbox }),
          React.createElement(SettingsPage),
          React.createElement(NotificationCenter, { inbox }));
      }
      createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Fixture)));
    </script></body></html>`);
    res.setHeader('Content-Type', 'text/html'); res.end(html);
    }); } }],
  });
  await vite.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});

const noticeState = { current: '0.8.1', phase: 'available', version: '0.8.2', failed: false };
async function settingsFixture(t, { desktop = true, snapshot = noticeState } = {}) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  page.setDefaultTimeout(4000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.addInitScript(({ desktop, snapshot }) => {
    window.__LILT_DESKTOP__ = desktop;
    window.__LILT_APP_UPDATE__ = snapshot;
  }, { desktop, snapshot });
  await page.goto(`${vite.resolvedUrls.local[0]}update-settings-fixture.html`, { timeout: 15000 });
  await page.getByRole('button', { name: 'Updates', exact: true }).click();
  return page;
}
async function publishNotice(page, patch) {
  await page.evaluate(patch => {
    window.__LILT_APP_UPDATE__ = { ...window.__LILT_APP_UPDATE__, ...patch };
    window.dispatchEvent(new Event('lilt:app-update'));
  }, patch);
}
const settingsRow = (page, label) => page.locator('.sx-row').filter({ has: page.getByText(label, { exact: true }) });

test('Settings shows the native installed version and live status before opening the updater', async t => {
  const page = await settingsFixture(t);
  assert.match(await settingsRow(page, 'Installed version').innerText(), /0\.8\.1/);
  assert.match(await settingsRow(page, 'Update status').innerText(), /0\.8\.2 is available/);
  for (const [phase, failed, expected] of [
    ['checking', false, 'Checking for updates'], ['up_to_date', false, 'up to date'],
    ['idle', true, "Couldn't check"], ['unconfigured', false, 'not configured'],
    ['downloading', false, 'Downloading Lilt 0.8.2'], ['ready', false, 'ready to install'],
    ['ready', true, 'Open app updates for details'], ['installing', false, 'Your app will restart'],
  ]) {
    await publishNotice(page, { phase, failed, version: '0.8.2' });
    await settingsRow(page, 'Update status').getByText(expected, { exact: false }).waitFor();
  }
  await page.reload();
  await page.getByRole('button', { name: 'Updates', exact: true }).click();
  assert.match(await settingsRow(page, 'Installed version').innerText(), /0\.8\.1/);
  assert.match(await settingsRow(page, 'Update status').innerText(), /0\.8\.2 is available/);
});

test('update notices stay read or cleared across phases and reload, and a new version is unread', async t => {
  const page = await settingsFixture(t);
  const unread = page.getByRole('button', { name: 'Notifications, 1 new', exact: true });
  await unread.click();
  const notice = page.getByRole('button', { name: /Lilt 0\.8\.2 is available/ });
  await notice.waitFor();
  for (const phase of ['available', 'downloading', 'ready', 'available']) await publishNotice(page, { phase });
  assert.equal(await notice.count(), 1);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const requested = new Promise(resolve => cdp.on('Page.frameRequestedNavigation', event => resolve(event.url)));
  await notice.focus(); await page.keyboard.press('Enter');
  assert.equal(await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('No update navigation')), 4000))]), 'lilt://updates');
  await cdp.detach();
  await page.locator('.ib-btn[aria-label="Notifications"]').waitFor();
  await page.reload();
  await page.locator('.ib-btn[aria-label="Notifications"]').click();
  await notice.waitFor();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.getByText('No notifications. All quiet.', { exact: true }).waitFor();
  await page.reload();
  await page.locator('.ib-btn[aria-label="Notifications"]').click();
  await page.getByText('No notifications. All quiet.', { exact: true }).waitFor();
  await publishNotice(page, { phase: 'ready' });
  assert.equal(await notice.count(), 0);
  await publishNotice(page, { phase: 'available', version: '0.8.3' });
  await unread.waitFor();
  await page.getByRole('button', { name: /Lilt 0\.8\.3 is available/ }).waitFor();
});

test('late native status creates a quiet notice, while failed checks and installed updates do not', async t => {
  const page = await settingsFixture(t, { snapshot: null });
  await settingsRow(page, 'Installed version').getByText('Reading app version…', { exact: true }).waitFor();
  await page.locator('.ib-btn[aria-label="Notifications"]').waitFor();
  await publishNotice(page, { ...noticeState, phase: 'idle', failed: true, version: null });
  await settingsRow(page, 'Update status').getByText("Couldn't check", { exact: false }).waitFor();
  assert.equal(await page.locator('.nc').getAttribute('aria-hidden'), 'true');
  await publishNotice(page, noticeState);
  await page.getByRole('button', { name: 'Notifications, 1 new', exact: true }).waitFor();
  assert.equal(await page.locator('.nc').getAttribute('aria-hidden'), 'true');
  await publishNotice(page, { current: '0.8.2', phase: 'up_to_date', version: null });
  await page.locator('.ib-btn[aria-label="Notifications"]').waitFor();
  await settingsRow(page, 'Installed version').getByText('0.8.2', { exact: true }).waitFor();
});

test('browser Settings labels its web version and ignores desktop update projection', async t => {
  const page = await settingsFixture(t, { desktop: false });
  assert.match(await settingsRow(page, 'Web version').innerText(), /0\.2\.1/);
  assert.equal(await settingsRow(page, 'Installed version').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Open app updates', exact: true }).count(), 0);
  await page.locator('.ib-btn[aria-label="Notifications"]').waitFor();
  await publishNotice(page, { version: '0.8.3' });
  assert.equal(await page.getByRole('button', { name: /Notifications, .* new/ }).count(), 0);
});

test('inline status and the quiet notice remain readable in narrow light and dark layouts', async t => {
  const shots = fileURLToPath(new URL('../../desktop/target/update-notice-shots/', import.meta.url));
  await mkdir(shots, { recursive: true });
  for (const dark of [false, true]) {
    const page = await settingsFixture(t);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(dark => document.documentElement.dataset.theme = dark ? 'dark' : 'light', dark);
    await settingsRow(page, 'Installed version').waitFor();
    const button = page.getByRole('button', { name: 'Open app updates', exact: true });
    await button.focus();
    assert.equal(await button.evaluate(el => document.activeElement === el), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(shots, `settings-${dark ? 'dark' : 'light'}.png`) });
    await page.getByRole('button', { name: 'Notifications, 1 new', exact: true }).click();
    await page.getByRole('button', { name: /Lilt 0\.8\.2 is available/ }).waitFor();
    await page.waitForFunction(() => {
      const panel = document.querySelector('.nc');
      const bounds = panel.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth && getComputedStyle(panel).opacity === '1' && !document.getAnimations().some(animation => animation.playState === 'running');
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(shots, `notice-${dark ? 'dark' : 'light'}.png`) });
  }
});
after(async () => { await browser?.close(); await vite?.close(); await new Promise(resolve => files ? files.close(resolve) : resolve()); });

async function fixture(t, snapshot = base, scheme = 'light') {
  const page = await browser.newPage({ viewport: { width: 540, height: 640 }, colorScheme: scheme });
  page.setDefaultTimeout(4000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.addInitScript(snapshot => {
    window.bridge = { snapshot, calls: [], pending: null, statusPending: null, holdStatus: false, statusError: null };
    window.__TAURI__ = { core: { invoke: async command => {
      const b = window.bridge;
      b.calls.push(command);
      if (command === 'update_status') {
        if (b.statusError) throw new Error(b.statusError);
        if (b.holdStatus) return new Promise(resolve => { b.statusPending = resolve; });
        return structuredClone(b.snapshot);
      }
      return new Promise((resolve, reject) => { b.pending = { resolve, reject }; });
    } } };
  }, snapshot);
  await page.goto(uiUrl);
  await page.getByRole('heading', { name: 'Lilt updates' }).waitFor();
  await page.waitForFunction(() => document.getElementById('current').textContent.includes('0.2.1'));
  return page;
}
async function state(page, patch) {
  await page.evaluate(patch => { Object.assign(window.bridge.snapshot, patch); }, patch);
  await page.waitForFunction(phase => document.body.dataset.phase === phase, patch.phase);
}
async function settle(page, patch, rejected = false) {
  await page.waitForFunction(() => !!window.bridge.pending);
  await page.evaluate(({ patch, rejected }) => {
    const b = window.bridge;
    Object.assign(b.snapshot, patch);
    if (rejected) b.pending.reject(new Error(patch.error)); else b.pending.resolve(structuredClone(b.snapshot));
    b.pending = null;
  }, { patch, rejected });
}
const calls = page => page.evaluate(() => window.bridge.calls.filter(c => c !== 'update_status'));

test('manual checking, release notes as text, separate download/install, and keyboard access', async t => {
  const page = await fixture(t);
  const check = page.getByRole('button', { name: 'Check for updates', exact: true });
  await check.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!window.bridge.pending);
  assert.equal(await check.isDisabled(), true);
  await settle(page, { phase: 'available', version: '0.2.2', notes: '<img src=x onerror="window.injected=true">\nA quieter desk.' });
  const download = page.getByRole('button', { name: 'Download update', exact: true });
  await download.waitFor();
  assert.deepEqual(await calls(page), ['update_check']);
  assert.equal(await page.locator('#notes img').count(), 0);
  assert.match(await page.locator('#notes').textContent(), /<img src=x/);
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.equal(await page.getByRole('button', { name: 'Update and restart', exact: true }).isVisible(), false);
  await download.evaluate(button => { button.click(); button.click(); });
  await page.waitForFunction(() => !!window.bridge.pending);
  assert.deepEqual(await calls(page), ['update_check', 'update_download']);
  await state(page, { phase: 'downloading', downloaded: 5_000_000, total: 10_000_000 });
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '5000000');
  assert.equal(await page.getByRole('progressbar').getAttribute('max'), '10000000');
  await settle(page, { phase: 'ready' });
  const install = page.getByRole('button', { name: 'Update and restart', exact: true });
  await install.waitFor();
  assert.deepEqual(await calls(page), ['update_check', 'update_download']);
  await install.focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => !!window.bridge.pending);
  assert.equal(await install.isDisabled(), true);
  await settle(page, { phase: 'installing' });
  await page.waitForFunction(() => document.body.dataset.phase === 'installing');
  assert.deepEqual(await calls(page), ['update_check', 'update_download', 'update_install']);
});

test('errors preserve the download or install retry and survive status polling', async t => {
  const page = await fixture(t, { ...base, phase: 'available', version: '0.2.2' });
  const download = page.getByRole('button', { name: 'Download update', exact: true });
  await download.click();
  await settle(page, { phase: 'available', error: 'Download interrupted. Try again.' });
  await page.getByRole('alert').filter({ hasText: 'Download interrupted' }).waitFor();
  await download.click();
  await settle(page, { phase: 'ready', error: null });
  const install = page.getByRole('button', { name: 'Update and restart', exact: true });
  await install.click();
  await settle(page, { phase: 'ready', error: 'Finish saving your take first.' }, true);
  await page.getByRole('alert').filter({ hasText: 'Finish saving' }).waitFor();
  await page.waitForTimeout(1200);
  assert.match(await page.getByRole('alert').textContent(), /Finish saving/);
  assert.equal(await install.isEnabled(), true);
  await install.click();
  await settle(page, { phase: 'installing', error: null });
  assert.deepEqual(await calls(page), ['update_download', 'update_download', 'update_install', 'update_install']);
});

test('checking, current, unconfigured, and indeterminate download states', async t => {
  const page = await fixture(t, { ...base, phase: 'checking' });
  assert.equal(await page.getByRole('button', { name: 'Check for updates', exact: true }).isDisabled(), true);
  await state(page, { phase: 'up_to_date' });
  assert.match(await page.getByRole('status').textContent(), /up to date/i);
  await state(page, { phase: 'unconfigured' });
  assert.match(await page.getByRole('status').textContent(), /not configured/i);
  assert.equal(await page.getByRole('button', { name: 'Check for updates', exact: true }).isDisabled(), true);
  await state(page, { phase: 'downloading', version: '0.2.2', total: null, downloaded: 1200 });
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), null);
  assert.match(await page.locator('#progress-label').textContent(), /downloaded/i);
});

test('a delayed status reply cannot roll back a completed action', async t => {
  const page = await fixture(t);
  await page.evaluate(() => { window.bridge.holdStatus = true; });
  await page.waitForFunction(() => !!window.bridge.statusPending);
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await settle(page, { phase: 'available', version: '0.2.2' });
  await page.getByRole('button', { name: 'Download update', exact: true }).waitFor();
  await page.evaluate(() => { window.bridge.holdStatus = false; window.bridge.statusPending({ ...window.bridge.snapshot, phase: 'idle' }); });
  await page.waitForTimeout(50);
  assert.equal(await page.locator('body').getAttribute('data-phase'), 'available');
});

test('status failures explain the problem and allow checking again', async t => {
  const page = await fixture(t);
  await page.evaluate(() => { window.bridge.statusError = 'Cannot reach the updater. Try checking again.'; });
  await page.getByRole('alert').filter({ hasText: 'Cannot reach' }).waitFor();
  await page.evaluate(() => { window.bridge.statusError = null; });
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await settle(page, { phase: 'up_to_date' });
  await page.waitForFunction(() => document.body.dataset.phase === 'up_to_date');
  assert.equal(await page.getByRole('alert').isVisible(), false);
});

test('reopening shows the native download state without starting another operation', async t => {
  const page = await fixture(t, { ...base, phase: 'ready', version: '0.2.2' });
  await page.getByRole('button', { name: 'Update and restart', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Check for updates', exact: true }).isDisabled(), true);
  assert.deepEqual(await calls(page), []);
  await page.reload();
  await page.getByRole('button', { name: 'Update and restart', exact: true }).waitFor();
  assert.deepEqual(await calls(page), []);
});

test('the bundled page without a native bridge explains how to open it', async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.goto(uiUrl);
  await page.getByText('Open this window from the installed Mac app.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Check for updates', exact: true }).isDisabled(), true);
});

test('light and dark layouts stay readable with long notes and a narrow window', async t => {
  const backgrounds = [];
  for (const scheme of ['light', 'dark']) {
    const page = await fixture(t, { ...base, phase: 'ready', version: '0.2.2', notes: 'One long release note. '.repeat(300) }, scheme);
    await page.setViewportSize({ width: 340, height: 480 });
    backgrounds.push(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.getByRole('button', { name: 'Update and restart', exact: true }).focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Update and restart');
    assert.notEqual(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  }
  assert.notEqual(backgrounds[0], backgrounds[1]);
});

test('Settings explains browser support and desktop opens only the update window route', async t => {
  for (const desktop of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
    page.setDefaultTimeout(4000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    t.after(() => page.close());
    await page.addInitScript(desktop => { window.__LILT_DESKTOP__ = desktop; }, desktop);
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Isolated updates test' } }));
    await page.goto(`${vite.resolvedUrls.local[0]}update-settings-fixture.html`);
    await page.waitForFunction(() => !!document.querySelector('.sx')).catch(error => { throw new Error(`${error.message}\n${errors.join('\n')}`); });
    await page.getByRole('button', { name: 'Updates', exact: true }).click();
    const open = page.getByRole('button', { name: 'Open app updates', exact: true });
    if (!desktop) {
      assert.equal(await open.count(), 0);
      await page.getByText('App updates are available in the installed Mac app.', { exact: true }).waitFor();
    } else {
      // Capture the attempted external-protocol navigation without handing it to the OS.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.enable');
      const requested = new Promise(resolve => cdp.on('Page.frameRequestedNavigation', event => resolve(event.url)));
      await open.focus(); await page.keyboard.press('Enter');
      assert.equal(await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('No update navigation')), 4000))]), 'lilt://updates');
      await cdp.detach();
    }
  }
});
