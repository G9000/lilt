// Real Chrome pointer events, using disposable Vite and browser storage only.
import { chromium } from 'playwright-core';
import { createIsolatedVite } from './isolated-vite.mjs';
import assert from 'node:assert/strict';

const server = await createIsolatedVite({logLevel: 'error'});
await server.listen();
let browser;
try {
  browser = await chromium.launch({channel: 'chrome', headless: true});
  const context = await browser.newContext({viewport: {width: 1200, height: 800}, hasTouch: true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.abort());
  const url = `${server.resolvedUrls.local[0]}e2e/fixtures/artwork-hold.html`;
  const reset = async () => {
    await page.goto(url);
    await page.locator('#primary').waitFor({timeout: 5000});
  };
  const actions = () => page.evaluate(() => window.actions);
  const down = async (target = '#primary') => {
    const bounds = await page.locator(target).boundingBox();
    const point = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    return point;
  };
  await reset();
  await page.locator('#primary').click();
  assert.equal((await actions()).primary, 1, 'short click performs the primary action');
  assert.equal((await actions()).held, 0, 'short click does not choose artwork');
  await page.locator('#primary').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  assert.equal((await actions()).primary, 3, 'keyboard activation keeps the primary action');

  await reset();
  await down();
  await page.waitForTimeout(400);
  assert.equal((await actions()).held, 0, 'artwork does not open before the hold threshold');
  await page.waitForTimeout(350);
  assert.equal((await actions()).held, 1, '650ms hold opens artwork');
  await page.mouse.up();
  assert.equal((await actions()).primary, 0, 'hold release does not perform the primary action');
  assert.equal((await actions()).bubbled, 0, 'release click is suppressed when a native modal intercepts the pointer');
  assert.equal((await actions()).documentClicks, 0, 'modal release does not leak a click onto the document');
  await page.keyboard.press('Escape');
  await page.locator('#primary').click();
  assert.equal((await actions()).primary, 1, 'the next independent click still works');

  for (const cancel of ['movement', 'pointercancel', 'blur', 'Escape']) {
    await reset();
    const point = await down();
    if (cancel === 'movement') await page.mouse.move(point.x + 11, point.y);
    if (cancel === 'pointercancel') await page.locator('#primary').dispatchEvent('pointercancel', {pointerId: 1});
    if (cancel === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    if (cancel === 'Escape') await page.keyboard.press('Escape');
    await page.waitForTimeout(750);
    await page.mouse.up();
    assert.equal((await actions()).held, 0, `${cancel} cancels the hold`);
  }

  await reset();
  await page.locator('#artwork').click();
  assert.equal((await actions()).artwork, 0, 'artwork-only targets ignore ordinary pointer clicks');
  await page.locator('#artwork').focus();
  await page.keyboard.press('Enter');
  assert.equal((await actions()).artwork, 1, 'artwork-only targets retain keyboard access');

  await reset();
  const bounds = await page.locator('#primary').boundingBox();
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: bounds.x + 50, y: bounds.y + 50}]});
  await page.waitForTimeout(750);
  assert.equal((await actions()).held, 1, 'a real touch pointer can hold to choose artwork');
  await touch.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  assert.equal((await actions()).primary, 0, 'touch release does not activate the primary action');
  await touch.detach();

  await reset();
  await page.locator('#link').click();
  assert.equal(new URL(page.url()).hash, '#photos', 'ordinary anchor clicks keep native navigation');
  await reset();
  await down('#link');
  await page.waitForTimeout(750);
  await page.mouse.up();
  assert.equal((await actions()).held, 1, 'anchors support artwork holds');
  assert.equal(new URL(page.url()).hash, '', 'held anchor releases do not navigate');

  await page.setViewportSize({width: 1440, height: 950});
  await page.goto(`${server.resolvedUrls.local[0]}e2e/fixtures/room-appearance.html`);
  await page.locator('.room-stage.settled').waitFor();
  // Painted targets have clipped contours; use a visible hit-tested point, not their rectangle center.
  const hitPoint = async selector => {
    const target = page.locator(selector);
    await target.waitFor({state: 'visible'});
    const point = await target.evaluate(element => {
      const box = element.getBoundingClientRect();
      for (let y = Math.max(1, box.top + 3); y < Math.min(innerHeight, box.bottom); y += 5) {
        for (let x = Math.max(1, box.left + 3); x < Math.min(innerWidth, box.right); x += 5) {
          if (element.contains(document.elementFromPoint(x, y))) return {x, y};
        }
      }
      return null;
    });
    assert.ok(point, `${selector} has a visible pointer target`);
    return point;
  };
  const holdRoom = async selector => {
    const point = await hitPoint(selector);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(750);
    await page.getByRole('dialog').waitFor({state: 'visible'});
    await page.mouse.up();
    assert.equal(await page.getByRole('dialog').count(), 1, `${selector} picker survives release`);
  };
  for (const selector of ['.room-chair-target', '.room-plant-target', '.room-main-frame-target', '.room-side-frame-target']) {
    const point = await hitPoint(selector);
    await page.mouse.click(point.x, point.y);
    assert.equal(await page.getByRole('dialog').count(), 0, `${selector} short click does not open artwork`);
    await holdRoom(selector);
    await page.keyboard.press('Escape');
    await page.locator(selector).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor({state: 'visible'});
    await page.keyboard.press('Escape');
  }
  for (const selector of ['.room-camera-target', '.room-coffee-target', '.room-microphone-target']) {
    await holdRoom(selector);
    assert.equal(await page.evaluate(() => window.entered), 0, `${selector} hold does not enter Practice`);
    assert.equal(new URL(page.url()).hash, '', `${selector} hold does not navigate`);
    await page.keyboard.press('Escape');
  }
  const microphone = await hitPoint('.room-microphone-target');
  await page.mouse.click(microphone.x, microphone.y);
  assert.equal(await page.evaluate(() => window.entered), 1, 'microphone short click opens Practice');
  assert.equal(await page.getByRole('dialog').count(), 0, 'microphone short click does not open artwork');
  await page.locator('.room-camera-target').click();
  assert.equal(new URL(page.url()).hash, '#/photos', 'camera short click opens Photos');
  assert.equal(await page.getByRole('dialog').count(), 0, 'camera short click does not open artwork');
  assert.equal(await page.locator('.room-coffee-target').getAttribute('target'), '_blank', 'coffee retains its external support link');
  assert.match(await page.locator('.room-coffee-target').getAttribute('href'), /^https:\/\//);
  assert.deepEqual(errors, []);
  console.log('PASS: artwork hold, primary clicks, modal release suppression, cancellation, keyboard, touch and painted room mappings.');
} finally {
  await browser?.close();
  await server.close();
}
