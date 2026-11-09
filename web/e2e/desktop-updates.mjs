// Desktop updates inside the app: Settings → Updates and the notification, with the native status
// injected the way the desktop app publishes it, in an isolated Vite server. Each step is asked for
// with a lilt://update/<step> link, captured here without handing it to the OS.
// Run from the repository root: node --test web/e2e/desktop-updates.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';

const web = fileURLToPath(new URL('../', import.meta.url));
let browser, vite;
before(async () => {
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
      window.addEventListener('lilt:settings', e => { window.__openedSettings = e.detail; });
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
after(async () => { await browser?.close(); await vite?.close(); });

const offered = { current: '0.8.1', phase: 'available', version: '0.8.2', failed: false, error: null, notes: 'A quieter desk.\nSmaller fixes.', progress: null };
async function settingsFixture(t, { desktop = true, snapshot = offered } = {}) {
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
async function publish(page, patch) {
  await page.evaluate(patch => {
    window.__LILT_APP_UPDATE__ = { ...window.__LILT_APP_UPDATE__, ...patch };
    window.dispatchEvent(new Event('lilt:app-update'));
  }, patch);
}
/** Press a button and return the lilt:// link it asked for (never handed to the OS). */
async function linkFrom(page, button) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const requested = new Promise(resolve => cdp.on('Page.frameRequestedNavigation', event => resolve(event.url)));
  await button.focus(); await page.keyboard.press('Enter');
  const url = await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('No update link')), 4000))]);
  await cdp.detach();
  return url;
}
const row = (page, label) => page.locator('.sx-row').filter({ has: page.getByText(label, { exact: true }) });

test('each step is one button in Settings that asks the app, and no other window opens', async t => {
  const page = await settingsFixture(t, { snapshot: { ...offered, phase: 'up_to_date', version: null, notes: null } });
  assert.match(await row(page, 'Installed version').innerText(), /0\.8\.1/);
  assert.match(await row(page, 'Update status').innerText(), /up to date/);
  assert.equal(await linkFrom(page, page.getByRole('button', { name: 'Check for updates', exact: true })), 'lilt://update/check');
  await publish(page, { phase: 'checking' });
  await row(page, 'Update status').getByText('Checking for updates…', { exact: true }).waitFor();
  assert.equal(await row(page, 'Update status').getByRole('button').count(), 0, 'no button while a step runs');
  await publish(page, { phase: 'available', version: '0.8.2', notes: offered.notes });
  await row(page, "What's new in Lilt 0.8.2").getByText(/A quieter desk\.\s+Smaller fixes\./).waitFor();
  assert.equal(await linkFrom(page, page.getByRole('button', { name: 'Download Lilt 0.8.2', exact: true })), 'lilt://update/download');
  await publish(page, { phase: 'downloading', progress: 42 });
  await row(page, 'Update status').getByText('Downloading Lilt 0.8.2… 42%', { exact: true }).waitFor();
  assert.equal(await page.getByRole('progressbar', { name: 'Download' }).getAttribute('aria-valuenow'), '42');
  await publish(page, { phase: 'ready', progress: null });
  await row(page, 'Installing').getByText(/waits until your takes are saved/).waitFor();
  assert.equal(await linkFrom(page, page.getByRole('button', { name: 'Install and restart', exact: true })), 'lilt://update/install');
  await publish(page, { phase: 'installing' });
  await row(page, 'Update status').getByText(/close and open again/).waitFor();
});

test('a step that fails says why, keeps what is on offer, and lets you try again', async t => {
  const page = await settingsFixture(t, { snapshot: { ...offered, phase: 'idle', version: null, notes: null, failed: true, error: "Couldn't check for updates. Your app still works. Try again when you're online." } });
  await row(page, 'Update status').getByText("Couldn't check for updates. Your app still works. Try again when you're online.", { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).waitFor();
  await publish(page, { phase: 'ready', version: '0.8.2', failed: true, error: 'This window is using a separately started Lilt. Quit both, then open the installed app to update.' });
  await row(page, 'Update status').getByText(/0\.8\.2 is downloaded and ready to install\. This window is using a separately started Lilt/).waitFor();
  await page.getByRole('button', { name: 'Install and restart', exact: true }).waitFor();
});

test('the notice follows the update, opens Settings at Updates, and stays read or cleared', async t => {
  const page = await settingsFixture(t);
  await page.getByRole('button', { name: 'Notifications, 1 new', exact: true }).click();
  const notice = page.getByRole('button', { name: /Lilt 0\.8\.2 is available/ });
  await notice.waitFor();
  await publish(page, { phase: 'downloading', progress: 30 });
  await page.getByRole('button', { name: /Downloading Lilt 0\.8\.2.*30% so far/ }).waitFor();
  await publish(page, { phase: 'ready', progress: null });
  const ready = page.getByRole('button', { name: /Lilt 0\.8\.2 is ready to install/ });
  await ready.waitFor();
  await ready.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__openedSettings), 'updates');
  await page.reload();
  await page.locator('.ib-btn[aria-label="Notifications"]').click();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.getByText('No notifications. All quiet.', { exact: true }).waitFor();
  await publish(page, { phase: 'available', version: '0.8.3' });
  await page.getByRole('button', { name: 'Notifications, 1 new', exact: true }).waitFor();
});

test('failed checks and installed updates make no notice; the browser shows no update controls', async t => {
  const page = await settingsFixture(t, { snapshot: null });
  await row(page, 'Installed version').getByText('Reading app version…', { exact: true }).waitFor();
  await publish(page, { ...offered, phase: 'idle', failed: true, error: "Couldn't check for updates.", version: null });
  await page.locator('.ib-btn[aria-label="Notifications"]').waitFor();
  await publish(page, { ...offered, current: '0.8.2', phase: 'up_to_date', version: null, failed: false, error: null });
  await row(page, 'Installed version').getByText('0.8.2', { exact: true }).waitFor();
  const web = await settingsFixture(t, { desktop: false });
  await row(web, 'App updates').getByText('The installed Mac and Windows apps can update themselves.', { exact: true }).waitFor();
  assert.equal(await web.getByRole('button', { name: /Check for updates|Download|Install/ }).count(), 0);
});

test('Updates stays readable in narrow light and dark layouts', async t => {
  const shots = fileURLToPath(new URL('../../desktop/target/update-notice-shots/', import.meta.url));
  await mkdir(shots, { recursive: true });
  for (const dark of [false, true]) {
    const page = await settingsFixture(t, { snapshot: { ...offered, phase: 'downloading', progress: 64, notes: 'One long release note. '.repeat(40) } });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(dark => document.documentElement.dataset.theme = dark ? 'dark' : 'light', dark);
    await page.getByRole('progressbar', { name: 'Download' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(shots, `settings-${dark ? 'dark' : 'light'}.png`) });
  }
});
