import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAIRS, readChair, chairAssets } from './chair.ts';

test('saved chair choices accept only supported designs', () => {
  for (const { id } of CHAIRS) assert.equal(readChair(id), id);
  for (const value of [null, '', 'unknown', '../cream.png', '{"chair":"sage"}']) assert.equal(readChair(value), 'original');
});

test('original chair never depends on replacement repairs', () => {
  assert.deepEqual(chairAssets('original'), []);
  for (const id of ['cream', 'sage', 'cane'] as const) {
    const assets = chairAssets(id);
    assert.ok(assets.includes(`room/chair/${id}.png`));
    for (const light of ['day', 'morning', 'sunset', 'night']) assert.ok(assets.includes(`room/chair/clear-${light}.png`));
    assert.ok(assets.includes('room/chair/foreground.png'));
  }
});
