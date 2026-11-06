import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NOTE, isDefaultNote, NOTE_SIZE, readNoteStyle, resized } from './note-style.ts';

test('missing or broken note choices give the original yellow note with pink tape', () => {
  for (const raw of [null, '', 'broken', 'null', '[]', '42', '{}']) assert.deepEqual(readNoteStyle(raw), DEFAULT_NOTE);
  assert.deepEqual(readNoteStyle('{"paper":"neon","tape":"https://example.com","width":"200","height":true}'), DEFAULT_NOTE);
  assert.equal(readNoteStyle('{"paper":"toString"}').paper, 'butter');
});

test('a chosen paper, tape and size are kept, within what fits the wall', () => {
  assert.deepEqual(readNoteStyle('{"paper":"lilac","tape":"gingham","width":220,"height":150}'), { paper: 'lilac', tape: 'gingham', width: 220, height: 150 });
  assert.equal(readNoteStyle('{"width":9000}').width, NOTE_SIZE.maxW);
  assert.equal(readNoteStyle('{"width":3}').width, NOTE_SIZE.minW);
  assert.equal(readNoteStyle('{"height":-50}').height, NOTE_SIZE.minH);
});

test('resizing rounds and clamps both sides', () => {
  assert.deepEqual(resized(DEFAULT_NOTE, 211.6, 140.2), { ...DEFAULT_NOTE, width: 212, height: 140 });
  assert.deepEqual(resized(DEFAULT_NOTE, 10, 9999), { ...DEFAULT_NOTE, width: NOTE_SIZE.minW, height: NOTE_SIZE.maxH });
});

test('the original note is recognised, so there is nothing to put back', () => {
  assert.equal(isDefaultNote(DEFAULT_NOTE), true);
  assert.equal(isDefaultNote({ ...DEFAULT_NOTE, tape: 'dots' }), false);
  assert.equal(isDefaultNote(resized(DEFAULT_NOTE, 160, 120)), false);
});
