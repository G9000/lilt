export const TEA_KEY = 'lilt.room.tea';
export const MUGS = [
  { id: 'cream', label: 'Cream stoneware', body: '#eadbc2', edge: '#947b62', detail: '#b39a7c' },
  { id: 'sage', label: 'Sage cup', body: '#b7c7ad', edge: '#63785e', detail: '#e9eedb' },
  { id: 'blue', label: 'Blue stripes', body: '#edf0e7', edge: '#637e91', detail: '#8ca9bd' },
  { id: 'cat', label: 'Sleepy cat', body: '#edc6b6', edge: '#976f60', detail: '#77574d' },
] as const;
export type Mug = typeof MUGS[number]['id'];
export type Tea = { mug: Mug; minutes: 3 | 5 | 10; endsAt: number | null };
const DEFAULT: Tea = { mug: 'cream', minutes: 5, endsAt: null };

export function readTea(raw: string | null): Tea {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT };
    return {
      mug: MUGS.some(m => m.id === value.mug) ? value.mug : DEFAULT.mug,
      minutes: [3, 5, 10].includes(value.minutes) ? value.minutes : DEFAULT.minutes,
      endsAt: Number.isSafeInteger(value.endsAt) && value.endsAt > 0 && value.endsAt <= 8640000000000000 ? value.endsAt : null,
    };
  } catch { return { ...DEFAULT }; }
}

// A deadline survives sleeping computers and throttled background tabs without stretching a break.
export function remainingTea(endsAt: number | null, now: number): number | null {
  return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000));
}
export const teaTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
