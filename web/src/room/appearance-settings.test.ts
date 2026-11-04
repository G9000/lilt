import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, readAppearance, roomWeights } from './appearance-settings.ts';

test('old or malformed room choices safely fall back to the original painting', () => {
  for (const value of [null, 'broken', 'null', '[]', '42']) assert.deepEqual(readAppearance(value), DEFAULT_APPEARANCE);
  assert.deepEqual(readAppearance('{"light":"unknown","warmth":"80","lights":true,"decor":"https://example.com"}'), DEFAULT_APPEARANCE);
});
test('room choices retain valid fields and bound the warmth slider', () => {
  assert.deepEqual(readAppearance('{"light":"sunset","warmth":140,"lights":"on","decor":"leaves"}'), { light: 'sunset', warmth: 100, lights: 'on', decor: 'leaves' });
  assert.equal(readAppearance('{"warmth":-140}').warmth, -100);
});
test('a chosen light stays fixed while automatic lighting follows the clock', () => {
  assert.deepEqual(roomWeights('night', 800), { day: 0, morning: 0, sunset: 0, night: 1 });
  assert.equal(roomWeights('auto', 800).day, 1);
  assert.equal(roomWeights('auto', 100).night, 1);
});
