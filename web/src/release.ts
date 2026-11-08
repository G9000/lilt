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
    version: "0.1.0",
    date: "2026-11-09",
    items: [
      { title: "Hold to make it yours", body: "Like the cat, your mug, plant, chair, player, camera, iced coffee, microphone and monitor frames now open their artwork choices on a hold. Short clicks keep everyday actions close: tea, music, Photos and Practice. Make it yours and the small picker controls are still there." },
      { title: "Welcome to Lilt", body: "A quiet room for learning at your own pace. Read a course, practise a little each day and come back to what you've learned. Everything stays on your own computer." },
      { title: "Courses you can read and practise", body: "Open a course to read its chapters, go through them as flashcards and practise its texts. Each course keeps its own progress.", to: "/courses" },
      { title: "Today's cards", body: "A few cards a day, one at a time, coming back when it's a good moment to revisit them. Go through as many as feel right.", to: "/deck" },
      { title: "Record and listen back", body: "Record a take if you like, hear it first, then keep it or leave a note for next time. The voice course also shows your pitch and how it sat in your comfortable range.", to: "/studio" },
      { title: "A room of your own", body: "Choose your chair, mug, plant, music player, monitors and cat in Make it yours. Your choices stay in this browser." },
      { title: "Little things around the desk", body: "Lo-fi moods on the radio, your photos on the clock, a sticky note, a tea break and Ball of yarn, a calm game you play with your voice." },
      { title: "Your data, your files", body: "Settings lets you back up, restore and see where your storage goes. Nothing is sent anywhere unless you choose it.", to: "/settings" },
    ],
  },
];

export const CURRENT = RELEASES[0];
/** "0.1.0" → "0.1" for a compact label. */
export const shortVersion = (v: string) => v.replace(/\.0$/, "");
