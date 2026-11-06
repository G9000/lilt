// Verify manual placement and the always-available reset against disposable API fixtures.
import { chromium } from 'playwright-core';
import { createIsolatedVite as createServer } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
const density = Number(process.env.LILT_TEST_DPR ?? 1);
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1880, height: 920 }, deviceScaleFactor: density, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const deck = { local_date: '2026-11-05', paused: false, counts: { new: 5, review: 0, again: 0 }, open_stage: 1, cap: 5,
    participation: { days_this_week: 0, dates_this_week: [], practised_today: false },
    items: Array.from({ length: 5 }, (_, i) => ({ kind: 'warmup', done_today: false,
      card: { id: `test-${i}`, front: `Comfortable hum ${i + 1}`, hint: 'Lips together, teeth apart. Try an easy note for a few seconds, without pushing.', deck_title: 'Warm-ups', kind: 'text' } })) };
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
  assert.equal(await page.getByRole('button', {name:'Reset layout',exact:true}).isVisible(), true, 'reset stays available after resetting');
  const inspect = async label => {
    await page.waitForTimeout(650); // Let the card spring and widget fit interval settle.
    const result = await page.evaluate(() => {
      const widgets = [...document.querySelectorAll('.fl')];
      return widgets.map(el => ({
        name: el.querySelector('[aria-label]').getAttribute('aria-label'),
        x: parseFloat(el.style.left), y: parseFloat(el.style.top), moved: el.classList.contains('moved'),
      }));
    });
    if (shots) await page.screenshot({ path: path.join(shots, `layout-${label}${density === 1 ? '' : `-${density}x`}.png`) });
    const defaults = { "What's new":[680,170], Settings:[1090,180], Clock:[930,270], 'This week':[490,630], Flashcards:[800,640], 'Ball of yarn':[1060,720], Note:[460,260], 'Tea break timer':[935,540] };
    for (const widget of result) {
      assert.deepEqual([widget.x,widget.y], defaults[widget.name], `${label}: ${widget.name} returns to its original home`);
      assert.equal(widget.moved, false, `${label}: saved placement is cleared`);
    }
    const reset = page.getByRole('button', {name:'Reset layout',exact:true});
    if (page.viewportSize().width >= 1200) {
      const stack = await page.locator('.cs').boundingBox();
      assert.ok(page.viewportSize().width - stack.x - stack.width <= 41, `${label}: today's practice returns to the right corner`);
    }
    assert.equal(await reset.isVisible(), true, `${label}: reset remains visible`);
    // Nothing that shows covers another widget, today's cards or the room's shortcuts strip.
    const crowded = await page.evaluate(() => {
      const box = el => el.getBoundingClientRect();
      const shown = [...document.querySelectorAll('.fl')].filter(el => !el.classList.contains('off'))
        .map(el => ({ n: el.querySelector('[aria-label]').getAttribute('aria-label'), b: box(el.querySelector('.fl-nudge')) }));
      const sc = document.querySelector('.room-object-shortcuts');
      if (sc && getComputedStyle(sc).display !== 'none') shown.push({ n: 'shortcuts', b: box(sc) });
      const cs = document.querySelector('.cs'); if (cs) shown.push({ n: 'cards', b: box(cs) });
      const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4;
      const out = [];
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (hit(shown[i].b, shown[j].b)) out.push(`${shown[i].n} × ${shown[j].n}`);
      return out;
    });
    assert.deepEqual(crowded, [], `${label}: widgets keep clear of each other`);
    assert.equal(await reset.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), true, `${label}: reset is reachable`);
    console.log(`PASS ${label}: original positions restored; Reset layout remains available`);
  };
  await inspect('wide');
  const sizes = density === 1
    ? [[2560,1440],[3440,1440],[3840,2160],[1440,950],[1280,720],[1024,768],[1024,1366],[768,1024],[800,600]]
    : [[1920,1080]]; // A 4K display at 200% scaling has a 1920×1080 CSS viewport.
  for (const [width, height] of sizes) {
    await page.setViewportSize({width,height});
    await page.evaluate(async () => {
      const { setSpot } = await import('/src/desk/Floaters.tsx');
      setSpot('stack', { x: -70, y: -30 });
      setSpot('yarn', { x: 1300, y: 220 });
    });
    await page.getByRole('button', {name:'Reset layout',exact:true}).click();
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
  assert.ok(Math.abs(after.x - before.x - 60) < 3 && Math.abs(after.y - before.y - 35) < 3, 'manual dragging keeps the chosen position');
  await page.reload();
  await page.locator('.fl-cards').waitFor();
  await page.waitForTimeout(650);
  const restored = await note.boundingBox();
  assert.ok(Math.abs(restored.x - after.x) < 3 && Math.abs(restored.y - after.y) < 3, 'dragged positions survive reload');
  await page.getByRole('button', {name:'Reset layout',exact:true}).click();
  await inspect('reset-again');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', {name:'Reset layout',exact:true}).click();
  await inspect('phone-reset');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await inspect('phone-dark');
  deck.paused = true;
  await page.reload();
  await page.locator('.cs-phrase', { hasText: 'Resting today' }).waitFor();
  await inspect('resting');
  deck.paused = false;
  deck.items = [];
  deck.all_done = true;
  await page.reload();
  await page.locator('.cs-phrase', { hasText: 'All done' }).waitFor();
  await inspect('done');
  assert.deepEqual(errors, []);
  console.log('PASS: original manual layout, drag persistence and reset visibility at desktop and phone sizes.');
} finally { await browser?.close(); await server.close(); }
