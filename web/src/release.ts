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
    version: "0.2.1",
    date: "2026-11-07",
    items: [
      { title: "A chair of your own", body: "Click your chair to choose the original mesh and pink throw, cream upholstery, sage padding or walnut and cane. Each sits in the room with the player behind it. On smaller screens, use Chair. Your choice stays in this browser." },
      { title: "A tidier menu bar", body: "The bar along the top of the room and the desk now shares one look: softer glass, your course as a small chip beside Lilt, and the same order of controls in both places. Make it yours and Reset layout are now quiet icons; hover one to see its name." },
      { title: "Players feel at home", body: "The cassette, boombox, walnut radio and record player now sit at their own size and angle on the desk, with soft contact shadows. The chair and pink throw overlap them naturally in front." },
      { title: "Your spinning CD", body: "The metallic CD and its cover artwork are back in the compact Music controls. It spins while music plays. Open Change player to swap the boombox, radio or record player on your desk." },
      { title: "Music stays in the room", body: "Click your player for compact controls, just like your tea mug. Pick a mood, adjust the volume or change the player without entering the computer. Music keeps playing when you close it." },
      { title: "A music player of your own", body: "Open Music and choose Change player: a cream cassette, sage boombox, walnut radio or record player. Shaded artwork sits beside your desk, with small details moving while music plays. Your choice stays in this browser." },
      { title: "A warm cup on your desk", body: "Gentle curls of steam drift from your cup, growing fuller during a tea break and settling when it ends. Reduced motion keeps the wisps still." },
      { title: "A plant inside your room", body: "Click the painted floor plant beside the drawers to choose a ficus, monstera, fern or jade plant. Shaded artwork follows the room's light and grows gently with your week. On smaller screens, use Plants. Your choice stays in this browser." },
      { title: "Tea from your desk cup", body: "Click the painted cup beside the keyboard to choose a shaded cream, sage, striped or sleepy cat mug and take 3, 5 or 10 quiet minutes. It follows the room's light, with steam and an optional soft clink. On smaller screens, use Tea. Your mug and timer stay in this browser." },
      { title: "More room for your courses", body: "Course homes, chapters, guides, practice texts and Today's practice share a wider, centered reading layout. Introductions and Markdown fill the same column, and selected voice exercises keep their plain appearance.", to: "/courses" },
      { title: "A tidier place to read and practise", body: "Course pages put linked chapters first, Markdown has tighter spacing and clearer notes, and the comfort footer fills the reading column with less empty space.", to: "/courses" },
      { title: "Record and practise with any course", body: "Other courses now have optional audio recording, their own recordings list, and guided practice using their prompts and hints. Save a reflection with or without audio, and reopen the session later.", to: "/courses" },
      { title: "Course details that stay with your course", body: "Practice texts and chapter-card links keep your chosen course. Other courses use their own skill names and no longer inherit read-aloud prompts, voice goals or guessed card durations.", to: "/courses" },
      { title: "Practise any course", body: "Open any course to read its chapters, use chapter flashcards and practise daily cards. Each course keeps its own progress, and the room remembers the course you opened. Voice keeps its familiar recording tools.", to: "/courses" },
      { title: "Choose your time zone", body: "Date & time now offers the time zones supported by your browser, including regions missing from the old short list. Your saved choice stays selected.", to: "/settings" },
      { title: "One shared visual system", body: "The room, practice screens, Settings and update window now share one styling system, keeping your chosen accent and familiar layouts consistent." },
      { title: "Lilt on your Windows desktop", body: "Lilt now has a Windows desktop build with its own installer, server and voice analysis tools. Open it from Start and practise in its own window." },
      { title: "A calmer, more consistent Lilt", body: "Settings, Course Home and Today share clearer headings, comfortable controls and quieter surfaces. Practice cards give more space to the exercise, and the desktop Today widget puts your next step first.", to: "/studio" },
      { title: "Choose your AI", body: "Configure your AI settings opens the choices for ChatGPT, Claude and other apps. Remix and its new-chapter shortcut are marked Coming soon while in-app remixing is unavailable.", to: "/studio" },
      { title: "Practice cards with a purpose", body: "Today's practice cards now show the exercise and its hint on a simple paper stack, with a clear Start action. Unrelated photo covers are gone." },
      { title: "A softer little world for Ball of yarn", body: "Play beside a painted garden window with embroidered curtains, a woven rug and a fluffy kitten. Day and night have their own light, and the yarn has finer wool detail.", to: "/yarn" },
      { title: "Pictures that fill your monitors", body: "Room pictures now meet the edges of both screens. Sleepy cat has a closer crop without the pale strip beside it." },
      { title: "An accent color of your own", body: "Make it yours and Settings → Appearance now have color presets, a custom picker and a hex field. Try a color across Lilt, or reset to the original orange. Your choice stays in this browser.", to: "/settings" },
      { title: "See where your storage goes", body: "Settings → Storage shows space used by recordings, photos, backups and other saved data. Refresh the count, copy your data folder path, or open the folder from the installed app.", to: "/settings" },
      { title: "A warmer welcome to your course", body: "Three new illustrations replace the course guide's placeholder pictures. A short first-visit walkthrough and clearer listening prompts help you choose one comfortable next step.", to: "/studio" },
      { title: "Back up and restore your practice", body: "Settings now lets you create a backup ZIP or check one before restoring it. Lilt keeps a safety copy before replacing your practice data, then asks you to reload.", to: "/settings" },
      { title: "Update notices and your app version", body: "Available Mac updates appear quietly in Notification Center. Settings shows your installed version and update status directly; reading or clearing a notice keeps it quiet for that version.", to: "/settings" },
      { title: "Updates in the Mac app", body: "Signed release builds can check for updates from Settings or the Mac menu. Read what's new, download when you're ready, then update and restart after your take finishes saving.", to: "/settings" },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-11-01",
    items: [
      { title: "Flashcards that recover your place", body: "If saved card progress gets damaged, Flashcards keeps what it can read and opens normally. Duplicate saved entries no longer repeat a card.", to: "/flashcards" },
      { title: "A more playful Ball of yarn", body: "A rounder cartoon cat watches, reaches and perks up as you play with softly wound wool. Choose Free play for just you, the yarn and the cat, without loops.", to: "/yarn" },
      { title: "The cat practises with you", body: "The room's cat curls up on the edge of your card, listens while you record and sends up a heart when you stop. Finished cards make a little pile, and the day ends with a paper slip of what you said.", to: "/deck" },
      { title: "Eight new moods on the radio", body: "Strummed strings, a music box, a kalimba, slow pads and a walking jazz bass, with the sea, a fire, crickets or birdsong around them. Find them under Strings, tines and pads in Music.", to: "/music" },
      { title: "Soft sounds, if you like", body: "Turn on soft sounds in Settings → Appearance for a paper rustle as a card is put away, a pencil as you keep a note and a small chime when the deck is done. They're off until you choose them, and never play while the microphone is on." },
      { title: "Handwriting and a second note", body: "Write your sticky note in handwriting, and add a second note under the first for another reminder. Each has its own paper, tape and size." },
      { title: "Room for every screen", body: "On smaller and squarer screens the room's widgets shrink a little and keep clear of each other, today's cards and the Photos, Practice and Music shortcuts." },
      { title: "A gentler new week", body: "The plant in the room says \"A new week\" instead of a zero, and grows a leaf each day you practise." },
      { title: "A sticky note that's yours", body: "Click the note in the room to write on it, then pick its paper and washi tape from the tray underneath, and drag its corner to make it bigger or smaller. Back to the original note puts the yellow one back." },
      { title: "Steadier saving", body: "If Lilt restarts while you're recording, your take finishes saving straight away instead of retrying for minutes. Browsing a long list of recordings uses less memory, and a card no longer repeats its chapter's name as a tag." },
      { title: "A quieter daily deck", body: "Practise one paper card at a time, with small illustrations, clearer text and record/listen/review controls together. Open Reading tips or Up next when you need them. Your review schedule stays the same.", to: "/deck" },
      { title: "A cozier Ball of yarn", body: "Play beside an illustrated window with a woven yarn ball and a curious cat. Setup is simpler, instructions open when you need them, and play controls stay within reach on small and large screens.", to: "/yarn" },
      { title: "A little motion on your screens", body: "Make it yours now lets each monitor show your own picture, GIF or silent looping video. Preview, pause or remove it whenever you like. Files stay in this browser." },
      { title: "Your room layout, restored", body: "The original widget positions and dragging are back. Reset layout stays available, including after you reset." },
      { title: "Music has its own app", body: "Open the painted player for a full CD with artwork and an aligned mood library. Close it and keep listening with compact controls in the top bar.", to: "/music" },
      { title: "A desk you can use", body: "The left monitor is now a small music player. Click it for lo-fi or Spotify, click the camera for Photos, and click the microphone to open Practice." },
      { title: "A clearer, calmer room", body: "Refined artwork keeps your familiar room with cleaner details, a softly lit night, and a repaired sleeping cat. Make it yours now changes the main and side monitor pictures independently." },
      { title: "Make the room yours", body: "Keep the original illustrated room and choose its light, color warmth, fairy lights and side-monitor picture. Your choices stay in this browser, with one button to return to the original look." },
      { title: "Settings that keep your edits", body: "Quick changes save in order, even when you leave and reopen Settings. Commas stay put as you type your qualities, and comparisons clear the previous pair's results when you choose other takes.", to: "/studio/settings" },
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
