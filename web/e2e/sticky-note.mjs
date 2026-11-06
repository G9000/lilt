// The room's sticky note: paper, washi tape and size, against a stubbed API, in light and dark.
// Run: node e2e/sticky-note.mjs [screenshot-directory]
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
let browser;
const check = (name, ok, detail = '') => { assert.ok(ok, `${name}${detail ? ` — ${detail}` : ''}`); console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); };

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let profile = { goal: { summary: 'A comfortable voice for everyday conversation.' } };
    const deck = { local_date: '2026-11-06', paused: false, counts: { new: 1, review: 0, again: 0 }, open_stage: 1, cap: 5,
      participation: { days_this_week: 0, dates_this_week: [], practised_today: false },
      items: [{ kind: 'warmup', done_today: false, card: { id: 'test-0', front: 'Comfortable hum', deck_title: 'Warm-ups', kind: 'text' } }] };
    await page.route('**/api/**', async route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      if (pathname === '/api/profile' && req.method() === 'PUT') { profile = req.postDataJSON(); return route.fulfill({ json: profile }); }
      const data = pathname === '/api/deck/today' ? deck : pathname === '/api/profile' ? profile
        : pathname === '/api/texts' ? { levels: [{ id: 'start', title: 'Start here', basis: 'Settle in.', items: [] }] }
        : pathname === '/api/photos' ? { uploaded: [], hidden: [] } : null;
      return route.fulfill({ status: data ? 200 : 503, json: data ?? { error: 'Isolated note test' } });
    });
    await page.goto(url);
    await page.evaluate(() => { localStorage.removeItem('lilt.room.note'); localStorage.removeItem('lilt.room.layout.cel-studio.2'); });
    await page.reload();
    const sticky = page.locator('.fl-sticky');
    await sticky.waitFor();
    await page.locator('.room-stage.settled').waitFor({ timeout: 15000 });
    const size = () => sticky.evaluate(el => ({ w: el.offsetWidth, h: el.offsetHeight }));
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('lilt.room.note') ?? 'null'));
    const typing = () => page.evaluate(() => document.activeElement?.matches('.fl-sticky textarea'));

    check(`${scheme}: the note starts as before, yellow with pink-striped tape`, (await size()).w === 160 && await page.locator('.fl-washi.tape-stripes').count() === 1);
    check(`${scheme}: no tray until you write on it`, await page.locator('.fl-note-tools').count() === 0);

    await sticky.click();
    await page.locator('.fl-note-tools').waitFor();
    check(`${scheme}: writing on it opens a tray of papers and tapes`,
      await page.locator('.fl-swatch').count() === 6 && await page.locator('.fl-tape-pick').count() === 6);
    await page.getByRole('button', { name: 'Lilac', exact: true }).click();
    await page.getByRole('button', { name: 'Confetti', exact: true }).click();
    check(`${scheme}: choosing keeps the cursor in the note`, await typing());
    check(`${scheme}: the chosen paper and tape show and are marked`,
      await page.locator('.fl-washi.tape-confetti').count() === 1
      && await page.getByRole('button', { name: 'Lilac', exact: true }).getAttribute('aria-pressed') === 'true'
      && (await sticky.evaluate(el => getComputedStyle(el).backgroundImage)).includes('242, 234, 254'));
    check(`${scheme}: they're kept in this browser`, (await saved())?.paper === 'lilac' && (await saved())?.tape === 'confetti');
    if (shots) await page.screenshot({ path: path.join(shots, `note-tray-${scheme}.png`), clip: { x: 200, y: 40, width: 520, height: 420 } });

    // Drag the top-right corner: it follows the pointer, wider and taller.
    const before = await size(), corner = await page.locator('.fl-note-size').boundingBox();
    const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y - 24, { steps: 6 }); await page.mouse.up();
    const after = await size(), moved = await page.locator('.fl-note-size').boundingBox();
    check(`${scheme}: dragging the corner resizes the note`, after.w > before.w + 40 && after.h > before.h + 15, `${before.w}×${before.h} → ${after.w}×${after.h}`);
    check(`${scheme}: the corner stays under the pointer`, Math.abs(moved.x - corner.x - 30) < 4 && Math.abs(moved.y - corner.y + 24) < 4);
    check(`${scheme}: the size is kept`, (await saved())?.width === after.w);
    check(`${scheme}: resizing leaves the note open to write on`, await page.locator('.fl-sticky.editing').count() === 1);

    // The corner works from the keyboard, and never past what fits the wall.
    await page.locator('.fl-note-size').focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check(`${scheme}: arrow keys resize from the corner`, (await size()).w === after.w + 20);
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft');
    check(`${scheme}: it never gets narrower than 130px`, (await size()).w === 130);

    // Words still save with your profile; clicking away closes the tray.
    await page.locator('.fl-sticky textarea').fill('Hum first, then hello');
    await page.mouse.click(720, 860);
    await page.locator('.fl-note-tools').waitFor({ state: 'detached' });
    // Saving reads the profile and then writes it back: give it a moment.
    for (let i = 0; i < 40 && profile.room_note !== 'Hum first, then hello'; i++) await page.waitForTimeout(50);
    check(`${scheme}: clicking away keeps your words`, profile.room_note === 'Hum first, then hello');

    await page.reload();
    await sticky.waitFor();
    check(`${scheme}: the look survives a reload`, await page.locator('.fl-washi.tape-confetti').count() === 1 && (await size()).w === 130);

    await sticky.click();
    await page.getByRole('button', { name: 'Back to the original note' }).click();
    check(`${scheme}: one button puts back the original note`,
      (await size()).w === 160 && await page.locator('.fl-washi.tape-stripes').count() === 1 && (await saved()) === null && await typing());
    await page.keyboard.press('Escape');
    check(`${scheme}: Escape closes it`, await page.locator('.fl-note-tools').count() === 0);
    assert.deepEqual(errors, [], `${scheme}: no page errors`);
    await page.close();
  }
  console.log('PASS: the sticky note changes paper, tape and size, keeps them, and puts back the original.');
} finally { await browser?.close(); await server.close(); }
