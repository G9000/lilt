// Isolated UI and recording flow. All API writes stay in this in-memory fixture.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const wav = fileURLToPath(new URL('./fake-mic.wav', import.meta.url));
const audio = await readFile(wav);
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
const makeItem = (id, front, kind = 'new', eyes_off = false) => ({
  card: { id, front, kind: 'text', level_id: 'warmup', deck: 'warmup', deck_title: 'Finding an easy voice', hint: 'Say it gently, in your everyday voice.', stage: 1, text_kind: 'phrase', prompt_id: id },
  kind, eyes_off, done_today: false, rating_today: null,
  preview: { again: 'later today', hard: 'tomorrow', good: 'in 3 days', easy: 'in 5 days' },
  state: { reps: 3, interval_days: 2, due: null, lapses: 0, suspended: false },
});
let deck, takes = new Map(), reviews = [], history = [], patches = [];
function reset(items) { deck = { local_date: '2026-11-05', paused: false, items: items ?? [makeItem('first', 'Good morning. How are you today?'), makeItem('second', 'There is no hurry. Take your time.', 'review', true), makeItem('last', 'Let your voice settle.', 'cooldown')], counts: { new: 1, review: 1, again: 0 }, open_stage: 1, cap: 8 }; reviews = []; }
reset();
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, permissions: ['microphone'], reducedMotion: 'reduce' });
  const errors = [];
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    const send = json => route.fulfill({ json });
    if (p === '/api/texts') return send({ note: '', levels: [{ id: 'warmup', level: 1, title: 'Finding an easy voice', subtitle: 'A gentle start', kind: 'phrase', basis: 'Find a comfortable sound.', items: [], part: 'Get ready' }] });
    if (p === '/api/deck/today') return send(deck);
    if (p === '/api/profile') return send({ comfort_range_hz: [100,260], goal: { summary: 'A comfortable everyday voice', descriptors: [] }, session_minutes: 5 });
    if (p === '/api/history') return send({ takes: history });
    if (p === '/api/deck/session' || p.startsWith('/api/sessions/')) return send({ id: 'scratch-session', comfort: null });
    if (p === '/api/takes' && request.method() === 'POST') {
      const body = request.postDataJSON();
      const take = { ...body, id: body.take_id, status: 'recording', created_utc: '2026-11-05T00:00:00Z', duration_s: 2, audio_url: `/api/takes/${body.take_id}/audio` };
      takes.set(take.id, take); return send(take);
    }
    if (/\/chunks\//.test(p)) return send({ saved: true });
    if (p.endsWith('/finalize')) { const t = takes.get(p.split('/')[3]); t.status = 'review_ready'; t.analysis_summary = { f0_median_hz: 160, duration_s: 2 }; return send(t); }
    if (p.endsWith('/audio')) return route.fulfill({ contentType: 'audio/wav', body: audio });
    if (p.endsWith('/analysis')) return send({ measures: { f0_median_hz: { value: 160 }, f0_p10_hz: { value: 150 }, f0_p90_hz: { value: 170 }, voiced_frame_coverage: { value: 0.9 } }, quality_flags: [], contour: { f0_hz: [150,160,170,160], time_step_s: 0.5, t0_s: 0 } });
    if (/^\/api\/takes\/[^/]+$/.test(p)) {
      const take = takes.get(p.split('/')[3]);
      if (request.method() === 'PATCH') { const patch = request.postDataJSON(); patches.push(patch); Object.assign(take, patch); }
      return send(take);
    }
    if (p === '/api/deck/review') {
      const body = request.postDataJSON(); reviews.push(body);
      deck = { ...deck, paused: body.rating === 'ouch', items: deck.items.map(it => it.card.id === body.card_id ? { ...it, done_today: body.rating !== 'again' && body.rating !== 'ouch', rating_today: body.rating } : it) };
      return send({ deck });
    }
    if (p === '/api/plan/resume') { deck.paused = false; return send({}); }
    return route.fulfill({ status: 503, json: { error: 'Isolated deck test' } });
  });
  const page = await context.newPage();
  page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
  await page.goto(`${server.resolvedUrls.local[0]}#/deck`);
  await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
  if (shots) await page.screenshot({ path: path.join(shots, 'deck-initial.png') });
  assert.equal(await page.locator('.sd-current').count(), 1, 'one current stationery card');
  const fits = async control => {
    await control.scrollIntoViewIfNeeded(); const b = await control.boundingBox(), v = page.viewportSize();
    assert.ok(b && b.x >= 0 && b.x + b.width <= v.width + 1 && b.y >= 0 && b.y + b.height <= v.height + 1, 'control fits');
    assert.ok(await control.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), 'control reachable');
  };
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
  for (const [width,height] of [[1440,950],[1024,768],[3440,1440],[3840,2160],[390,844]]) {
    await page.setViewportSize({ width, height });
    await fits(page.getByRole('button', { name: 'Start recording', exact: true }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await shot(`deck-ready-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.locator('.sd-help > summary').click();
  assert.ok(await page.locator('.sd-help > p').isVisible());
  await page.locator('.sd-help > summary').click();
  let checkDisclosures = true;
  const record = async (after = 'How did that feel?') => {
    const count = takes.size;
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor();
    assert.ok(await page.locator('.sd-queue-pick').evaluateAll(els => els.every(el => el.disabled)), 'selection locked during recording');
    assert.equal(await page.locator('.sd-current .dk-cat.watch .dk-cat-say').innerText(), "i'm listening :3", 'the cat on the card listens while you record');
    if (checkDisclosures) {
      await page.locator('.sd-tips > summary').click();
      assert.ok(await page.locator('.sd-tips .notes').isVisible());
      await fits(page.getByRole('button', { name: 'Stop recording', exact: true }));
      await shot('deck-recording-tips');
      await page.locator('.sd-tips > summary').click();
      checkDisclosures = false;
    }
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await page.getByText(after, { exact: true }).waitFor();
    assert.equal(await page.locator('.sd-current .dk-cat-say').count(), 0, 'the cat goes quiet when you stop');
    assert.equal(await page.locator('.sd-current .dk-cat-heart').count(), 1, 'and a heart floats up');
    assert.ok(await page.locator('.sd-queue-pick').evaluateAll(els => els.every(el => el.disabled)), 'selection locked while reviewing');
    assert.equal(takes.size, count + 1, 'one take per recording');
  };
  await record();
  await page.getByRole('button', { name: 'Play your recording', exact: true }).click();
  await page.locator('.prc-player').getByRole('button', { name: 'Pause', exact: true }).waitFor();
  await page.locator('.prc-player').getByRole('button', { name: 'Pause', exact: true }).click();
  for (const [width,height] of [[1440,950],[3840,2160],[390,844]]) {
    await page.setViewportSize({ width,height });
    await fits(page.getByRole('button', { name: 'Good, next in 3 days', exact: true }));
    await fits(page.getByRole('button', { name: 'It hurts or feels strained', exact: true }));
    await shot(`deck-rating-${width}`);
  }
  await page.getByRole('button', { name: 'Record it again', exact: true }).click();
  await record();
  assert.ok([...takes.values()].at(-1).retry_of, 'retry retains original take');
  await page.keyboard.press('1');
  await page.locator('.sd-current').filter({ hasText: 'There is no hurry.' }).waitFor();
  assert.equal(reviews.at(-1).rating, 'again');
  await record();
  assert.equal(await page.locator('.sd-current .tr-pitch').count(), 0, 'eyes-off details wait for rating');
  await page.keyboard.press('3');
  await page.getByRole('button', { name: 'Next card', exact: true }).waitFor();
  await page.locator('.sd-current .tr-pitch').waitFor();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await page.locator('.sd-current').filter({ hasText: 'Good morning.' }).waitFor();
  await page.locator('.sd-upcoming > summary').click();
  await page.getByRole('button', { name: /Practise Let your voice settle/ }).click();
  await page.locator('.sd-current').filter({ hasText: 'Let your voice settle.' }).waitFor();
  await record();
  assert.equal(await page.getByRole('button', { name: /^Again,/ }).count(), 0, 'daily cards have no Again choice');
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await record();
  await page.keyboard.press('3');
  await page.getByRole('heading', { name: "That's today's deck" }).waitFor();
  assert.equal(await page.locator('.sd-slip-lede').innerText(), 'You said three cards out loud today.', 'the day ends with a slip of what you said');
  assert.match(await page.locator('.sd-slip li').first().innerText(), /Good morning/, 'grouped by chapter');
  assert.equal(await page.locator('.sd-slip .ve-tag').count(), 0, 'the slip shows no ratings');
  assert.doesNotMatch(await page.locator('.sd-slip').innerText(), /score|missed|well done|perfect|%/i, 'the slip never grades');
  assert.equal(await page.locator('.sd-heading .sd-pile i').count(), 4, 'finished cards make a small pile by the count');
  await shot('deck-complete');
  reset(); await page.reload();
  await page.getByRole('button', { name: 'It hurts or feels strained', exact: true }).click();
  await page.getByRole('heading', { name: "Let's stop here" }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start recording', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'I feel fine, resume', exact: true }).click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
  reset([makeItem('first', 'An earlier card.'), makeItem('selected', 'The card you chose.')]);
  await page.goto(`${server.resolvedUrls.local[0]}#/deck?card=selected`);
  await page.locator('.sd-current').filter({ hasText: 'The card you chose.' }).waitFor();
  await page.locator('.sd-upcoming > summary').click();
  await page.locator('.sd-queue-pick').focus(); await page.keyboard.press('Enter');
  await page.locator('.sd-current').filter({ hasText: 'An earlier card.' }).waitFor();
  assert.ok(await page.locator('.sd-current').evaluate(el => el === document.activeElement), 'new current card receives focus');
  const comparison = makeItem('comparison', 'Read this in your everyday voice.', 'before_after');
  reset([comparison]); await page.goto(`${server.resolvedUrls.local[0]}#/deck`); await page.reload();
  await page.getByRole('button', { name: 'Not today', exact: true }).click();
  await page.getByRole('heading', { name: "That's today's deck" }).waitFor();
  assert.equal(reviews.at(-1).rating, 'later');
  reset([comparison]); history = [{ id: 'old', created_utc: '2026-10-01T00:00:00Z', audio_url: '/api/takes/old/audio' }];
  await page.reload(); await record('Now');
  await page.getByText('Your first take,', { exact: false }).waitFor();
  for (const group of await page.locator('.ve-ba-q').all()) await group.getByRole('button', { name: '3', exact: true }).click();
  await fits(page.getByRole('button', { name: 'Save and carry on', exact: true }));
  await shot('deck-before-after-phone');
  await page.getByRole('button', { name: 'Save and carry on', exact: true }).click();
  await page.getByRole('heading', { name: "That's today's deck" }).waitFor();
  assert.deepEqual(patches.at(-1).self_report, { satisfied: '3', like_me: '3', ease: '3' });
  history = [];
  reset([makeItem('long', 'The window was open and a quiet breeze moved through the room. '.repeat(18))]);
  await page.reload();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
  await fits(page.getByRole('button', { name: 'Start recording', exact: true }));
  await shot('deck-long-phone-dark');
  reset(); await page.reload();
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); document.documentElement.setAttribute('data-text','largest'); });
  await fits(page.getByRole('button', { name: 'Start recording', exact: true }));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'largest text stays within phone');
  await shot('deck-largest-phone-dark');
  await record();
  await fits(page.getByRole('button', { name: 'Good, next in 3 days', exact: true }));
  await shot('deck-largest-rating-phone-dark');
  assert.deepEqual(errors, []);
  console.log('PASS: stationery deck layout, recording/retry, ratings, Again order, eyes-off reveal, selection, end and comfort stop');
} finally { await browser?.close(); await server.close(); }
