import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, readAppearance, roomWeights } from './appearance-settings.ts';

test('old or malformed room choices safely fall back to the original painting', () => {
  for (const value of [null, 'broken', 'null', '[]', '42']) assert.deepEqual(readAppearance(value), DEFAULT_APPEARANCE);
  assert.deepEqual(readAppearance('{"light":"unknown","warmth":"80","lights":true,"decor":"https://example.com","mainDecor":"https://example.com"}'), DEFAULT_APPEARANCE);
  assert.equal(DEFAULT_APPEARANCE.mainDecor, 'original');
});
test('room choices retain valid fields and bound the warmth slider', () => {
  assert.deepEqual(readAppearance('{"light":"sunset","warmth":140,"lights":"on","decor":"leaves"}'), { light: 'sunset', warmth: 100, lights: 'on', decor: 'leaves', mainDecor: 'original' });
  assert.equal(readAppearance('{"warmth":-140}').warmth, -100);
});
test('older room choices keep the side monitor picture and the original main monitor', () => {
  for (const decor of ['original', 'leaves', 'stars', 'cat']) {
    assert.deepEqual(readAppearance(JSON.stringify({ decor })), { ...DEFAULT_APPEARANCE, decor, mainDecor: 'original' });
  }
});
test('each monitor keeps its own picture independently', () => {
  for (const mainDecor of ['original', 'leaves', 'stars', 'cat']) {
    for (const decor of ['original', 'leaves', 'stars', 'cat']) {
      assert.deepEqual(readAppearance(JSON.stringify({ mainDecor, decor })), { ...DEFAULT_APPEARANCE, mainDecor, decor });
    }
  }
  assert.deepEqual(readAppearance('{"mainDecor":false,"decor":"cat"}'), { ...DEFAULT_APPEARANCE, decor: 'cat' });
  assert.deepEqual(readAppearance('{"mainDecor":"stars","decor":{}}'), { ...DEFAULT_APPEARANCE, mainDecor: 'stars' });
});
test('a chosen light stays fixed while automatic lighting follows the clock', () => {
  assert.deepEqual(roomWeights('night', 800), { day: 0, morning: 0, sunset: 0, night: 1 });
  assert.equal(roomWeights('auto', 800).day, 1);
  assert.equal(roomWeights('auto', 100).night, 1);
});

test('custom monitor media is independent and accepts only local media identifiers', () => {
  const mainMedia = { id: '7b331b44-7f18-4d3a-b19a-497800344487', name: 'Rain.webm', kind: 'video', paused: true };
  const sideMedia = { ...mainMedia, id: 'eaa8469d-1aa5-4b44-861b-2eefc044d029', name: 'Cat.gif', kind: 'gif', paused: false };
  assert.deepEqual(readAppearance(JSON.stringify({ mainDecor: 'custom', decor: 'custom', mainMedia, sideMedia })),
    { ...DEFAULT_APPEARANCE, mainDecor: 'custom', decor: 'custom', mainMedia, sideMedia });
  for (const invalid of [null, [], { ...mainMedia, id: 'https://example.com/track.mp4' }, { ...mainMedia, kind: 'html' }, { ...mainMedia, paused: 'false' }]) {
    assert.deepEqual(readAppearance(JSON.stringify({ mainDecor: 'custom', mainMedia: invalid })), DEFAULT_APPEARANCE);
  }
});
