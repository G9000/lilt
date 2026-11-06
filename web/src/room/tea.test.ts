import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTea, remainingTea, teaTime } from './tea.ts';

test('a break uses its deadline after a suspended tab or reload', () => {
  const saved = JSON.stringify({ mug: 'cat', minutes: 5, endsAt: 301000 });
  const tea = readTea(saved);
  assert.equal(tea.mug, 'cat');
  assert.equal(remainingTea(tea.endsAt, 1000), 300);
  assert.equal(remainingTea(readTea(saved).endsAt, 181000), 120);
  assert.equal(remainingTea(tea.endsAt, 301000), 0);
  assert.equal(remainingTea(tea.endsAt, 999000), 0);
});

test('idle and finished breaks are distinct and never show negative time', () => {
  assert.equal(remainingTea(null, 9000), null);
  assert.equal(remainingTea(8000, 9000), 0);
  assert.equal(teaTime(remainingTea(10001, 9000)!), '0:02');
  assert.equal(teaTime(600), '10:00');
});

test('damaged preferences fall back without losing valid mug choices', () => {
  for (const raw of [null, '{', 'null', '[]', '42']) {
    assert.deepEqual(readTea(raw), { mug: 'cream', minutes: 5, endsAt: null });
  }
  assert.deepEqual(readTea('{"mug":"cat","minutes":-1,"endsAt":"soon"}'), { mug: 'cat', minutes: 5, endsAt: null });
  assert.deepEqual(readTea('{"mug":"unknown","minutes":3,"endsAt":-30}'), { mug: 'cream', minutes: 3, endsAt: null });
  assert.equal(readTea('{"endsAt":1e100}').endsAt, null);
});
