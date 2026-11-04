// Reset and resize the real room against disposable API fixtures, never practice data.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1880, height: 920 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const deck = { local_date: '2026-11-05', paused: false, counts: { new: 5, review: 0, again: 0 }, open_stage: 1, cap: 5,
    participation: { days_this_week: 0, dates_this_week: [], practised_today: false },
    items: Array.from({ length: 5 }, (_, i) => ({ kind: 'warmup', done_today: false,
      card: { id: `test-${i}`, front: `Comfortable hum ${i + 1}`, deck_title: 'Warm-ups', kind: 'text' } })) };
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname === '/api/deck/today' ? deck
      : pathname === '/api/profile' ? { goal: { summary: 'A comfortable voice for everyday conversation.' } }
      : pathname === '/api/texts' ? { levels: [{ id: 'start', title: 'Start here', basis: 'Settle in and get comfortable.', items: [] }] }
      : pathname === '/api/photos' ? { uploaded: [], hidden: [] } : null;
    return route.fulfill({ status: data ? 200 : 503, json: data ?? { error: 'Isolated layout test' } });
  });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('.fl-cards').waitFor();
  await page.waitForTimeout(2200); // Initial card dealing must finish before measuring/resetting.
  // Start with saved positions, then exercise the actual reset button.
  await page.evaluate(async () => {
    const { setSpot } = await import('/src/desk/Floaters.tsx');
    setSpot('stack', { x: -70, y: -30 });
    setSpot('yarn', { x: 1300, y: 220 });
  });
  await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.ds-reset'));
  const inspect = async label => {
    await page.waitForTimeout(650); // Let the card spring and widget fit interval settle.
    const result = await page.evaluate(() => {
      const stack = document.querySelector('.cs').getBoundingClientRect();
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const widgets = [...document.querySelectorAll('.fl')];
      return widgets.map(el => ({
        name: el.querySelector('[aria-label]').getAttribute('aria-label'),
        hidden: el.classList.contains('off'),
        overlap: overlaps(el.querySelector('.fl-nudge').getBoundingClientRect(), stack),
        neighbours: widgets.filter(other => other !== el && overlaps(el.querySelector('.fl-nudge').getBoundingClientRect(), other.querySelector('.fl-nudge').getBoundingClientRect())).map(other => other.querySelector('[aria-label]').getAttribute('aria-label')),
      }));
    });
    if (shots) await page.screenshot({ path: path.join(shots, `layout-${label}.png`) });
    console.log(label, result);
    for (const widget of result) {
      assert.equal(widget.hidden, false, `${label}: ${widget.name} must remain available after reset`);
      assert.equal(widget.overlap, false, `${label}: Today's practice must not cover ${widget.name}`);
      assert.deepEqual(widget.neighbours, [], `${label}: ${widget.name} must not cover another widget`);
    }
  };
  await inspect('wide');
  for (const [width, height] of [[1440,950],[1024,768],[1024,1366]]) {
    await page.setViewportSize({width,height});
    await inspect(`${width}-${height}`);
  }
  await page.setViewportSize({width:1024,height:768});
  await page.waitForTimeout(650);
  const note = page.getByRole('group', {name:'Note',exact:true}).locator('.fl-nudge');
  const before = await note.boundingBox();
  await page.mouse.move(before.x + 30, before.y + 30);
  await page.mouse.down();
  await page.mouse.move(before.x + 90, before.y + 65, {steps:12});
  await page.mouse.up();
  await page.waitForTimeout(650);
  const after = await note.boundingBox();
  assert.ok(Math.abs(after.x - before.x - 60) < 3 && Math.abs(after.y - before.y - 35) < 3, 'dragging an automatically spaced widget must not jump');
  await page.reload();
  await page.locator('.fl-cards').waitFor();
  await page.waitForTimeout(650);
  const restored = await note.boundingBox();
  assert.ok(Math.abs(restored.x - after.x) < 3 && Math.abs(restored.y - after.y) < 3, 'dragged positions survive reload');
  await page.getByRole('button', {name:'Reset layout',exact:true}).click();
  await inspect('reset-again');
  assert.deepEqual(errors, []);
  console.log('PASS: reset keeps room widgets separate from today’s cards across desktop sizes.');
} finally { await browser?.close(); await server.close(); }
