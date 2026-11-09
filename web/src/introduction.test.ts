import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntroductionStore, creatorStory } from './introduction.ts';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('remembers a step per course across reloads, without using recordings', () => {
  const disk = storage(), state = createIntroductionStore(() => disk);
  assert.equal(state.read('voice'), 'new');
  assert.equal(state.save('voice', '2'), true);
  assert.equal(createIntroductionStore(() => disk).read('voice'), '2');
  assert.equal(state.read('drawing'), 'new');
});

test('skip and completion survive replay navigation until an explicit new outcome', () => {
  const disk = storage(), state = createIntroductionStore(() => disk);
  state.save('voice', 'skipped');
  state.save('voice', '1');
  assert.equal(state.read('voice'), 'skipped');
  state.save('voice', 'complete');
  state.save('voice', '3');
  assert.equal(state.read('voice'), 'complete');
});

test('blocked storage keeps choices in this visit and reports persistence failure', () => {
  const state = createIntroductionStore(() => { throw new Error('blocked'); });
  assert.equal(state.read('voice'), 'new');
  assert.equal(state.save('voice', 'skipped'), false);
  assert.equal(state.read('voice'), 'skipped');
  assert.equal(state.read('drawing'), 'new');
});

test('invalid stored values fall back to the beginning', () => {
  const state = createIntroductionStore(() => ({ getItem: () => '999', setItem() {} }));
  assert.equal(state.read('voice'), 'new');
});

test('the creator story comes from the editable course text and stops at the next section', () => {
  assert.equal(creatorStory('# Welcome\r\n\r\n## Why this exists\r\n\r\nMy original words.\r\n\r\n## Where I am\r\n\r\nMore.'), '## Why this exists\n\nMy original words.');
  assert.equal(creatorStory('A course without that section.'), '');
});
