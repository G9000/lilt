// Exercise a scratch WebView2 launched with remote debugging and a synthetic microphone.
// LILT_DESKTOP_CDP=http://127.0.0.1:19223 node desktop/scripts/windows-smoke.mjs [evidence-folder]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const endpoint = process.env.LILT_DESKTOP_CDP;
assert(endpoint && /^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint), 'Set the scratch WebView2 debugging address.');
const output = path.resolve(process.argv[2] || 'desktop/target/windows-smoke-evidence');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts().flatMap(context => context.pages()).find(p => /^http:\/\/127\.0\.0\.1:\d+\//.test(p.url()));
assert(page, 'The native window must have loaded its local server.');
page.setDefaultTimeout(15000);
const base = new URL(page.url()).origin;
assert.notEqual(new URL(base).port, '7878', 'Never exercise the owner’s normal server.');
const storage = await page.evaluate(() => fetch('/api/storage').then(r => r.json()));
assert(/windows[- ](?:desktop[- ])?smoke/i.test(storage.data_path), 'Expected a named Windows smoke data folder.');
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/#/studio`);
  await page.getByRole('button', { name: 'Find my starting voice' }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  console.log('Recording from the synthetic microphone.');
  await page.getByRole('button', { name: 'Stop recording' }).waitFor();
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: 'Stop recording' }).focus();
  await page.getByRole('button', { name: 'Stop recording' }).press('Space');
  console.log('Waiting for the bundled analysis helper.');
  await page.getByRole('button', { name: 'Use it for now' }).waitFor({ timeout: 60000 });
  assert(/\d+ Hz/.test(await page.locator('body').innerText()), 'Bundled analysis must return a measured pitch.');
  await page.evaluate(() => {
    window.__liltSmokePlayback = [];
    // Listen-back keeps its Audio objects outside the DOM.
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      this.addEventListener('timeupdate', () => {
        if (this.currentTime > 0) window.__liltSmokePlayback.push({ time: this.currentTime, duration: this.duration, error: this.error?.message || null });
      });
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: /^Play / }).first().click();
  await page.waitForFunction(() => window.__liltSmokePlayback.length > 0);
  const playback = await page.evaluate(() => window.__liltSmokePlayback);
  assert(playback.every(a => !a.error && a.duration > 0), 'Recorded audio must decode and play.');
  await page.getByRole('button', { name: 'Use it for now' }).click();
  await page.getByText("You're all set.", { exact: true }).waitFor();
  const profile = await page.evaluate(() => fetch('/api/profile').then(r => r.json()));
  assert(Array.isArray(profile.comfort_range_hz), 'The practice result must save.');
  await page.screenshot({ path: path.join(output, 'native-practice.png') });
  assert.deepEqual(errors, [], 'Native page errors');
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ base, capture: 'WebView2 synthetic microphone', measuredPitch: true, playback, savedRange: profile.comfort_range_hz, pageErrors: errors }, null, 2));
  console.log('PASS native WebView2 recording, upload, bundled analysis, playback and saved starting range.');
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'failure.txt'), String(error));
  throw error;
} finally {
  await browser.close();
}
