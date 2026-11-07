import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catLocalPose, catOffset } from './catPuppet.ts';

test('ears and tail move occasionally, return to rest and stay bounded', () => {
  let active = 0, ear = false, tail = false;
  for (let tick = 0; tick < 23 * 120; tick++) {
    const pose = catLocalPose(tick / 120);
    assert.ok(Math.abs(pose.ear) <= 1 && Math.abs(pose.tail) <= 1);
    if (pose.ear || pose.tail) active++;
    ear ||= pose.ear > .9; tail ||= Math.abs(pose.tail) > .5;
    const next = catLocalPose((tick + 1) / 120);
    assert.ok(Math.abs(next.ear - pose.ear) < .13 && Math.abs(next.tail - pose.tail) < .03, 'no jump between poses');
  }
  assert.ok(ear && tail);
  assert.ok(active < 23 * 120 / 4, 'quiet for most of the cycle');
  assert.deepEqual(catLocalPose(0), { ear: 0, tail: 0 });
  assert.deepEqual(catLocalPose(23), catLocalPose(0));
});

test('only ear and tail regions deform, leaving the face and paws in place', () => {
  const pose = { ear: 1, tail: 1 };
  for (const [x, y] of [[.25,.45], [.8,.65], [.78,.9], [.9,.9], [.5,1]]) {
    assert.deepEqual(catOffset(x, y, pose), { x: 0, y: 0 });
  }
  assert.ok(Math.abs(catOffset(.585, .27, pose).x) > 3);
  assert.ok(Math.abs(catOffset(.932, .245, pose).x) > 2);
  assert.ok(Math.abs(catOffset(.59, .86, pose).y) > 3);
});

test('reduced motion and awake cats keep the original shape', () => {
  for (let t = 0; t < 60; t += .1) {
    assert.deepEqual(catLocalPose(t, true), { ear: 0, tail: 0 });
    assert.deepEqual(catLocalPose(t, false, false), { ear: 0, tail: 0 });
  }
});
