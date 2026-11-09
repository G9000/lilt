// Full app routes with disposable browser state, stubbed API and no owner server.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const shots = fileURLToPath(new URL('../../.tmp/introduction-shots/', import.meta.url));
const source = await readFile(new URL('../../content/courses/voice/index.md', import.meta.url), 'utf8');
const corner = await readFile(new URL('../../content/courses/voice/images/practice-corner.png', import.meta.url));
const home = source.replace(/^---[\s\S]*?---\s*/, '');
const courses = ['voice', 'drawing'].map(id => ({ id, title: id === 'voice' ? 'Your voice' : 'Drawing gently', summary: 'Explore at your own pace.', kind: id, version: '1', using: 'original', changes: 0, updates_waiting: 0, shown_in_app: true, locked_sections: [] }));
const texts = course => ({ home: course === 'voice' ? home : '# Drawing\n\nExplore the shapes around you.', levels: course === 'voice' ? [
  { id: 'start-here', level: 1, title: 'Start here', items: [], kind: 'phrases', basis: 'A quiet beginning.' },
  { id: 'warmup', level: 2, title: 'Warm-ups', kind: 'phrases', items: [{ id: 'hum-to-hello', text: 'Mm… hello.', hint: 'Let an easy hum become a greeting.' }] },
] : [{ id: 'lines', level: 1, title: 'A few lines', kind: 'phrases', basis: 'Look at a familiar shape.', items: [{ id: 'circles', text: 'Draw three circles.', hint: 'Notice the movement.' }] }] });
const server = await createIsolatedVite({ logLevel: 'error' });
let browser;
const errors = [], unexpected = [];
try {
  await mkdir(shots, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.micRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.micRequests++; window.lastMicRequest = { hash: location.hash, stack: new Error().stack }; throw new Error('No real microphone in this test'); };
    const query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = descriptor => descriptor.name === 'microphone'
      ? window.deferPermission ? new Promise(resolve => { window.releasePermission = () => resolve({ state: 'granted' }); }) : Promise.resolve({ state: 'granted' })
      : query(descriptor);
  });
  const setup = async page => {
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/texts/images/practice-corner.png', route => route.fulfill({ contentType: 'image/png', body: corner }));
    await page.route('**/healthz', route => route.fulfill({ json: { ok: true } }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()), p = url.pathname, course = url.searchParams.get('course') ?? 'voice';
      const send = json => route.fulfill({ json });
      if (p === '/api/reset') return send({ generation: 'intro-fixture', reset_id: null });
      if (p === '/api/today') return send({ reminder: { due: false }, latest_review: null });
      if (p === '/api/deck/session') return send({ id: 'intro-fixture' });
      if (p === '/api/courses') return send({ courses });
      if (p === '/api/texts') return send(texts(course));
      if (p === '/api/deck/today') return send({ items: [], counts: { new: 0, review: 0, again: 0 }, all_done: true, paused: false });
      if (p === '/api/profile') return send({ goal: { summary: '', descriptors: [] }, comfort_range_hz: null, session_minutes: 5 });
      if (p === '/api/history') return send({ takes: [] });
      if (p === '/api/photos') return send({ uploaded: [], hidden: [] });
      if (p === '/api/studio/session') return send({ id: 'intro-fixture' });
      if (p === '/api/sessions/intro-fixture') return send({ takes: [] });
      if (p.startsWith('/api/courses/voice/media/')) return route.fulfill({ status: 404 });
      unexpected.push(`${route.request().method()} ${p}`);
      return route.fulfill({ status: 503, json: { error: 'Not in fixture' } });
    });
  };
  const page = await context.newPage();
  await setup(page);
  const base = server.resolvedUrls.local[0];
  const welcome = () => page.getByRole('region', { name: 'Welcome to Lilt' });
  const next = () => page.getByRole('button', { name: 'Continue', exact: true }).click();
  const heading = name => page.getByRole('heading', { name, exact: true }).waitFor();
  const snapshot = name => page.screenshot({ path: path.join(shots, name) });
  await page.goto(base);
  await page.locator('.room-stage.settled').waitFor();
  await page.keyboard.press('Enter');
  await welcome().waitFor();
  assert.equal(new URL(page.url()).hash, '#/studio', 'room entry opens Home');
  assert.match(await welcome().innerText(), /I built Lilt for myself/);
  assert.match(await welcome().innerText(), /private place for self-directed learning/);
  assert.equal(await page.evaluate(() => window.micRequests), 0, 'Home does not open a granted microphone');
  await snapshot('home-light.png');
  await page.getByRole('link', { name: 'Your first practice', exact: true }).click();
  await heading('How practice works');
  await next();
  await heading('Settle in and breathe');
  assert.ok(await page.getByRole('button', { name: 'Continue', exact: true }).evaluate(el => el.getBoundingClientRect().height >= 40), 'Continue keeps the shared button size');
  assert.equal(await page.locator('h1').evaluate(el => el === document.activeElement), true, 'step heading receives focus');
  await page.reload();
  await heading('Settle in and breathe');
  await next();
  await heading('Try one small thing');
  assert.match(await page.locator('.first-practice').innerText(), /Mm… hello/);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await heading('Settle in and breathe');
  await snapshot('breathing-light.png');
  await page.getByRole('button', { name: 'Skip introduction', exact: true }).click();
  await heading('Whenever you’re ready');
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await page.reload();
  await welcome().getByRole('link', { name: 'Read the introduction again' }).click();
  await heading('How practice works');
  await next();
  await page.getByRole('link', { name: 'Back to Home' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.introduction.v1.voice')), 'skipped', 'leaving replay preserves skip');
  await welcome().getByRole('link', { name: 'Read the introduction again' }).click();
  for (let i = 0; i < 3; i++) await next();
  await page.getByRole('button', { name: 'Finish introduction' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.introduction.v1.voice')), 'complete');
  assert.equal(await page.evaluate(() => window.micRequests), 0, 'walkthrough needs no microphone even when permitted');
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await welcome().getByRole('link', { name: 'Go to Today' }).click();
  await page.waitForFunction(() => location.hash === '#/deck');
  assert.equal(await page.evaluate(() => localStorage.getItem('lilt.introduction.v1.voice')), 'complete', 'Today does not replace completion with skip');

  await page.goto(`${base}#/learn/drawing`);
  await welcome().getByRole('link', { name: 'Your first practice', exact: true }).click();
  await next();
  await heading('Make a little space');
  assert.doesNotMatch(await page.locator('.first-practice').innerText(), /voice|hum|breath/i);
  await next();
  assert.equal(await page.getByRole('link', { name: 'Open the first chapter' }).getAttribute('href'), '#/learn/drawing/chapter/lines');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: 'dark' })));
  await snapshot('drawing-phone-dark.png');
  assert.ok(await page.locator('.first-practice').evaluate(el => el.scrollWidth <= el.clientWidth + 1));

  // A permission lookup that resolves after navigation must not start a microphone on Home.
  await page.goto(`${base}#/studio`);
  await welcome().waitFor();
  await page.evaluate(() => { window.micRequests = 0; window.lastMicRequest = null; window.deferPermission = true; location.hash = '/studio/start'; });
  await page.waitForFunction(() => !!window.releasePermission);
  await page.evaluate(() => { location.hash = '/studio'; });
  await welcome().waitFor();
  await page.evaluate(() => window.releasePermission());
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.micRequests), 0, `late permission is cancelled: ${JSON.stringify(await page.evaluate(() => window.lastMicRequest))}`);
  await snapshot('home-phone-dark.png');

  // Releasing a pending microphone must not let its result replace a later recording visit.
  await page.evaluate(() => {
    window.deferPermission = false;
    window.pendingMics = [];
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
      const audio = new AudioContext();
      const stream = audio.createMediaStreamDestination().stream;
      window.pendingMics.push({ stream, resolve: () => resolve(stream), audio });
    });
    location.hash = '/studio/start';
  });
  await page.waitForFunction(() => window.pendingMics.length === 1);
  await page.evaluate(() => { location.hash = '/studio'; });
  await welcome().waitFor();
  await page.evaluate(() => { location.hash = '/studio/start'; });
  await page.waitForFunction(() => window.pendingMics.length === 2);
  await page.evaluate(() => { window.pendingMics[0].resolve(); window.pendingMics[1].resolve(); });
  await page.waitForFunction(() => window.pendingMics[0].stream.getTracks()[0].readyState === 'ended');
  assert.equal(await page.evaluate(() => window.pendingMics[1].stream.getTracks()[0].readyState), 'live', 'current recording keeps its microphone');
  await page.evaluate(() => { location.hash = '/studio'; });
  await welcome().waitFor();
  await page.waitForFunction(() => window.pendingMics[1].stream.getTracks()[0].readyState === 'ended');

  const blocked = await context.newPage();
  await setup(blocked);
  await blocked.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('storage blocked'); }; });
  await blocked.goto(`${base}#/learn/drawing`);
  await blocked.getByRole('link', { name: 'Go to Today', exact: true }).click();
  await blocked.getByRole('status').filter({ hasText: "couldn't save" }).waitFor();
  await blocked.goto(`${base}#/learn/drawing/welcome`);
  await blocked.getByRole('button', { name: 'Skip introduction' }).click();
  await blocked.getByRole('status').filter({ hasText: "couldn't save" }).waitFor();
  await blocked.getByRole('link', { name: 'Back to Home' }).click();
  await blocked.getByRole('link', { name: 'Read the introduction again' }).waitFor();
  await blocked.getByRole('link', { name: 'Go to Today', exact: true }).click();
  await blocked.getByRole('status').filter({ hasText: "couldn't save" }).waitFor();
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  assert.deepEqual(unexpected, [], 'no unhandled API requests');
  console.log('PASS introduction: Home, creator story, no microphone, progress, skip/replay/finish, course isolation, dark/phone, blocked storage');
} finally { await browser?.close(); await server.close(); }
