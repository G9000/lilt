// The slip at the end of the daily deck: what you practised today, in words, grouped by chapter.
// It describes, never grades: no ratings, no counts of "good" ones, nothing missed.

export interface SlipCard { front: string; chapter: string }
export interface Slip { lede: string; groups: { chapter: string; fronts: string[] }[] }

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n: number, one: string, many: string) => `${WORDS[n] ?? n} ${n === 1 ? one : many}`;

/** A card's words, cut to a line, so the slip stays small. */
export function shortFront(front: string, max = 34): string {
  const t = front.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  // Keep the last word if the cut ends exactly on it; otherwise back up to the previous space.
  const cut = t.slice(0, max - 1), whole = t[max - 1] === " ", space = cut.lastIndexOf(" ");
  return `${(whole || space <= max * 0.6 ? cut : cut.slice(0, space)).replace(/[\s,.;:—–-]+$/, "")}…`;
}

/** Each card once (a card said again is still one card), in the order you said them. */
export function daySlip(cards: SlipCard[]): Slip {
  const seen = new Set<string>(), groups: Slip["groups"] = [];
  for (const c of cards) {
    const key = `${c.chapter}\u0000${c.front}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let g = groups.find((x) => x.chapter === c.chapter);
    if (!g) groups.push(g = { chapter: c.chapter, fronts: [] });
    g.fronts.push(shortFront(c.front));
  }
  const n = seen.size;
  const lede = n === 0 ? "Nothing said yet today, and that's fine."
    : groups.length === 1 ? `You said ${count(n, "card", "cards")} out loud today.`
    : `You said ${count(n, "card", "cards")} out loud today, from ${count(groups.length, "chapter", "chapters")}.`;
  return { lede: lede.charAt(0).toUpperCase() + lede.slice(1), groups };
}
