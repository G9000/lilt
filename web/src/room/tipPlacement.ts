export type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Where the hint goes so it never covers today's cards, which share its corner (and can be
 * dragged anywhere): its own corner when that's clear, else beside the cards, else above them.
 * Returns right/bottom offsets, or null to keep the corner.
 */
export function clearOfCards(hint: { width: number; height: number; right: number; bottom: number },
  cards: Box | null, view: { width: number; height: number }, gap = 16, edge = 12): { right: number; bottom: number } | null {
  if (!cards || cards.right <= cards.left || cards.bottom <= cards.top) return null;
  const at = (right: number, bottom: number): Box => {
    const left = view.width - right - hint.width, top = view.height - bottom - hint.height;
    return { left, top, right: left + hint.width, bottom: top + hint.height };
  };
  const overlaps = (a: Box) => a.left < cards.right && a.right > cards.left && a.top < cards.bottom && a.bottom > cards.top;
  const fits = (a: Box) => a.left >= edge && a.top >= edge && a.right <= view.width - edge && a.bottom <= view.height - edge;
  if (!overlaps(at(hint.right, hint.bottom))) return null;
  const beside = { right: view.width - cards.left + gap, bottom: Math.max(hint.bottom, view.height - cards.bottom) };
  if (fits(at(beside.right, beside.bottom))) return beside;
  const above = { right: Math.max(hint.right, view.width - cards.right), bottom: view.height - cards.top + gap };
  if (fits(at(above.right, above.bottom))) return above;
  // A short window with the cards up high: as far above them as still fits on screen.
  return { right: Math.min(above.right, view.width - hint.width - edge), bottom: Math.min(above.bottom, view.height - hint.height - edge) };
}
