import assert from 'node:assert/strict';
import test from 'node:test';
import { clearOfCards } from './tipPlacement.ts';

// The hint (320 wide, about 150 tall) sits 24px from the bottom-right corner by default.
const hint = { width: 320, height: 150, right: 24, bottom: 24 };
// Today's cards: right 40, bottom 24, 300×348 at full size.
const cardsAt = (view: { width: number; height: number }, right: number, bottom: number, width: number, height: number) =>
  ({ left: view.width - right - width, right: view.width - right, top: view.height - bottom - height, bottom: view.height - bottom });

test('the hint keeps its corner when there are no cards or they were moved away', () => {
  const view = { width: 1440, height: 950 };
  assert.equal(clearOfCards(hint, null, view), null);
  assert.equal(clearOfCards(hint, { left: 0, right: 0, top: 0, bottom: 0 }, view), null, 'a hidden stack has no size');
  assert.equal(clearOfCards(hint, { left: 40, right: 340, top: 500, bottom: 848 }, view), null, 'cards dragged to the left');
});

test('the hint steps beside today\'s cards on a wide screen, level with their bottom', () => {
  const view = { width: 1440, height: 950 };
  assert.deepEqual(clearOfCards(hint, cardsAt(view, 40, 24, 300, 348), view), { right: 356, bottom: 24 });
});

test('the hint sits above the cards when there is no room beside them', () => {
  const view = { width: 520, height: 900 };
  // Scaled to 0.74 on a narrow window: 222×258, right 18, bottom 20.
  assert.deepEqual(clearOfCards(hint, cardsAt(view, 18, 20, 222, 258), view), { right: 24, bottom: 294 });
});

test('on a short, narrow window the hint stays on screen as high as it can', () => {
  const view = { width: 520, height: 400 };
  assert.deepEqual(clearOfCards(hint, cardsAt(view, 18, 20, 222, 258), view), { right: 24, bottom: 238 });
});
