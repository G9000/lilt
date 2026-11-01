import type { CSSProperties } from "react";
import { roomUrl, type Light } from "../room/scene";

/**
 * The pictures the clock widget and today's cards show (credits in public/pictures/CREDITS.md).
 * The room ones follow the hour. `clock` frames it on the square clock, `card` on a card's wide
 * strip; unset, the widget's own CSS frames the room.
 */
export interface Picture { id: string; name: string; url: (l: Light) => string; clock?: CSSProperties; card?: CSSProperties }

const photo = (id: string, name: string, cardY: string): Picture =>
  ({ id, name, url: () => `pictures/${id}.webp`, clock: { backgroundSize: "cover" }, card: { backgroundSize: "cover", backgroundPosition: `center ${cardY}` } });

/** In the clock's order: it remembers its picture by index. */
export const PICTURES: Picture[] = [
  { id: "room", name: "The room", url: roomUrl, card: { backgroundPosition: "65% 42%" } },
  { id: "screen-cat", name: "The cat on the screen", url: roomUrl,
    clock: { backgroundSize: "1000% auto", backgroundPosition: "82% 48%" }, card: { backgroundSize: "800% auto", backgroundPosition: "83% 47%" } },
  photo("cat-window-nap", "Cat napping by the window", "27%"),
  photo("cat-blanket", "Cat on a blanket", "52%"),
  photo("cat-keyboard", "Cat asleep on the keyboard", "72%"),
  photo("cat-kitten", "Kitten, paws up", "47%"),
  photo("cat-fluff", "Orange fluff", "16%"),
  { id: "window", name: "The window", url: () => "pictures/window.webp", clock: { backgroundSize: "cover", backgroundPosition: "center" }, card: { backgroundSize: "cover", backgroundPosition: "center 40%" } },
  { id: "desk", name: "The desk", url: () => "pictures/desk.webp", clock: { backgroundSize: "cover", backgroundPosition: "45% 40%" }, card: { backgroundSize: "cover", backgroundPosition: "center 35%" } },
];

export const picture = (id: string) => PICTURES.find((p) => p.id === id) ?? PICTURES[0];

/** The picture for today's i-th card: consecutive cards differ, and the set moves on each day. */
export function cardPicture(i: number, now = new Date()): Picture {
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return PICTURES[(day + i) % PICTURES.length];
}
