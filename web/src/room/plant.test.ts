import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlant, plantDays, plantCanopyScale, plantLight } from './plant.ts';

test('plant choices survive storage and damaged values return to the sprout', () => {
  for (const plant of ['sprout', 'monstera', 'fern', 'succulent']) assert.equal(readPlant(plant), plant);
  for (const raw of [null, '', 'unknown', 'toString', '{}']) assert.equal(readPlant(raw), 'sprout');
});

test('painted canopy growth stays subtle and lighting blends with the room', () => {
  assert.equal(plantCanopyScale(0), .9);
  assert.equal(plantCanopyScale(7), 1);
  assert.equal(plantCanopyScale(100), 1);
  const day = plantLight({ day: 1, morning: 0, sunset: 0, night: 0 });
  const night = plantLight({ day: 0, morning: 0, sunset: 0, night: 1 });
  const blend = plantLight({ day: .5, morning: 0, sunset: 0, night: .5 });
  assert.equal(blend.brightness, (day.brightness + night.brightness) / 2);
  assert.ok(night.brightness < day.brightness);
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
