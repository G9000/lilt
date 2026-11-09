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
    version: "0.1.3",
    date: "2026-11-09",
    items: [
      { title: "A welcome before practice", body: "Home introduces Lilt and brings back the full course introduction, including why it exists, how practice works and its resources. Home, the introduction and chapter instructions share consistent text widths. Your first practice explains how to begin, with a gentle voice introduction or a start for your own course. Skip whenever you like, and reopen it from Home. Recording is optional.", to: "/studio" },
      { title: "A little help around the room", body: "A small first-visit hint explains click to use and hold to change artwork. Hover or focus an object for its controls, and bring the hint back whenever you like with Make it yours → Show room tips." },
    ],
  },
  {
    version: "0.1.2",
    date: "2026-11-09",
    items: [
      { title: "Updates on Windows", body: "The Windows app now checks for a newer version when it opens and tells you when one is ready. Download and install it from Settings → Updates once your takes are saved; Lilt reopens on its own. Only the version check reaches GitHub; nothing about your practice is sent.", to: "/settings" },
      { title: "In between", body: "The voice course has a part for a voice somewhere in between: androgynous, nonbinary or still being explored. Find a middle that feels like yours, mix pitch, resonance, weight and melody without aiming at either end, and move lighter or fuller on purpose. With Which way set to Still open, Today's cards come from it, and your other cards keep their progress.", to: "/studio/in-between" },
      { title: "Looking after your voice", body: "The voice course has a chapter for voice care, whichever way you're going: warm-ups and cool-downs, how much practice is enough, water and rest, the early signs of a tired voice, and when to see a doctor or a speech and language therapist. It ends with a gentle check-in, starting with how your voice feels today, to answer out loud or in your head. Nothing is scored. It sits right after Warm-ups.", to: "/studio/your-voice" },
    ],
  },
  {
    version: "0.1.1",
    date: "2026-11-09",
    items: [
      { title: "Going lower", body: "The voice course has a part for a deeper, darker, fuller voice: a start on breath, care and what testosterone does to the voice, then pitch, resonance, vocal weight and emphasis, one at a time. Nothing is ever pushed down, and each chapter says how to stop if anything strains. Start here points the way.", to: "/studio/going-lower" },
      { title: "Higher, lower or still open", body: "Tell Lilt which way you're taking your voice, on Day 1 or in Practice settings. Its suggestions follow you: going lower, it offers to move your range down and never nudges you up; still open, it won't nudge you either way. Start here says which chapters help in any direction.", to: "/studio/settings" },
      { title: "Where your voice sits", body: "The pitch scale is back after every take. It says how your take spread across it, toward the average man, in the overlap or toward the average woman, and once you have a few spoken takes this week a hollow mark shows where your voice usually sits. Resonance changes are set against the usual gap between men's and women's voices. Hide this scale turns it off whenever you like.", to: "/studio" },
      { title: "Today's cards follow Which way", body: "Going lower, Today's cards now come from the Going lower chapters, right after the warm-ups, in place of the chapters that aim lighter. Higher or still open, they're as before. Switch whenever you like: cards you've practised keep their progress and wait for you. Resonance, going darker also gets the live darker–brighter strip while you record.", to: "/deck" },
      { title: "Save a clip to share", body: "Save a take, or just the part you choose, as an audio file in your Downloads: to keep, or to post for a voice check. Play the part first to hear exactly what you'd share. Nothing is uploaded; where it goes is up to you.", to: "/history" },
      { title: "Reference notes", body: "Beside Play my note, Reference notes plays three tones from the pitch scale's averages to hum along to and compare with: higher, lower or in between, following the way you're taking your voice. They're for listening, not targets.", to: "/studio/free" },
      { title: "Two minutes, said out loud", body: "A recording still runs up to two minutes, but now the recorder tells you in the last fifteen seconds, and after it stops it says your take was saved and how to carry on.", to: "/studio/free" },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-11-09",
    items: [
      { title: "Hold to make it yours", body: "Like the cat, your mug, plant, chair, player, camera, iced coffee, microphone and monitor frames now open their artwork choices on a hold. Short clicks keep everyday actions close: tea, music, Photos and Practice. Make it yours and the small picker controls are still there." },
      { title: "About Lilt", body: "Settings → About Lilt says who makes Lilt and how: one person with no budget, artwork made with an AI image generator, and an open door for any artist who'd like to redraw it. AI stays optional throughout.", to: "/settings/about" },
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
