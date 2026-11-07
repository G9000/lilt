import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accentPalette, contrast, DEFAULT_ACCENT, parseAccent } from './accent-colors.ts';

test('accent accepts hex colors and rejects damaged or executable saved values', () => {
  assert.equal(parseAccent(' #AbC '), '#aabbcc');
  assert.equal(parseAccent('#123ABC'), '#123abc');
  for (const value of [null, undefined, 3, {}, '#12', '#12345g', 'red', 'url(https://example.com)', '#ffffff; color:red']) {
    assert.equal(parseAccent(value), null);
  }
  assert.equal(DEFAULT_ACCENT, '#e0643c');
});

test('custom accent tones keep text, focus and button labels readable at color extremes', () => {
  for (const r of ['00', '40', '80', 'c0', 'ff']) for (const g of ['00', '40', '80', 'c0', 'ff']) for (const b of ['00', '40', '80', 'c0', 'ff']) {
    const chosen = `#${r}${g}${b}`;
    const palette = accentPalette(chosen);
    for (const [theme, background] of [['light', '#fafafa'], ['dark', '#212121']] as const) {
      const tone = palette[theme];
      assert.ok(contrast(tone.accent, background) >= 3, `${chosen}/${theme}: focus`);
      assert.ok(contrast(tone.ink, background) >= 5.5, `${chosen}/${theme}: text`);
      assert.ok(contrast(tone.on, tone.accent) >= 4.5, `${chosen}/${theme}: button`);
      const alpha = theme === 'light' ? .12 : .18;
      const tint = '#' + [1, 3, 5].map(i => Math.round(parseInt(tone.accent.slice(i, i + 2), 16) * alpha
        + parseInt(background.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');
      assert.ok(contrast(tone.ink, tint) >= 4.5, `${chosen}/${theme}: tinted surface`);
    }
  }
});
