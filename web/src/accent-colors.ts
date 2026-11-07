export const DEFAULT_ACCENT = '#e0643c';
export const ACCENTS = [
  { name: 'Orange', color: DEFAULT_ACCENT }, { name: 'Rose', color: '#c85b7a' },
  { name: 'Plum', color: '#8b68b2' }, { name: 'Blue', color: '#467aca' },
  { name: 'Teal', color: '#298579' }, { name: 'Olive', color: '#7c883e' },
];

export function parseAccent(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(hex)) return hex;
  return /^#[\da-f]{3}$/.test(hex) ? '#' + [...hex.slice(1)].map(c => c + c).join('') : null;
}
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex = (channels: number[]) => '#' + channels.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function luminance(color: string) {
  const linear = rgb(color).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function readable(color: string, background: string, target: number, towards: number) {
  const channels = rgb(color);
  for (let step = 0; step <= 100; step++) {
    const candidate = hex(channels.map(v => v + (towards - v) * step / 100));
    if (contrast(candidate, background) >= target) return candidate;
  }
  return hex([towards, towards, towards]);
}
export function accentPalette(value: string) {
  const color = parseAccent(value) ?? DEFAULT_ACCENT;
  const tone = (background: string, towards: number) => {
    const accent = readable(color, background, 3, towards);
    return { accent, ink: readable(color, background, 7, towards),
      on: contrast(accent, '#ffffff') >= contrast(accent, '#000000') ? '#ffffff' : '#000000',
      rgb: rgb(accent).join(', ') };
  };
  return { light: tone('#fafafa', 0), dark: tone('#212121', 255) };
}
