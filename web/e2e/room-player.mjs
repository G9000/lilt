import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const shots = process.argv[2];
if (shots) await mkdir(shots, { recursive: true });
const server = await createIsolatedVite({ logLevel: 'error' });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce', colorScheme });
    await context.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Isolated room player fixture' } }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const root = server.resolvedUrls.local[0];
    await page.goto(root);
    const art = page.locator('.room-player-art'), music = page.locator('.music-window');
    const target = page.getByRole('button', { name: 'Open music player', exact: true });
    const picker = page.locator('.room-player-picker');
    const chosen = id => page.waitForFunction(id => document.querySelector('.room-player-art')?.dataset.player === id, id);
    const state = (name, value) => page.waitForFunction(({name, value}) => document.querySelector('.room-player-art')?.dataset[name] === String(value), {name, value});
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${name}-${colorScheme}.png`) }); };
    const open = async () => { await music.waitFor({ state: 'attached' }); if (!(await music.isVisible())) await target.click(); await music.waitFor({ state: 'visible' }); if (!(await picker.evaluate(el => el.open))) await picker.locator('summary').click(); };
    const close = async () => { await music.getByRole('button', { name: 'Close Music', exact: true }).click(); await music.waitFor({ state: 'hidden' }); await target.waitFor(); };
    await chosen('cassette');
    assert.equal(await art.getAttribute('data-playing'), 'false');
    for (const [name, id] of [['Cream cassette','cassette'], ['Sage boombox','boombox'], ['Walnut radio','radio'], ['Record player','turntable']]) {
      await open(); await picker.getByRole('button', { name, exact: true }).click(); await chosen(id);
      assert.equal(await art.getAttribute('data-playing'), 'false', 'changing artwork never starts music');
      await close(); await target.evaluate(el => el.blur()); await page.mouse.move(1400,900); await shot(id);
    }
    await page.reload(); await chosen('turntable');
    const home = await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]);
    await page.getByRole('button', { name: 'Reset layout', exact: true }).click();
    assert.deepEqual(await art.evaluate(el => [el.style.left, el.style.top, el.style.width, el.style.height]), home);
    await open(); await shot('picker');
    await music.getByRole('button', { name: 'Play lo-fi radio', exact: true }).click();
    await state('playing', true); await state('moving', false);
    await close(); await state('moving', true);
    assert.equal(await art.locator('.room-player-spin').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const spinning = art.locator('.room-player-spin').first();
    assert.equal(await spinning.evaluate(el => getComputedStyle(el).animationName), 'player-spin');
    const first = await spinning.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(400);
    assert.notEqual(await spinning.evaluate(el => getComputedStyle(el).transform), first);
    await shot('playing');
    for (const [name, id] of [['Cream cassette','cassette'], ['Sage boombox','boombox'], ['Walnut radio','radio'], ['Record player','turntable']]) {
      await open(); await picker.getByRole('button', { name, exact: true }).click(); await chosen(id); await close(); await state('moving', true);
      const detail = art.locator(id === 'radio' ? '.room-player-tuning' : '.room-player-spin').first();
      assert.equal(await detail.evaluate(el => getComputedStyle(el).animationPlayState), 'running');
      assert.equal(await detail.evaluate(el => getComputedStyle(el).animationName), id === 'radio' ? 'player-tuning' : 'player-spin');
    }
    await page.evaluate(async () => { const {claimMic} = await import('/src/micuse.ts'); window.releasePlayerMic = claimMic(); });
    await state('playing', false); await state('moving', false);
    assert.equal(await spinning.evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
    await page.evaluate(() => window.releasePlayerMic()); await state('playing', true);
    // Hiding the document suspends decoration without changing the audio engine.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await state('moving', false); await state('playing', true);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await state('moving', true);
    await page.locator('.ds-roomtop .music-mini').getByRole('button', { name: 'Pause lo-fi radio', exact: true }).click();
    await state('playing', false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Spotify's published controller state drives the same decoration; no live account is used.
    await page.evaluate(async () => { const {selectMusicSource,publishSpotify} = await import('/src/desk/musicState.ts'); selectMusicSource('spotify'); publishSpotify({ playing: true, ducked: false }); });
    await state('playing', true);
    await page.evaluate(async () => { const {publishSpotify} = await import('/src/desk/musicState.ts'); publishSpotify({ playing: true, ducked: true }); }); await state('playing', false);
    await page.evaluate(async () => { const {publishSpotify,selectMusicSource} = await import('/src/desk/musicState.ts'); publishSpotify({ playing: false, ducked: false }); selectMusicSource('lofi'); });
    const other = await context.newPage(); await other.goto(root);
    await other.evaluate(() => localStorage.setItem('lilt.room.player', 'radio')); await chosen('radio'); await other.close(); await page.bringToFront();
    for (const light of ['day','morning','sunset','night']) {
      await page.evaluate(async light => { const {setRoomAppearance} = await import('/src/room/appearance.ts'); await setRoomAppearance({ light }); }, light);
      await page.waitForFunction(light => document.querySelector('.room-stage').style.getPropertyValue(`--room-${light}-opacity`) === '1', light);
      assert.equal(await art.evaluate(el => getComputedStyle(el).filter), await page.locator('.room-plant-art').evaluate(el => getComputedStyle(el).filter));
      await shot(light);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const shortcut = page.getByRole('group', { name: 'Room shortcuts' }).getByRole('button', { name: 'Music', exact: true });
    await shortcut.click(); await music.waitFor({ state: 'visible' });
    if (!(await picker.evaluate(el => el.open))) await picker.locator('summary').click();
    await picker.getByRole('button', { name: 'Sage boombox', exact: true }).click(); await chosen('boombox'); await shot('phone-picker');
    const box = await picker.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await page.keyboard.press('Escape'); await music.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.classList.contains('room-music-shortcut'));
    await shortcut.click(); await music.waitFor({ state: 'visible' });
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.keyboard.press('Escape'); await music.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !!document.activeElement?.closest('.ds-roomtop .music-mini-open'));
    // A new document bypasses the decoded-image cache for real network failure coverage.
    await page.route('**/room/players/turntable.png', route => route.abort());
    await page.reload(); await chosen('boombox'); await open();
    await picker.getByRole('button', { name: 'Record player', exact: true }).click();
    await picker.getByText(/Couldn't load this player/).waitFor();
    assert.equal(await art.getAttribute('data-player'), 'boombox');
    await page.unroute('**/room/players/turntable.png');
    await picker.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('turntable');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; });
    await picker.getByRole('button', { name: 'Cream cassette', exact: true }).click(); await chosen('cassette');
    await picker.getByText(/couldn't save/).waitFor();
    await page.route('**/room/players/clear-day.png', route => route.abort());
    await page.reload(); await open(); await picker.getByText(/Couldn't load this player/).waitFor();
    assert.equal(await art.count(), 0, 'initial load failure keeps original painting');
    await page.unroute('**/room/players/clear-day.png');
    await picker.getByRole('button', { name: 'Try again', exact: true }).click(); await chosen('turntable');
    // A late failed request must not overwrite a more recent successful choice.
    await page.evaluate(() => {
      const OriginalImage = window.Image;
      window.Image = class extends OriginalImage {
        set src(value) { if (value.endsWith('/radio.png')) window.finishOldPlayer = () => { this.dispatchEvent(new Event('error')); window.Image = OriginalImage; }; else super.src = value; }
        get src() { return super.src; }
      };
    });
    await picker.getByRole('button', { name: 'Walnut radio', exact: true }).click();
    await picker.getByRole('button', { name: 'Sage boombox', exact: true }).click(); await chosen('boombox');
    await page.evaluate(() => window.finishOldPlayer());
    await page.waitForTimeout(100);
    assert.equal(await art.getAttribute('data-player'), 'boombox');
    assert.equal(await picker.getByText(/Couldn't load this player/).count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${colorScheme}: four players, no autoplay, persistence/reset, actual lo-fi and simulated Spotify motion, mic/visibility/reduced motion, lighting, keyboard/phone, image/storage fallback`);
    await context.close();
  }
} finally { await browser?.close(); await server.close(); }
