// Real HTTP + production UI, always on a new private data folder and free port.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../..', import.meta.url));
const binary = process.env.LILT_TEST_BINARY || path.join(root, 'server/target/yarn-check/debug', process.platform === 'win32' ? 'lilt.exe' : 'lilt');
const web = process.env.LILT_TEST_WEB || path.join(root, '.tmp/reset-web');
await mkdir(path.join(root, '.tmp'), { recursive: true });
const scratch = await mkdtemp(path.join(root, '.tmp/reset-live-'));
const data = path.join(scratch, 'data');
const control = path.join(scratch, '.data.lilt-backups');
await mkdir(data);
await writeFile(path.join(data, 'private-fixture.txt'), 'erase this synthetic data');
await writeFile(path.join(data, 'oauth.json'), '{}');
await writeFile(path.join(scratch, 'downloaded-copy.zip'), 'keep exported copy');
const probe = createServer();
probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const url = `http://127.0.0.1:${port}`;
const server = spawn(binary, ['serve'], { cwd: root, windowsHide: true, env: {
  ...process.env, LILT_DATA_DIR: data, LILT_BIND: `127.0.0.1:${port}`, LILT_WEB_DIR: web,
  LILT_CONTENT_DIR: path.join(root, 'content'), LILT_MCP_TOKEN: '', LILT_DESKTOP_TOKEN: '', LILT_ALLOWED_HOSTS: '',
}, stdio: ['ignore', 'ignore', 'pipe'] });
let serverLog = '', browser;
server.stderr.on('data', chunk => { serverLog += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    try { if ((await fetch(`${url}/healthz`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, serverLog);
  const initial = await (await fetch(`${url}/api/reset`)).json();
  const backupResponse = await fetch(`${url}/api/backups`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lilt-Generation': initial.generation }, body: '{}' });
  assert.equal(backupResponse.status, 200, await backupResponse.text());
  assert.ok((await readdir(control)).some(name => name.endsWith('.zip')));
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
  const page = await context.newPage();
  const errors = [], resets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/reset' && request.method() === 'POST') resets.push(request); });
  await page.goto(url);
  const settings = page.getByRole('banner').getByRole('button', { name: 'Settings', exact: true });
  await settings.waitFor({ timeout: 20000 });
  await page.evaluate(async () => {
    localStorage.setItem('lilt.reset-fixture', 'old room choice');
    localStorage.setItem('unrelated-fixture', 'keep');
    sessionStorage.setItem('lilt.reset-fixture', 'old session');
    const cache = await caches.open('lilt-monitor-media-v1');
    await cache.put('/fixture-image', new Response('old image'));
  });
  await settings.click();
  await page.getByRole('button', { name: 'Storage', exact: true }).click();
  await page.getByRole('button', { name: 'Reset all data…', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Delete all data', exact: true });
  assert.ok(await confirm.isDisabled());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await readFile(path.join(data, 'private-fixture.txt'), 'utf8'), 'erase this synthetic data');
  assert.equal(resets.length, 0);
  await page.getByRole('button', { name: 'Reset all data…', exact: true }).click();
  await page.getByLabel('Type DELETE ALL DATA to confirm').fill('DELETE ALL DATA');
  await page.screenshot({ path: path.join(scratch, 'reset-warning.png'), fullPage: true });
  await confirm.click();
  await page.getByRole('heading', { name: 'Lilt data has been reset' }).waitFor({ timeout: 20000 });
  assert.equal(resets.length, 1);
  assert.equal((await readdir(data)).includes('private-fixture.txt'), false);
  assert.equal((await readdir(data)).includes('oauth.json'), false);
  assert.ok((await readdir(control)).every(name => ['transition.lock', 'data-use.lock', 'generation.json', 'reset-marker.json'].includes(name)));
  assert.equal(await readFile(path.join(scratch, 'downloaded-copy.zip'), 'utf8'), 'keep exported copy');
  assert.deepEqual(await page.evaluate(async () => ({ local: localStorage.getItem('lilt.reset-fixture'), session: sessionStorage.getItem('lilt.reset-fixture'), other: localStorage.getItem('unrelated-fixture'), media: await caches.has('lilt-monitor-media-v1') })), { local: null, session: null, other: 'keep', media: false });
  const current = await (await fetch(`${url}/api/reset`)).json();
  assert.notEqual(current.generation, initial.generation);
  const stale = await fetch(`${url}/api/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Lilt-Generation': initial.generation }, body: '{}' });
  assert.equal(stale.status, 409);
  await page.getByRole('button', { name: 'Open Lilt', exact: true }).click();
  await settings.waitFor({ timeout: 20000 });
  await page.evaluate(() => localStorage.setItem('lilt.reset-fixture', 'new choice'));
  await page.reload(); await settings.waitFor({ timeout: 20000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.reset-fixture')), 'new choice');
  assert.deepEqual(errors, []);
  console.log(`PASS real reset, warning/cancel, one POST, server files/backups, browser stores, stale writes and post-reset persistence. Evidence: ${scratch}`);
} finally {
  await browser?.close();
  if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
  await writeFile(path.join(scratch, 'server.log'), serverLog);
}
