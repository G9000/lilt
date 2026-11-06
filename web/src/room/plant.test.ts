import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlant, plantDays } from './plant.ts';

test('plant choices survive storage and damaged values return to the sprout', () => {
  for (const plant of ['sprout', 'monstera', 'fern', 'succulent']) assert.equal(readPlant(plant), plant);
  for (const raw of [null, '', 'unknown', 'toString', '{}']) assert.equal(readPlant(raw), 'sprout');
});

test('growth shows whole practice days within a single week', () => {
  assert.equal(plantDays(0), 0);
  assert.equal(plantDays(3), 3);
  assert.equal(plantDays(7), 7);
  assert.equal(plantDays(2.8), 2);
  assert.equal(plantDays(-1), 0);
  assert.equal(plantDays(90), 7);
  assert.equal(plantDays(NaN), 0);
  assert.equal(plantDays(Infinity), 0);
});
