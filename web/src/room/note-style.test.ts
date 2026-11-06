import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NOTE, DEFAULT_NOTE_2, isDefaultNote, NOTE_SIZE, readNoteStyle, resized } from './note-style.ts';

test('missing or broken note choices give the original yellow note with pink tape', () => {
  for (const raw of [null, '', 'broken', 'null', '[]', '42', '{}']) assert.deepEqual(readNoteStyle(raw), DEFAULT_NOTE);
  assert.deepEqual(readNoteStyle('{"paper":"neon","tape":"https://example.com","width":"200","height":true}'), DEFAULT_NOTE);
  assert.equal(readNoteStyle('{"paper":"toString"}').paper, 'butter');
});

test('a chosen paper, tape and size are kept, within what fits the wall', () => {
  assert.deepEqual(readNoteStyle('{"paper":"lilac","tape":"gingham","width":220,"height":150,"hand":true}'), { paper: 'lilac', tape: 'gingham', width: 220, height: 150, hand: true });
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

test('older saved notes are written neatly until you choose handwriting', () => {
  assert.equal(readNoteStyle('{"paper":"mint"}').hand, false);
  assert.equal(readNoteStyle('{"hand":"yes"}').hand, false);
});

test("the second note falls back to its own look, not the first note's", () => {
  assert.deepEqual(readNoteStyle(null, DEFAULT_NOTE_2), DEFAULT_NOTE_2);
  assert.deepEqual(readNoteStyle('{"paper":"sky"}', DEFAULT_NOTE_2), { ...DEFAULT_NOTE_2, paper: 'sky' });
  assert.equal(isDefaultNote(DEFAULT_NOTE_2, DEFAULT_NOTE_2), true);
  assert.equal(isDefaultNote(DEFAULT_NOTE_2), false);
});
