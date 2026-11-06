// Actual screens with disposable API responses; no owner data or microphone access.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const cover = await readFile(new URL('../../content/courses/voice/images/cover.webp', import.meta.url));
const items = ['mmmmmmm', 'Good morning. How are you?', 'Take your time.'].map((front, i) => ({
  kind: i ? 'review' : 'warmup', done_today: false, rating_today: null,
  card: { id: `text.warmup.${i}`, front, hint: 'Lips together, teeth apart. Try an easy note without pushing.', kind: 'text', stage: 1, deck: 'warmup', deck_title: 'Warm-ups', level_id: 'warmup', text_kind: 'phrase', prompt_id: `warmup.${i}` },
  preview: { again: 'later today', hard: 'tomorrow', good: 'in 3 days', easy: 'in 5 days' },
  state: { reps: 1, interval_days: 1, due: null, lapses: 0, suspended: false },
}));
const deck = { local_date: '2026-11-07', paused: false, items, counts: { new: 0, review: 2, again: 0 }, open_stage: 1, stages: 3, cap: 5 };
const guided = {
  local_date: '2026-11-07', session_minutes: 5, reminder: { due: false },
  participation: { days_this_week: 0 }, plan: { paused: false, rationale: 'One comfortable next step.' },
  exercise: { title: 'A gentle guided session', practice_task: { prompt_text: 'Try an easy sound.' }, source: { title: 'Practice guide', url: '#/studio' }, review: { status: 'reviewed' } },
  today_sessions: [], unfinished_session: null, latest_review: null, pending_jobs: 0,
};
const texts = { note: '', home_cover: 'images/cover.webp', home: '## Find a comfortable sound\n\nChoose one short practice, and rest whenever you need to.', levels: [
  { id: 'warmup', level: 1, title: 'Warm-ups', subtitle: 'Find an easy sound', kind: 'phrase', part: 'Begin gently', basis: 'Comfort comes first.', items: items.map((it, i) => ({ id: String(i), text: it.card.front, hint: it.card.hint })) },
  { id: 'everyday', level: 2, title: 'Everyday conversation', subtitle: 'A little room for your own words', kind: 'phrase', part: 'Keep exploring', basis: '', items: [] },
] };
// An isolated static preview can supply the production build; every API response remains stubbed.
const preview = process.env.LILT_UI_URL;
const server = preview ? null : await createIsolatedVite({ logLevel: 'error' });
await server?.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/texts/images/cover.webp', r => r.fulfill({ contentType: 'image/webp', body: cover }));
  await page.route('**/api/**', r => {
    const p = new URL(r.request().url()).pathname;
    const data = p === '/api/texts' ? texts : p === '/api/deck/today' ? deck : p === '/api/today' ? guided
      : p === '/api/profile' ? { comfort_range_hz: [100,260], goal: { summary: 'A comfortable everyday voice', descriptors: [] }, session_minutes: 5, timezone: 'Asia/Kuala_Lumpur' }
      : p === '/api/history' ? { takes: [] } : p === '/api/photos' ? { uploaded: [], hidden: [] }
      : p === '/api/deck/session' ? { id: 'ui-test', comfort: null } : null;
    return r.fulfill({ status: data ? 200 : 503, json: data ?? { error: 'Isolated UI preview' } });
  });
  const url = preview ?? server.resolvedUrls.local[0];
  const capture = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll('.ds.in, .ds.in .ds-boot, .ss.open')].every(el => Number(getComputedStyle(el).opacity) > .99));
    if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal page overflow`);
  };
  const usable = async control => {
    await control.scrollIntoViewIfNeeded();
    assert.ok(await control.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.height >= 43 && r.left >= 0 && r.right <= innerWidth + 1 && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), 'main action has a reachable touch target');
  };
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${url}#/studio`);
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await page.getByRole('heading', { name: 'Your practice', exact: true }).waitFor();
    const start = page.getByRole('button', { name: "Start today's cards", exact: true });
    await usable(start);
    await capture(`home-${width}-${theme}`);
    await page.getByText('Course guide', { exact: false }).filter({ has: page.locator('span') }).first().click();
    await page.getByRole('heading', { name: 'Find a comfortable sound' }).waitFor();
    await start.click();
    await page.getByRole('button', { name: 'Start recording', exact: true }).waitFor();
    await capture(`today-${width}-${theme}`);
    await page.goto(`${url}#/settings`);
    await page.locator('.sx').waitFor();
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    if (width < 700) await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.locator('.sx-hero h1').waitFor();
    await usable(page.getByRole('button', { name: 'Reset to orange', exact: true }));
    await page.locator('.sx-body').evaluate(el => { el.scrollTop = 0; });
    await capture(`settings-${width}-${theme}`);
    await page.evaluate(() => document.documentElement.dataset.text = 'largest');
    await capture(`settings-large-${width}-${theme}`);
    await page.evaluate(() => document.documentElement.dataset.text = 'normal');
    await page.keyboard.press('Escape');
    await page.locator('.ss[aria-hidden="true"]').waitFor({ state: 'attached' });
    await page.goto(`${url}#/desk`);
    await page.locator('.ds-today').waitFor();
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await usable(page.locator('.ds-today .btn-primary'));
    await capture(`desktop-today-${width}-${theme}`);
    await page.goto(`${url}#/guided`);
    await page.getByRole('heading', { name: 'A gentle guided session' }).waitFor();
    const guidedStart = page.getByRole('button', { name: 'Start today', exact: true });
    await usable(guidedStart);
    const plan = await page.locator('.vplan').boundingBox();
    const action = await guidedStart.boundingBox();
    assert.ok(plan && action && action.width > plan.width * .85, 'guided action spans the plan panel');
    await capture(`guided-${width}-${theme}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Course Home, Today, Settings, desktop Today and guided practice in both themes and phone/desktop sizes.');
} finally { await browser?.close(); await server?.close(); }
