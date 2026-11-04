export interface Box { left: number; top: number; right: number; bottom: number }

/** Keep a default widget close to home, with room around the cards and its neighbours. */
export function freeWidgetSpot(home: Box, bounds: Box, occupied: Box[]): Box | null {
  const width = home.right - home.left, height = home.bottom - home.top, gap = 12;
  if (width > bounds.right - bounds.left || height > bounds.bottom - bounds.top) return null;
  const clampX = (x: number) => Math.max(bounds.left, Math.min(bounds.right - width, x));
  const clampY = (y: number) => Math.max(bounds.top, Math.min(bounds.bottom - height, y));
  const xs = [...new Set([home.left, bounds.left, bounds.right - width,
    ...occupied.flatMap(b => [b.left - width - gap, b.right + gap])].map(clampX))];
  const ys = [...new Set([home.top, bounds.top, bounds.bottom - height,
    ...occupied.flatMap(b => [b.top - height - gap, b.bottom + gap])].map(clampY))];
  const candidates = xs.flatMap(left => ys.map(top => ({ left, top, right: left + width, bottom: top + height })));
  candidates.sort((a, b) => Math.hypot(a.left - home.left, a.top - home.top) - Math.hypot(b.left - home.left, b.top - home.top));
  return candidates.find(a => occupied.every(b => a.right + gap <= b.left || a.left >= b.right + gap || a.bottom + gap <= b.top || a.top >= b.bottom + gap)) ?? null;
}
