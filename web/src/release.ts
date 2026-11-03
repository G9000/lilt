// The version you're running and what's new in it, for the room's "What's new" widget. Add the next
// release at the top of RELEASES; the widget shows the first one and marks it unread until opened.

export interface Release {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  items: { title: string; body: string; /** where it lives, as an app route */ to?: string }[];
}

export const RELEASES: Release[] = [
  {
    version: "0.2.0",
    date: "2026-11-01",
    items: [
      { title: "Resonance and weight, rewritten", body: "Two chapters now say plainly what to do: a smaller space for your voice, and a light, clear sound you borrow from little sounds and carry into words. Never by squeezing.", to: "/studio/resonance" },
      { title: "Ball of yarn", body: "A calm game: lift a ball of yarn with your voice, humming or speaking, in your own range. No scores.", to: "/yarn" },
      { title: "Play my note", body: "The recorder plays the middle of your range, to hum along to before you start." },
      { title: "Brighter or darker", body: "In Resonance, a live strip shows whether a steady sound is brighter or darker than when you started.", to: "/studio/resonance" },
      { title: "Time in your range", body: "After each take, how much of what you voiced sat in your comfortable range." },
      { title: "Photos", body: "Your own photos on the clock, and a Photos app to add, view and delete them.", to: "/photos" },
      { title: "Flashcards", body: "A chapter as a pile of cards: swipe through the steps, and record each text before it swipes away.", to: "/flashcards" },
      { title: "A new voice course", body: "Thirteen chapters in three parts, with real technique, checked against clinical guidance and coaching practice.", to: "/studio" },
      { title: "Extras to read aloud", body: "A Reading room, short Stories told in parts, and Articles to read like a presenter.", to: "/studio/reading-room" },
      { title: "Warm-up first, cool-down last", body: "Your chosen warm-up opens Today every day, and the cool-down closes it.", to: "/deck" },
      { title: "Eyes-off takes", body: "Some reviews hide the pitch line: rate by ear first, then see what it did." },
      { title: "Before and after", body: "Every few weeks, your first recording comes back to play beside your voice now." },
      { title: "A range that moves with you", body: "Move your range up as your note rises, and hide the pitch scale if you'd rather not see it.", to: "/studio/settings" },
      { title: "Auto theme", body: "Light or dark follows your computer, unless you pick one in Settings." },
    ],
  },
];

export const CURRENT = RELEASES[0];
/** "0.2.0" → "0.2" for a compact label. */
export const shortVersion = (v: string) => v.replace(/\.0$/, "");
