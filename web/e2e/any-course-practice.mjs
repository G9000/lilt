// Full App routes in real Chrome; every API request stays in this disposable fixture.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';

const shots = fileURLToPath(new URL('../../.tmp/any-course-practice/', import.meta.url));
const courses = [['drawing', 'Drawing gently', 'drawing'], ['gardening', 'Growing herbs', 'custom'], ['voice', 'Your voice', 'voice'], ['empty', 'An empty course', 'custom']]
  .map(([id, title, kind]) => ({ id, title, kind, version: '1', source: null, summary: `Explore ${title.toLowerCase()} at your own pace.`, locked_sections: [], using: 'original', changes: 0, updates_waiting: 0, shown_in_app: true }));
const prompts = { drawing: ['Draw three loose circles.', 'Draw the outline of a leaf.'], gardening: ['Feel the soil before watering.', 'Find a bright place for your herbs.'], voice: ['Say a comfortable hello.', 'Let your voice settle.'] };
const chapterTitle = course => `${courses.find(c => c.id === course).title}: a beginning`;
const texts = course => ({ note: '', home: 'A little practice, in your own time.', levels: course === 'empty' ? [] : [{
  id: 'shared', level: 1, title: chapterTitle(course), subtitle: 'Try a small beginning', kind: 'phrase', part: 'Begin',
  basis: `Start with ${courses.find(c => c.id === course).title.toLowerCase()}.`,
  items: prompts[course].map((text, i) => ({ id: `item-${i + 1}`, text, hint: 'Take your time and notice what happens.' })),
}] });
const makeDeck = course => ({ local_date: '2026-11-07', paused: false, all_done: false, counts: { new: 2, review: 0, again: 0 }, open_stage: 1, cap: 8,
  items: (prompts[course] ?? []).map((front, i) => ({
    card: { id: `${course === 'voice' ? '' : `${course}/`}text.shared.item-${i + 1}`, prompt_id: `${course === 'voice' ? '' : `${course}/`}text.shared.item-${i + 1}`, front, hint: 'Take your time and notice what happens.', kind: 'text', deck: 'shared', deck_title: chapterTitle(course), level_id: 'shared', stage: 1, text_kind: 'phrase' },
    kind: 'new', done_today: false, rating_today: null, preview: { again: 'later today', hard: 'tomorrow', good: 'in 3 days', easy: 'in 5 days' },
    state: { reps: 0, interval_days: 0, due: null, lapses: 0, suspended: false },
  })) });
let server, browser, base;
before(async () => {
  await mkdir(shots, { recursive: true });
  server = await createIsolatedVite({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'error' });
  await server.listen();
  base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });

async function fixture(t) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
  const state = { decks: Object.fromEntries(courses.map(c => [c.id, makeDeck(c.id)])), reviews: [], applied: new Set(), voiceWrites: [], errors: [], mic: 0, failReview: false, loseReviewResponse: false, failDeck: false };
  await context.exposeFunction('courseTestMic', () => { state.mic++; });
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { await window.courseTestMic(); throw new Error('This course must not request a microphone.'); };
  });
  await context.route('**/healthz', route => route.fulfill({ json: { ok: true }, headers: { 'X-Lilt-Generation': 'course-test' } }));
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    const course = url.searchParams.get('course') ?? 'voice';
    const send = (json, status = 200) => route.fulfill({ status, json, headers: { 'X-Lilt-Generation': 'course-test' } });
    if (request.method() !== 'GET' && /\/(sessions?|takes)(\/|$)/.test(p)) state.voiceWrites.push(p);
    if (p === '/api/courses') return send({ courses });
    if (p === '/api/texts' || p.startsWith('/api/deck/')) {
      if (!state.decks[course]) return send({ error: 'This course is not installed.' }, 404);
      if (p === '/api/texts') return send(texts(course));
      if (p === '/api/deck/today') return state.failDeck ? send({ error: 'Cards are temporarily unavailable.' }, 503) : send(state.decks[course]);
      if (p === '/api/deck/review') {
        const body = request.postDataJSON(); state.reviews.push({ course, ...body });
        if (state.failReview) return send({ error: 'The choice could not be saved.' }, 503);
        const deck = state.decks[course], item = deck.items.find(i => i.card.id === body.card_id);
        assert.ok(item, 'review belongs to the selected course');
        if (state.applied.has(body.request_id)) return send({ card_id: body.card_id, duplicate: true, deck });
        state.applied.add(body.request_id);
        item.rating_today = body.rating; item.done_today = body.rating !== 'again';
        if (body.rating === 'again') deck.items = [...deck.items.filter(i => i !== item), item];
        deck.all_done = deck.items.every(i => i.done_today);
        if (state.loseReviewResponse) return route.abort('failed');
        return send({ card_id: body.card_id, deck });
      }
    }
    if (p === '/api/profile') return send({ goal: { summary: 'A little practice.', descriptors: [] }, comfort_range_hz: [100, 260], session_minutes: 5 });
    if (p === '/api/history') return send({ takes: [{ id: 'existing-baseline' }] });
    if (p === '/api/photos') return send({ uploaded: [], hidden: [] });
    if (p === '/api/studio/session') return send({ id: 'voice-session' });
    return send({ error: 'No live API in this isolated course test.' }, 503);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => state.errors.push(e.message));
  t.after(async () => { await context.close(); assert.deepEqual(state.errors, [], 'no unhandled page errors'); assert.equal(state.mic, 0, 'no microphone request'); });
  return { page, state, open: route => page.goto(`${base}#${route}`) };
}

const daily = page => page.getByRole('region', { name: "Today's course cards" });
const reveal = page => daily(page).getByRole('button', { name: 'Show hint', exact: true }).click();
const rating = (page, name) => daily(page).getByRole('button', { name: new RegExp(`^${name} `) });
async function screenshot(page, name) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page fits the viewport');
  const surface = await page.getByRole('main', { name: 'Course practice', exact: true }).boundingBox();
  assert.ok(surface.width >= page.viewportSize().width - 4, 'practice fills its desktop window');
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
}

test('generic course home, chapter and daily ratings work without voice capture', async t => {
  const { page, state, open } = await fixture(t);
  await open('/learn/drawing');
  await page.getByRole('heading', { name: 'Drawing gently', exact: true }).waitFor();
  await page.getByRole('link', { name: 'First chapter', exact: true }).click();
  await page.getByRole('heading', { name: chapterTitle('drawing'), exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start recording', exact: true }).count(), 0);
  await page.getByRole('link', { name: "Today's cards", exact: true }).click();
  await daily(page).getByText(prompts.drawing[0], { exact: true }).waitFor();
  await reveal(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => window.dispatchEvent(new CustomEvent('lilt:theme', { detail: theme })), theme);
    for (const [width, height] of [[1440, 950], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await rating(page, 'Good').scrollIntoViewIfNeeded();
      assert.ok(await rating(page, 'Good').isVisible());
      await screenshot(page, `today-${theme}-${width}`);
    }
  }
  await rating(page, 'Again').click();
  await daily(page).getByText(prompts.drawing[1], { exact: true }).waitFor();
  assert.deepEqual(state.reviews[0], { course: 'drawing', card_id: 'drawing/text.shared.item-1', take_id: null, rating: 'again', request_id: state.reviews[0].request_id });
  assert.match(state.reviews[0].request_id, /^[a-f0-9-]{36}$/);
  await reveal(page);
  state.failReview = true;
  await rating(page, 'Good').click();
  await daily(page).getByRole('alert').waitFor();
  assert.ok(await daily(page).getByText(prompts.drawing[1], { exact: true }).isVisible(), 'failed save keeps the current card');
  state.failReview = false;
  await daily(page).getByRole('button', { name: 'Try again', exact: true }).click();
  await daily(page).getByText(prompts.drawing[0], { exact: true }).waitFor();
  assert.deepEqual(state.reviews[1], state.reviews[2], 'retry preserves the card and rating');
  await reveal(page); await rating(page, 'Easy').click();
  await page.getByRole('heading', { name: "That's today's cards", exact: true }).waitFor();
  assert.ok(state.decks.drawing.all_done);
  assert.ok(state.decks.gardening.items.every(i => !i.done_today), 'another course keeps its schedule');
  assert.ok(state.decks.voice.items.every(i => !i.done_today), 'voice keeps its schedule');
  assert.deepEqual(state.voiceWrites, [], 'generic practice creates no voice sessions or takes');
});

test('chapter runs with identical IDs stay separate for two arbitrary courses and legacy voice', async t => {
  const { page, state, open } = await fixture(t);
  await open('/flashcards/shared?course=drawing');
  await page.getByLabel('0 of 3 cards done', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByLabel('1 of 3 cards done', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start recording', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByLabel('2 of 3 cards done', { exact: true }).waitFor();
  await open('/flashcards/shared?course=gardening');
  await page.getByLabel('0 of 3 cards done', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByLabel('1 of 3 cards done', { exact: true }).waitFor();
  assert.deepEqual(state.voiceWrites, [], 'neither arbitrary course opens a voice session');
  await open('/flashcards/shared');
  await page.getByLabel('0 of 3 cards done', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
  assert.ok(state.voiceWrites.includes('/api/studio/session'), 'legacy voice retains its recording session');
  await open('/flashcards/shared?course=drawing');
  await page.getByLabel('2 of 3 cards done', { exact: true }).waitFor();
  await page.reload();
  await page.getByLabel('2 of 3 cards done', { exact: true }).waitFor();
  await open('/flashcards/shared?course=gardening');
  await page.getByLabel('1 of 3 cards done', { exact: true }).waitFor();
});

test('room, desk, back and reload keep the selected course, while explicit URLs win', async t => {
  const { page, state, open } = await fixture(t);
  await open('/learn/drawing');
  await page.getByRole('heading', { name: 'Drawing gently', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Leave desk', exact: true }).click();
  await page.getByRole('button', { name: /^Flashcards: Drawing gently/ }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: /^Flashcards: Drawing gently/ }).click();
  await page.waitForURL('**/#/flashcards/shared?course=drawing');
  await page.goBack();
  await page.getByRole('button', { name: /^Flashcards: Drawing gently/ }).waitFor();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#/learn/drawing/today');
  await page.getByRole('link', { name: 'Back to the desk', exact: true }).click();
  await page.getByRole('article', { name: "Today's practice", exact: true }).getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForURL('**/#/learn/drawing/today');
  await open('/desk');
  await page.getByRole('navigation', { name: 'Apps', exact: true }).getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('heading', { name: 'Drawing gently', exact: true }).waitFor();
  await open('/desk');
  await page.getByRole('navigation', { name: 'Apps', exact: true }).getByRole('button', { name: 'Today', exact: true }).click();
  await daily(page).getByText(prompts.drawing[0], { exact: true }).waitFor();
  assert.deepEqual(state.voiceWrites, []);
  await open('/learn/gardening');
  await page.getByRole('heading', { name: 'Growing herbs', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Leave desk', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^Flashcards: Growing herbs/ }).waitFor();
});

test('empty, missing and failed course requests show useful states and can retry', async t => {
  const { page, state, open } = await fixture(t);
  await open('/learn/empty');
  await page.getByText('This course has no chapters yet.', { exact: true }).waitFor();
  await page.getByRole('link', { name: "Start today's cards", exact: true }).click();
  await page.getByRole('heading', { name: 'No cards for today', exact: true }).waitFor();
  await open('/learn/missing');
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /not installed/i);
  await open('/flashcards/shared?course=missing');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Got it', exact: true }).count(), 0);
  state.failDeck = true;
  await open('/learn/drawing/today');
  await daily(page).getByRole('alert').waitFor();
  state.failDeck = false;
  await daily(page).getByRole('button', { name: 'Try again', exact: true }).click();
  await daily(page).getByText(prompts.drawing[0], { exact: true }).waitFor();
  assert.deepEqual(state.voiceWrites, []);
});

test('empty course addresses fail and voice aliases use the voice screen', async t => {
  const { page, state, open } = await fixture(t);
  await open('/flashcards/shared?course=');
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /address isn't valid/);
  assert.equal(await page.locator('.fc-card').count(), 0);
  await open('/learn/voice/today');
  await page.waitForURL('**/#/deck');
  assert.equal(await daily(page).count(), 0, 'voice never renders the generic rating screen');
  assert.deepEqual(state.reviews, []);
});

test('a saved rating whose reply is lost keeps its retry identity', async t => {
  const { page, state, open } = await fixture(t);
  await open('/learn/drawing/today');
  await reveal(page);
  state.loseReviewResponse = true;
  await rating(page, 'Good').click();
  await daily(page).getByRole('alert').waitFor();
  assert.ok(state.decks.drawing.items[0].done_today, 'the server already saved the first request');
  state.loseReviewResponse = false;
  await daily(page).getByRole('button', { name: 'Try again', exact: true }).click();
  await daily(page).getByText(prompts.drawing[1], { exact: true }).waitFor();
  assert.deepEqual(state.reviews[0], state.reviews[1], 'the retry uses the exact same operation identity');
  assert.equal(state.applied.size, 1, 'one logical rating is applied');
  await reveal(page); await rating(page, 'Good').click();
  assert.notEqual(state.reviews[2].request_id, state.reviews[0].request_id, 'the next card gets a new identity');
});
