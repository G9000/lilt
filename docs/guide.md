# Lilt guide

Everything the [README](../README.md) leaves out: how each part works, your data, connecting an
agent, other devices, settings, development and troubleshooting.

## The Mac app

`desktop/` wraps Lilt in a Mac app (Tauri), so nobody needs Rust, Node, uv or a terminal to use it.
Lilt.app carries the server, the web app, the courses, and its own Python with the measuring
helper (`Contents/Resources/runtime`). Opening it starts the server on this Mac and shows Lilt in
its own window; quitting stops the server.

- **Build it:** `desktop/build.sh` (needs what `./lilt.sh` needs). It makes `desktop/dist/Lilt.app`
  and `desktop/dist/Lilt-<version>-<arch>.dmg` for this Mac's chip (arm64 or x86_64; build on each
  for both). The `.dmg` is about 56 MB, the installed app about 140 MB.
- **Local builds:** the app is signed ad hoc, not with an Apple Developer ID, so macOS blocks the first
  open of a downloaded copy. Open it once, then System Settings → Privacy & Security → **Open
  Anyway**. After that it opens normally. (Signing and notarising with a Developer ID removes this.)
- **Updates:** in a signed release build, open **Settings → Updates**, or **Check for updates…**
  in the Mac menu. Settings shows your installed app version and current update status directly.
  Lilt also checks quietly when it opens. An available version appears in **Notification Center**;
  choose the notice to open Updates. Reading or clearing it is remembered in this browser for
  that version, so another check or completed download does not make it unread again. A newer
  version gets its own notice. There is no sound, pop-up or system notification.
  Read the release notes, choose
  **Download update**, then **Update and restart**. Downloads are verified before installation;
  checks alone never install anything. Finish recording and saving first. If a take is still
  saving, the download stays ready while you finish. Closing the update window leaves a
  download running; reopen it to see its progress. A normal Quit waits during replacement.
  If an older unfinished take blocks an update, review it in **Recordings** and finish saving
  or remove it there. Restarting does not discard unfinished takes, even empty ones.
  The app, server, Python helper and bundled content update together; your data folder stays
  separate. A window attached to a separately started server cannot install an update: quit
  both and open the installed Mac app first. Local ad-hoc builds say updates are not configured.
  Browser users see the **Web version** and an explanation in Settings rather than an install button.
  Existing builds need one manual installation of the first updater-enabled signed release.
  Release credentials, the manual draft workflow and Mac acceptance checks are described in
  [Desktop releases](desktop-releases.md). Live Mac distribution still needs that setup and testing.
- **Your data:** `~/Lilt/data`, the same folder `./lilt.sh` uses, so both share one desk. If a Lilt
  is already running on port 7878, the app opens that one instead of starting a second. Otherwise
  it runs on 7878, or any free port when 7878 is taken. With `LILT_DATA_DIR` set it always runs its
  own server on that folder. The server's log is `~/Lilt/logs/lilt-app.log`.
- **In the window:** macOS asks once for the microphone. Links to other sites open in your browser.
  Export all saves to Downloads and shows it in Finder. Continue with ChatGPT signs in in your
  browser; come back to Lilt and Settings shows you connected. Spotify playback needs a browser
  that plays protected audio, which the app's window doesn't, so play Spotify from Lilt in a browser.

## Running in Docker

- **Where your data lives:** in `./lilt-data` on the host, bind-mounted to `/data`. Recordings live on
  the Docker host, which may not be the phone you recorded on.
- **Ports:** the port is published to `127.0.0.1` only. Inside the container Lilt listens on `0.0.0.0`.
- **Restarts:** the container restarts unless you stop it, and `docker compose ps` shows its health.
- **Recreating the container:** `docker compose down && docker compose up -d` keeps everything, because
  the files stay in `./lilt-data`. A bind mount gives persistence, not a backup.
- **First build:** on Apple Silicon, the first build compiles Parselmouth from source, because there
  are no Linux ARM wheels. It takes a few minutes and is cached afterwards.

## Using it

**Make the room yours.** Choose **Make it yours** in the room's top bar. Follow the time of
day or keep Morning, Daylight, Sunset or Night; slide Warmth toward cool or warm; switch the
fairy lights on or off; and choose pictures independently for the main and side monitors. Automatic fairy lights
keep their usual response to finishing today's cards. Changes show immediately and are saved
in this browser. **Reset room** returns the original colors, artwork and automatic lighting.
The panel closes with Escape or a click outside. Your bed, computer, microphone and animated
cat stay in the original illustration. The experimental 3D views have been removed.

**Choose your accent color.** In **Make it yours → Accent color**, choose a preset or open
**Custom color** for a picker. You can also type a three- or six-digit hex color and press Enter
or leave the field to apply it. The same controls are in **Settings → Appearance**. Controls,
highlights and pitch charts update immediately; shades adjust for light and dark backgrounds.
Your choice stays in this browser and follows you between Lilt's pages. **Reset to orange**
changes only the accent; **Reset room** also restores it. If browser storage is unavailable,
the color works for the visit and a note explains it could not be saved. Room paintings and
recording, warning and success colors keep their original colors.

**Put something on your screens.** Under **Main monitor** or **Side monitor**, choose
**Picture**, **GIF** or **Video** to pick a local file. Each screen keeps its own upload,
preview and Play/Pause control. Videos loop silently; pausing a GIF shows a still, and
Play restarts it. Picture uploads are still images, including animated PNG/WebP files.
You can try a built-in picture and choose **Use upload** to return, or **Remove** it.
Pictures fill the painted screen edge to edge. **Sleepy cat** uses a tighter crop to keep
the pale wall beside the cat out of view.
Choose PNG/JPG/WebP, GIF, or a playable MP4/WebM, up to 25 MB and 4096 × 4096 pixels.
Reduced motion starts with a still until you press Play. Motion pauses while you are
inside the desk or the browser tab is hidden.

These files stay in this browser for this Lilt address; they are not sent to the server
or added to Photos. Clearing browser storage can remove them; choose the file again if
that happens. **Reset room** removes both uploads. **Reset layout** only moves widgets.

The room artwork has a quieter second pass: fewer repeated trinkets, clearer recording
equipment and furniture, and matching morning/day/sunset/night versions. Night keeps the
bed and desk visible in warm lamplight. The cat is a complete transparent cutout on empty
bedding, with gentle breathing instead of separate rotating tail/ear pieces. It still
responds when you pet it. On wide displays the camera includes the whole cat when the
computer can also fit. Both monitor choices save independently; older side-monitor choices
are preserved. Artwork provenance and prompts live in `web/public/room/CREDITS.md`.

**Use the things on your desk.** The small left monitor is now a cassette music player;
the main and right monitors keep their own picture choices. Click the player for the Music app:
a full CD with artwork, an aligned list of lo-fi moods, playback and volume controls,
and the existing Spotify option. The window fits your screen without resize controls. Opening
Music does not start playback. Close or Escape returns to the previous view while music
continues. The compact player in the top bar shows your selection and play/pause; click
the artwork or title to reopen Music, including when paused. The camera opens your Photos gallery; the microphone
opens Practice using the same next-card/Start here entry as the computer. On phones a small
Photos/Practice/Music row keeps these actions available even when the objects are cropped;
portrait tablets get the same shortcuts. The default card stack sits in the lower-right
corner and becomes smaller on shorter screens. You can still drag the cards.

The isolated browser check uses the actual painting and controls, with no practice backend:
`cd web && node e2e/room-appearance.mjs [screenshot-folder]`.
Music navigation and playback have a separate isolated check:
`cd web && node e2e/music.mjs [screenshot-folder]`.
Monitor uploads and playback have an isolated check with locally generated media:
`cd web && node e2e/monitor-media.mjs [screenshot-folder]`.

1. **The room and the desk.** Lilt opens on an illustrated anime room above a city.
   - **Today's cards are a stack** in the corner, one card per practice card left. Swipe the top
     card away (or use the arrow keys) and it tucks in at the back; tap the card on top, or its
     arrow, to practise that one first. The others stay in today's run. The stack deals in when
     the room opens, nudges once to show it can be swiped, and gets shorter as you finish cards.
     Built with Motion (springs and drag).
   - **Floating in the room**, over spots in the painting: a
     clock in the window, the plant by the potted plant, a sticky note taped to the photo wall, and
     **What's new**: the version you're running (now 0.2) and what came with it, with a dot until
     you've opened it; each item opens the feature. New releases go at the top of
     `web/src/release.ts`.
     The clock shows a different photo each time you come in (cats, galaxies, plants, and any you
     added). Click it for Photos: pick one to keep on the clock, or Shuffle. **Open Photos** there,
     or Photos in the dock, opens the **Photos app**: every picture full size (<kbd>←</kbd>
     <kbd>→</kbd>, <kbd>Esc</kbd>), **Add photos** (or drop them in), Show on the clock, and delete.
     A photo you add is shrunk to at most 1600 pixels before it's sent, which also drops the
     camera's hidden details such as location, and is kept in `<data>/photos`; deleting it removes
     the file (and logs it in `deletions.jsonl`). Deleting one of Lilt's own only hides it, until
     Restore.
     The note starts as your goal; click it to write anything (up to 280 characters), click away to keep it. It's saved on
     the server (`room_note` in the profile). While you write, a small tray under it picks its paper (butter, peach,
     blush, lilac, sky or mint) and its washi tape (pink stripes, mint dots, lilac gingham, blue grid, kraft paper or
     confetti), its writing (neat, or handwritten in Caveat), and the round handle at its top-right corner resizes
     it (drag it, or use the arrow keys). Its look stays in this browser (`lilt.room.note`); **Back to the original
     note** puts back the yellow note with pink tape. **Add a second note** puts another beside it (blush, mint dots,
     handwritten to start), saved as `room_note_2`; **Take this note down** removes it, asking once more if it has
     words on it. **Drag either one anywhere**; it remembers its spot
     in the painting (in this browser). Today's cards move too: drag the small grip under the pile
     (swiping the cards still flips through them). **Reset layout** in the menu bar puts
     everything back and stays available after resetting (a reset-arrow icon on phones).
     Widgets near an edge slide inward rather than disappear. On smaller or squarer screens they
     shrink a little, and one still at home slides just clear of its neighbours and of the Photos,
     Practice and Music shortcuts under the menu bar. A widget whose spot
     is cropped off a small screen steps aside; a phone keeps the stack and room shortcuts.
   - Or click the **computer** itself (it glows; point at it to see how many cards are waiting), or press
     <kbd>Enter</kbd>: you sit down and **Practice opens straight away** on today's next card,
     full screen, with chapters in a sidebar and one paper card to read. Record and listen below
     the prompt. Open **Up next** to pick another card to practise first.
   The camera pushes into the monitor and its screen becomes a small macOS-style desktop. Every part
   of Lilt is an app on it: **Today** (today's cards), **Practice** (the chapters), **Flashcards**,
   **Yarn** (a voice game), **Recordings**, **Courses** and **Photos** in the dock, Settings and the light/dark switch in the menu bar. The theme starts on Auto, following your computer's light or dark setting; Settings › Appearance or the menu-bar button picks a fixed one. **Leave desk**
   (or the door in the dock) walks you back out to the room. Until you've recorded your "before",
   sitting down opens Start here instead of Today.
   - **The room:** the painting comes in morning, day, sunset and night light and fades between them
     with your clock. Birds cross the windows by day; stars and city lights come out at night. The
     cat sleeps on the bed and breathes; when you arrive it says hello, and tapping
     it gets a purr and hearts.
   - **Lights on when you're done:** once today's cards are finished, the string lights along the
     beam light up one by one and the desk lamp glows warmer. It's a quiet "nice work", never a score.
   - **Menu bar and notifications:** the room and the desk share a macOS-style menu bar (Lilt, what's
     playing, notifications, date and time). The envelope opens a Notification Center from the right
     with a greeting for the time of day. It only holds real things: your feedback is ready, a new
     stage opened, your reminder time, resting today, recordings recovered from a closed page. Never
     streaks or missed days. Read and cleared notifications are remembered in this browser only.
   - **The desk** shows today's practice as a folder (the cards waiting and Start). The clock, the
     plant (a leaf for each day you practised this week; it never shrinks or scolds, and a fresh week
     reads "A new week" rather than a zero) live in the
     room instead, as floating widgets you can drag. Music opens from the painted player.
   - **Lo-fi radio:** seventeen moods, made live in the browser. **Keys and beats** are the original nine
     ("Rain on the window", "Desk lamp", "City at dusk"…) plus "Midnight jazz" with a walking bass.
     **Strings, tines and pads** bring other instruments and places: plucked strings ("Morning coffee",
     "Fireplace"), a music box, a kalimba ("Summer crickets", "Greenhouse") and slow pads ("Sea breeze",
     "Stargazing"), with the sea, a crackling fire, crickets or birdsong around them. Moods live in
     `web/src/desk/moods.ts`; `lofi.ts` plays them. The Music app's player stays in place while the
     list scrolls. The
     radio has a volume slider and a mute button, remembered in this browser. Nothing is
     downloaded or sent anywhere. The current mood shows in the menu
     bar and on the room. **It pauses itself whenever the microphone is on** (recording or live
     pitch), so music never reaches a take or a pitch reading, then picks up again.
   - **The iced coffee** on the desk opens Buy Me a Coffee (`COFFEE_URL` in
     `web/src/room/scene.ts`). Pointing at it lights the cup with a warm glow and says "Buy me a
     coffee"; clicking flashes it, sends hearts up out of the cup and has the cat say thank you,
     then opens the page in a new tab a moment later (⌘/Ctrl-click opens it at once).
   - The artwork lives in `web/public/room/` (four `room-*-v3.webp` lights and the complete
     `cat-v2.webp` cutout). Swap them for other art of the same size, then re-measure the
     screen/coffee targets in `web/src/room/scene.ts` and object targets in
     `web/src/room/room-objects.css`. The look is documented in `DESIGN.md`.
2. **Today** is your **voice deck**: Anki-style spaced repetition, but for your voice. The deck
   holds the daily reference phrase, any cards due for review, and a couple of new cards (2 a day
   by default, `new_cards_per_day` in the profile). **Start** opens the Practice window: say the
   line, listen back, then rate how it felt: **Again** (later today), **Hard**, **Good** or
   **Easy**. Each button shows when the card will come back (keys 1–4 work too).
   - **One card at a time:** ivory paper by day, charcoal at night, with a small microphone,
     book or tea illustration. Reading tips and **How to practise** open when you need them.
     **Up next** lets you choose another card before recording; **Practised today** holds
     your completed cards. Record, listen and review stay together below the prompt. Cards
     settle gently into view, with motion disabled when you prefer reduced motion.
   - **The cat comes too:** the room's cat dozes on the top edge of the card, perks up and says
     "i'm listening :3" while you record, and sends up a heart when you stop. It reacts to your
     saying something, never to how it went.
   - **Soft sounds** (Settings → Appearance, off until you turn them on, kept in this browser as
     `lilt.sounds`): a paper rustle as a card is put away, a pencil scratch as you keep a sticky
     note, and a small two-note chime when the deck is done. They're made in the browser
     (`web/src/sounds.ts`), quiet, and never play while the microphone is on or in a hidden tab.
   - **A pile and a slip:** each finished card adds a slip to a small pile by the count. When the
     deck is done, a paper slip says what you said today, chapter by chapter (each card once, no
     ratings); the itemised list stays under **Practised today**. The wording lives in
     `web/src/daySlip.ts`.
   - **Your warm-up opens the deck and the cool-down closes it,** every day, not spaced like the
     other cards and outside the cap. Pick which warm-up (or none) in Practice settings.
   - **Eyes-off takes:** a review of a card you know well (three or more reviews) is eyes-off every
     other time. The live pitch line and numbers stay hidden while you record, you rate by ear, and
     then Lilt shows the pitch. Less feedback while practising helps the skill stick.
   - **Before and after:** about six weeks after your first take of a Start here "before" text, and
     then three weeks after each time you redo it, it comes back in Today ("Not today" puts it off a
     week). Record it again, hear it beside your very first take, and answer three 1–5
     questions (how happy you are with it, whether it sounds like you, how much effort it took),
     kept with the take.
   - **The pitch scale** after each take places it against the average man's and woman's speaking
     pitch, measured from the overlap between them. It's off unless you turn it on in Practice
     settings ("Pitch scale after each take"): population averages aren't targets, and your own
     range is what matters. A profile that already had it on keeps it. When a take sits above your
     saved range, Lilt suggests moving the range up instead of telling you to come down.
   - Ratings are your own judgement. Pitch numbers never decide them.
   - The deck is capped at about your session length. Missed days never pile up into a backlog:
     overdue cards just wait their turn.
   - New stages (m-words, phrases, sentences…) open once most cards in the stage before feel
     comfortable (rated Good or Easy twice in a row).
   - **It hurt or felt strained** pauses that card and your plan until you choose to resume.
   - **Live pitch while recording,** below the card's prompt: the waveform with your
     pitch line over it and your comfortable range as a band, plus the current Hz and note, middle
     pitch, usual range and steadiness. Display only.
   - **Results after each take:** middle pitch, usual range (10th to 90th percentile) and how
     much of the take was voiced, from the Praat analysis, plus the measured contour. With a
     comfortable range saved, one sentence says how much of what you voiced sat in it ("About two
     thirds of what you voiced sat in your range (150–200 Hz); the rest was mostly higher"), counting
     only the moments with a pitch, and the folded summary adds it as "· 68% in your range". It's
     left out with no range or under a second of pitch, and it's a description, never a pass or a
     miss. "Last
     time" on the same card is overlaid only when the comparison check says the two takes are
     comparable; otherwise the reason is shown. The end of the deck lists each card's middle
     pitch and your rating. The numbers describe the recording and never set a rating.
   - The original guided session with coaching feedback is still there: **Guided session with
     feedback** on the Today widget, at `#/guided`, with **Start today** or **Quick check-in**.
3. A session runs through these steps:
   - microphone check, then a reference phrase (counting 1–10). The check opens with two seconds of
     quiet to hear the room, then asks for a few words. If background sound is within about 20 dB
     of your voice (a tenth of its loudness), close enough to throw off pitch readings, a calm note
     suggests closing a window, turning off a fan or moving closer to the mic, with **Listen to the
     room again**. It never stops you continuing.
   - the exercise, then listening back with a self-check question
   - the reference phrase again, then an optional short unscripted answer
   - a comfort and effort check
4. You then see your recordings marked **Saved**. "Saved" appears only after the server has the
   file on disk. You also get one pointer.
5. On the feedback page:
   - **Hear the moment** plays the exact evidence. A segment is marked only when a measurement
     points to one; a self-report covers the whole take.
   - **Try this** shows a cue from the exercise registry.
   - **Try again** records a new, linked take; the original is never touched.
   - **Compare** puts the original and the retry side by side as an A/B pair.
6. If a pointer doesn't match what you hear or feel, say so. Your note is kept with the review and
   is taken into account next time.
7. **Chapters** are free practice, in the same Practice page. The sidebar lists the thirteen
   chapters in three parts (Get ready, The skills, Bring it together) with how many texts you've
   practised in each, and a dot on the chapter that's next up. A chapter reads like a document: how to do
   it, then each text in a reading serif with a hint under it. Pick a text (or press <kbd>↓</kbd>),
   press record, and the docked recorder draws your pitch live.
   - **Show my pitch live** lets you watch without recording.
   - **Play my note · F♯3** (once you have a comfortable range) plays a soft tone for about two
     seconds at the middle of your range, on the nearest note, so you can hum along to it. It never
     ends up in a take: it can't play while the microphone is listening, pressing Record stops it at
     once, and the take waits until its half-second pre-roll is clear of the tone.
   - In **Resonance**, while you record, a **darker–brighter strip** sits under the pitch line: the
     coral dot shows whether the sound is brighter or darker than when you started this take (its
     first second of sound is the tick in the middle), with one line in words. Silence and breaths
     leave it where it was. It reads where the sound's energy sits across the spectrum, so it works
     best on a steady sound on one note (a hum, a held vowel, a whisper), not on speech, and it never
     shows an absolute value.
   - Every take is saved. Your last take of the same text appears beside it as an A/B pair, with the
     measured pitch line; click the line to play from that point.
   - Hum warm-ups show a **steadiness** meter. The NHS Fife source asks for a smooth sound.
   - **Flashcards** (`#/flashcards`, in the dock, or the Flashcards widget beside the plant in the
     room, which shows the chapter you're on and how far through it you are) opens full screen and
     deals a chapter out as the room's illustrated cards, one at a time: its opening, each step of
     the how-to, its video, then each text. The chapter's name at the top is a menu of every chapter
     with how far through each you are. Swipe right (or <kbd>→</kbd>, or Got it beside the card) when
     you've got a card, left (<kbd>←</kbd>, Again) to see it again at the back of the pile; Undo puts
     the last one back. **A text's card won't swipe until you've recorded it** with Practice's
     recorder, docked below with the live pitch line: then your take is on the card to play, with
     its pitch details, and it swipes. **Tips** on a text's card opens the chapter's steps right
     there. Takes are saved like any chapter take, so they show in Recordings and the chapter's
     progress. **Full chapter** opens it in Practice at that text; <kbd>Esc</kbd> closes Flashcards. Flashcards is apart from Today: nothing
     is rated or scheduled, and where you are in each chapter is kept in this browser.
     If saved progress is damaged, Lilt keeps the readable card entries and starts fresh for
     anything it cannot read. Duplicate saved entries do not repeat a card.
   - **Yarn** (`#/yarn`, in the dock, or the Ball of yarn card on the desk in the room) is a calm
     voice game: your pitch lifts a woven ball of yarn through an illustrated window-side room while the cat pads after
     it, and loops of yarn drift by to thread it through if you like. Higher floats it up, lower
     lets it down, and the thread it leaves behind is your pitch line. Play by **humming or a lip
     trill** (open **How to play** for the lip-trill instructions) or by
     **speaking** short everyday sentences from the course's phrases chapters (the yarn follows
     the tune and waits between words). It plays in your **comfortable range** (the ends are
     marked with their notes, with room to spare either side); with no range yet, two easy hums,
     a low one and a high one, find one, and you can save it as your comfortable range or keep it
     just for the game. **Hear low and high** plays both ends, and each loop's note can play as
     it comes, while you're quiet. There's no score, timer or leaderboard: when you stop it says
     how long you kept the yarn afloat and where in your range your voice mostly was. Every two
     minutes it pauses for a breath; **It hurts or feels strained** stops it with Lilt's rest
     advice. It shows a hint when the room sounds noisy. Nothing is recorded or saved, and the
     lo-fi radio steps aside while you play. Setup sits beside the illustration on desktop and
     below it on phones; scroll to reach its start button. The play area stays within a comfortable
     size on ultrawide and 4K displays. Light and dark themes have their own scenery, and reduced
     motion keeps decorative movement still while the yarn continues following your voice.
     The painted room has embroidered curtains, a garden view, a woven rug and a knitting corner.
     A fluffy kitten watches the yarn, reaches when it is nearby, perks up when you thread a
     loop, and curls up when you finish. It bobs gently while following the yarn. Choose **Free play**
     at setup for just your voice, yarn and cat, without loops or their note cues; the choice is
     remembered in this browser. Humming and speaking, breathing breaks and the comfort stop
     work in either style of play.
     <kbd>Esc</kbd> closes it.
8. **Texts** has 131 texts across 16 chapters. The last three are Extras, outside Today: the Reading room (fourteen minute-long passages), Stories (three short stories told in parts) and Articles (nine short non-fiction pieces). Long passages show a title and a reading time: setup, warm-ups, pitch, resonance, vocal weight,
   articulation, intonation, automatic speech, everyday phrases, reading, your own words, laughs and
   little sounds, and real life. Each chapter explains the technique in a few numbered steps (how to
   find it, how to try it, how to use it in words, what to listen for), then the texts. The second warm-up card is a greeting,
   available in a fresh Today deck on day one. The four setup texts stay outside Today's cards.

   The Course guide starts with a short first visit: check the mic, save a starting recording,
   try hum-to-hello and keep one cue. Its listening prompts help you compare one quality at a time
   and choose a smaller next step when a cue is unclear. Three original illustrations show a
   practice corner, a listening nook and a resting cat; these are decorative, not technique diagrams.

   Instructions draw on the linked NHS Fife and NHS Lothian sources; the listening questions, bridge
   phrases and suggested daily loop are Lilt's teaching choices. Existing video links provide
   demonstrations. Dedicated A/B audio clips are still missing, and no clinician has reviewed the
   course or its pacing. All 61 earlier exercise IDs and spoken texts are preserved. Four later
   texts fill common gaps: easy onsets (warm-ups), the little reactions like "mm-hm" and "oh no"
   (automatic speech), and being heard across a busy room or caught off guard (real life).
9. **Comfortable range (optional):** a pitch band you choose. Set it in Settings, or with "use this
   take's range" in a chapter. It is shown as a soft band and is never a gendered zone or a coaching
   target.
10. **The look:** a calm macOS-style desktop inside the painting (see `DESIGN.md`): one font
   (Geist), soft glass windows, black primary buttons, one warm coral accent, and a white record
   button whose red dot turns into a square while recording.
   - **Read-along:** it follows the beat of your syllables in the browser, with no speech recognition
     and nothing sent anywhere. It's approximate; tap a word if it loses your place. After a take, your
     measured pitch is drawn under each word.
   - **Theme:** light or dark from the sun/moon button in the menu bar. Fonts (Geist, JetBrains
     Mono, Newsreader for the texts you read) are bundled, so nothing loads from the internet.
11. **Shortcuts:**
   - <kbd>Enter</kbd> in the room sits you down at the desk.
   - <kbd>Space</kbd> starts or stops recording.
   - <kbd>A</kbd> or <kbd>B</kbd> plays a take in an A/B pair.
   - <kbd>↓</kbd> and <kbd>↑</kbd> move between texts in a chapter.

12. **Progress** shows each skill in the task where it was practised, never an overall score.
   **Recordings** (the old History page) has playback, favourites, notes, deletion and export.

If you report strain, pain or new hoarseness, the activity is paused and never made harder. If
it persists or keeps coming back, see a voice professional.

### Microphone requirements

- **On this computer:** use `http://localhost` or `http://127.0.0.1`. Browsers allow the microphone
  there.
- **From your phone:** browsers only allow the microphone on a secure (HTTPS) page. See
  [Access from another device](#access-from-another-device).
- **Capture settings:** Lilt asks the browser to turn off echo cancellation, noise suppression and
  automatic gain, and records what the browser reports. A browser accepting that request doesn't prove
  your device applied no processing.
- **Formats:** the browser's supported format is selected automatically. Chrome and Firefox use
  WebM/Opus; tested Safari 26.6.2 selects it too, and its MP4/AAC path is also verified. Older Safari
  versions can fall back to MP4. Original bytes are kept as they were; `analysis.wav` is derived only.
- **One take at a time:** a second take is refused while another is recording in this page, or in
  another tab at the same site address when the browser supports Web Locks. The lock lasts through
  the final audio tail and ends when capture stops. Leaving a recorder finishes its take. Microphone
  checks and live pitch can still run; browsers without Web Locks only get protection within one page.
- **Pitch display:** cleanup protects clear quiet notes and sustained register changes. Brief uncertain
  glitches need consistent neighbouring pitch; quiet steady tones also need weak pitch evidence before
  they are hidden. Cleanup stops at pauses and time gaps and never rewrites saved measurements.

### Data layout

```
<data>/profile.json
<data>/exercises/<id>/v<N>.json
<data>/sessions/<session>/session.json
<data>/sessions/<session>/recordings/<take>/{take.json, original.webm|m4a, original.sha256, analysis.wav}
<data>/sessions/<session>/analyses/<run>.json
<data>/sessions/<session>/reviews/<review>.{json,md,responses.jsonl}
<data>/plans/current.json, plans/history/vNNNNN.json
<data>/jobs/*.json, deletions.jsonl
<data>/photos/photos.json, photos/<id>.{webp,jpg,png,gif}
```

Everything is plain files. There is no database, and the folder alone is enough to rebuild your
whole history.

### Storage overview

Open **Settings → Storage** to see the total size of Lilt's saved files, split into:

- **Recordings & analysis:** original audio, recording chunks and saved analysis files.
- **Photos:** uploaded pictures and the Photos index.
- **Backups & recovery files:** backup ZIPs, safety copies, prepared restores and backup settings.
- **Other saved data:** courses, progress, notes, settings, temporary files and other local app files.

Choose **Refresh** to count again. These are file lengths using 1,024-byte units, not the space
allocated by your drive; files can change while you practise. Linked folders are not followed.
Unreadable files or scan limits produce an **At least** total and a partial-count explanation.
A stalled request times out and offers Refresh; leaving Settings cancels the browser request.

The pane shows the actual data and backup folder paths. **Copy folder path** copies the data
location. In the installed app, **Open data folder** asks the file manager to open it. If the app
is using a separately started server, use the copyable path instead. Browsers also use that path
on the computer running Lilt. Clipboard or folder-opening failures leave the path selectable.

The installed app itself, room media stored only in the browser and downloaded copies elsewhere
are outside these totals. Storage does not delete or move files.

### Backup and restore

- **In Settings → Backup & restore**, choose **Create backup**, then **Download backup** and
  keep the ZIP somewhere safe. The date means the backup was created; Lilt cannot tell whether
  your browser saved the download. Recording, saving and analysis must finish first.
  The Mac app saves downloads in Downloads and reveals them in Finder; move your copy to your
  preferred backup location afterwards.
- **To restore**, choose a ZIP created in this pane. Lilt checks it and shows its creation date,
  recordings, file count and unpacked size. Tick **Replace my current practice data with this
  backup**, then choose **Restore backup**. This replaces rather than merges your practice data.
  Lilt keeps a safety ZIP of your current data first. After success, download that safety copy
  and choose **Reload Lilt**; reload any other open Lilt windows too.
- Backups include recordings, measurements, reviews and practice notes, custom courses and
  exercises, plans, card progress, Photos and practice settings. Sign-ins, AI connection grants,
  temporary files and backup-management files are excluded. Restoring preserves this computer's
  sign-ins. Sticky-note text is included with the profile. Browser-only choices—including room
  layout, appearance, sticky-note styles and uploaded
  monitor media—stay in that browser and are not included or replaced.
- Backup files contain private material and are not encrypted. Save them to a location you trust.
  Lilt also keeps generated ZIPs in a sibling folder named `.<data-folder-name>.lilt-backups`
  (normally `~/Lilt/.data.lilt-backups`). The latest one remains downloadable in Settings, including
  a safety copy after a restore. These are separate copies; deleting a recording does not remove it
  from an existing backup. There is no automatic backup schedule or automatic ZIP deletion.
- Import accepts only Lilt's versioned backup ZIPs, up to 2 GiB compressed, 8 GiB unpacked,
  100,000 files and 2 GiB per file. Damaged, unsupported or unsafe archives are rejected before
  current data is touched. Individual JSON records and the manifest are limited to 32 MiB.
  Older **Export everything** ZIPs use the manual restore route below.
- Backup and restore are available on this computer, not through remote AI connections. If
  another Lilt server or an MCP process has the same data open, close that process and retry.
  A stale page or buffered recording from before a restore cannot write into restored data;
  rejected buffered audio remains in the browser. If interrupted during replacement, Lilt uses
  its restore journal on startup to recover the previous data or finish a committed restore.
  Direct HTTP clients must send the current `X-Lilt-Generation` response header back on `/api/`
  mutations after a restore. MCP, OAuth protocol and authenticated native update controls keep
  their own admission rules.

The existing export and manual folder-copy routes remain available:

- **Export:** History → **Export everything (.zip)**, or `curl -o lilt.zip http://127.0.0.1:7878/api/export`.
- **Backup:** with Lilt stopped, copy the data folder, for example `rsync -a ~/Lilt/data/ /Volumes/Backup/lilt-data/`.
  Time Machine also covers `~/Lilt`.
- **Restore:** stop Lilt, put the folder (or the unzipped export) back at `LILT_DATA_DIR` (or
  `./lilt-data` for Docker), then start Lilt. Hashes in `original.sha256` let you check the audio.
- **Deletion:** deleting a recording or session in Lilt removes its originals, analysis copies and
  measurements from the data folder. Reviews elsewhere that cite it are either kept and marked "evidence
  deleted" or deleted too; you choose. Exports and backups are separate copies that you must delete
  yourself.

## MCP (connecting your agent)

Lilt exposes 22 tools, listed below. Arguments are IDs, course ids and syllabus file names only; there is no
filesystem or shell access.

- `voice_get_today_plan`, `voice_list_exercises`, `voice_list_sessions`, `voice_get_session`
- `voice_get_analysis`, `voice_compare_sessions`, `voice_get_progress`, `voice_get_audio_clip`
- `voice_get_deck`: today's card deck, scheduling state and, optionally, the review log
- `voice_save_review`, `voice_set_next_plan`
- `courses_list`: the courses, and whether you use your own copy of each
- `syllabus_list`, `syllabus_read`, `syllabus_compare`, `syllabus_history`: a course's chapters and
  home page, and how your copy differs from the original
- `syllabus_write`, `syllabus_delete`, `syllabus_undo`, `syllabus_reset`: change it
- `syllabus_updates`, `syllabus_apply_updates`: bring in updates to Lilt's original

**Courses, and your own copy.** Lilt holds courses: each a folder in `content/courses/<id>`
with its Markdown (home page, chapters, pictures, audio) and a `course.md` that names it, its kind
of practice, its version, where updates come from, and the sections an AI may never change
(`locked:`). Voice practice (`content/courses/voice`) is the course the app shows today. Ask your
agent to rewrite a chapter, add one, or overhaul a course ("make the warm-ups shorter", "add a
chapter of phone-call phrases"); `courses_list` shows the courses, and every syllabus tool takes the
course's id (voice when left out). Changes go to your own copy in `<data>/courses/<id>`; the
original folder is never touched, and the app switches to your copy and says so on the Practice
home page. Every change is checked before it's saved (a file Lilt can't read is refused, and the
course's locked sections can't be changed), kept in `<data>/courses/<id>/.history` with the agent's
note, and can be undone one at a time, or all at once by going back to the original.
`<data>/courses/<id>/.base` keeps the original as it was when your copy was made, for comparing with
later versions of the original. Progress follows the text ids, so a reworded text keeps its history.
(A copy made before courses, in `<data>/syllabus`, moves to `<data>/courses/voice` on start.)

**The Courses app** (the books on the desk's dock, `#/courses`) shows every course: what it is, its
kind of practice, and whether you're using the original or your own copy (with how many changes and
updates waiting). A course's page has your copy's history with each change's note, **Undo last
change**, **Go back to the original** (kept in the history, so Undo brings your copy back), **Review
updates** when the original has changed, its chapters (yours marked), the sections your AI can't
change, and what to ask your AI. The changes themselves come from your AI; the app is where you see
and manage them.

**Updates from Lilt.** When Lilt's original changes (a new release, or `git pull` and a rebuild), the
Practice home page says so under the chapters and links to **Updates from Lilt**
(`#/studio/updates`). Each file is compared in pieces: a chapter's details, each text by its id, each
home page section by its heading. A piece the original changed that you hadn't touched comes straight
in; where you both changed it, you see yours and Lilt's new version side by side and pick one; pieces
only you changed stay yours. New chapters in the original come in too. It's one change in the history,
so it can be undone. Agents can do the same with `syllabus_updates` and `syllabus_apply_updates`,
asking you where you both changed something.

**HTTP, while Lilt is running.** Use this with Claude Code:

```bash
claude mcp add --transport http lilt http://127.0.0.1:7878/mcp
```

**stdio.** The client starts Lilt itself, against the same data folder:

```json
{ "mcpServers": { "lilt": { "command": "/path/to/lilt/server/target/release/lilt", "args": ["mcp-stdio"],
  "env": { "LILT_DATA_DIR": "/Users/you/Lilt/data", "LILT_CONTENT_DIR": "/path/to/lilt/content" } } } }
```

What the server enforces on writes:

- Reviews must cite takes, analysis runs and self-reports that exist.
- Quoted numbers must match the stored analyses.
- Exercise and cue IDs must be in the registry.
- Prose is screened for hearing claims ("I hear…"), diagnosis, anatomy, and femininity scores.
- Plan updates must name the current plan version.
- A duplicate `idempotency_key` returns the existing review.
- Course changes must leave a course Lilt can load, keep its locked sections (for voice, "Be
  gentle with your voice"), come with a note, and only touch `index.md`, `_about.md`, `_pitch.md`
  or `NN-name.md`.

This screening checks a list of prohibited phrasings. It cannot prove that arbitrary prose is true.

`voice_get_audio_clip` returns a WAV clip as MCP audio content. Tested with Claude Code 2.1.286, the
clip was saved to disk but the model did not hear it, so model-perceived feedback stays disabled.

**Privacy:** what an external agent reads (session details, measurements, notes, audio clips) goes to
that agent's model provider. The optional in-app AI coach sends the conversation, today's plan and
deck, and the five most recent session summaries to OpenAI; it does not send audio. These messages
are held in the current page only and clear when you leave. Local recording and analysis stay local.

## AI coach in Lilt

Open **Settings → AI connections → ChatGPT** at `http://127.0.0.1:7878` and choose **Continue with ChatGPT**.
OpenAI handles sign-in and asks whether to allow Lilt to use an eligible ChatGPT plan. No API key,
public endpoint or tunnel is needed. The coach uses a model from the account's available model list;
its first version answers using read-only practice context and cannot save reviews or change plans.
It does not hear recordings or establish vocal qualities. The server screens certain prohibited
claims, but that screening cannot guarantee the accuracy or safety of arbitrary model prose.

The connection stores credentials with owner-only permissions under the data directory's `.private`
folder. That folder is excluded from Lilt's practice export. **Disconnect** attempts to revoke the
OpenAI session and deletes local credentials; if revocation cannot be confirmed, remove Lilt in
ChatGPT settings. A live ChatGPT sign-in and coach turn must still be verified for your account.

**Settings → Connect your AI** (the sliders icon at the top right) has all of this ready to copy:
the Claude Code command, the Claude Desktop configuration (through `docker exec` when Lilt runs in
Docker), and the address for other apps. It also lists the AI apps that have used Lilt recently,
so you can see a connection worked.

**ChatGPT and other cloud apps** (claude.ai on the web too) can't reach your computer, so they connect
through a public HTTPS tunnel and sign in with OAuth:

1. Run a tunnel to Lilt, for example `cloudflared tunnel --url http://127.0.0.1:7878` (a quick
   tunnel's address changes each time it starts; a named Cloudflare tunnel or Tailscale Funnel keeps
   one), and save its `https://` address in Settings → Connect your AI.
2. In ChatGPT, add a custom MCP server with `https://<your address>/mcp` and OAuth. ChatGPT
   registers itself and opens Lilt's sign-in page.
3. In Lilt's Settings choose **Get a code**, and type it on the sign-in page. Codes are shown only in
   Lilt on your computer, work once, last 10 minutes, and five wrong tries end one.

Through the public address only `/mcp`, `/oauth/*` and `/.well-known/oauth-*` answer, and `/mcp` needs
a signed-in app; the app itself, its API and your recordings answer only on this computer. A request
counts as coming through the tunnel when its host is the saved address or it carries Cloudflare's
`Cf-Connecting-Ip`. Tokens: access for a day, refresh for 90 days and replaced on each use, PKCE (S256)
required, stored only as hashes in `<data>/oauth.json`. **Disconnect** in Settings ends a connection.
From this computer, MCP answers only on local host names (`localhost`, `127.0.0.1`), and still
honours `LILT_MCP_TOKEN` if you set one.

## Access from another device

The default is loopback only. To record on your phone over your LAN:

1. Put Lilt behind HTTPS, for example with Caddy using its internal CA (`tls internal`) or a tunnel
   such as Tailscale Serve. Phones need a secure page to use the microphone.
2. Add authentication at the proxy, such as basic auth or Tailscale identity. Lilt has no login of
   its own.
3. Native: set `LILT_BIND=0.0.0.0:7878` only behind that proxy and firewall. Docker: change the port
   mapping deliberately.
4. Tell Lilt the proxy's host name: `LILT_ALLOWED_HOSTS=lilt.example.ts.net` (comma-separated).
   Lilt answers only on local names (localhost, 127.0.0.1), IP addresses and these names, so a web
   page can't reach it through DNS rebinding.

Lilt blocks cross-site browser requests (by checking the Origin header), but that is not
authentication.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `LILT_DATA_DIR` | `~/Lilt/data` (`/data` in Docker) | Where everything is stored |
| `LILT_BIND` | `127.0.0.1:7878` (`0.0.0.0:7878` in Docker) | Listen address |
| `LILT_PYTHON` | `analysis/.venv/bin/python` (Windows: `analysis/.venv/Scripts/python.exe`) | Python for the analysis helper; an explicit value overrides the platform default |
| `LILT_CONTENT_DIR` | `content` | Exercise registry and prompts to seed from |
| `LILT_WEB_DIR` | `web/dist` | Built web UI |
| `LILT_MCP_TOKEN` | unset | If set, `/mcp` on this computer requires `Authorization: Bearer <token>` (apps connecting through the public address sign in with OAuth instead) |

The timezone (default `Asia/Kuala_Lumpur`), reminder time, session length and comparison window are
in **Settings**. Changes save automatically; **Saved** confirms your latest edit. If you leave and
reopen Settings while a save is pending, the pane waits for it before loading your settings.
In Practice settings, separate the qualities you want with commas, such as `soft, bright`.
Lilt stores UTC timestamps alongside local dates.

**Models:** the optional in-app coach selects from the connected ChatGPT account's model list.
Deterministic practice analysis does not use a cloud model.

## Development and tests

The repository is a Bun workspace: the root `package.json` includes `web`, and the root
`bun.lock` pins its JavaScript dependencies. Use Bun 1.4.2 and Node 22.18 or later. Bun installs
packages and runs scripts; Node runs Vite and the existing `node:test` suites, including TypeScript
tests. Rust and Python still use Cargo and uv with their own lockfiles.

From the repository root:

```bash
bun install --frozen-lockfile
bun dev            # Rust server on :7878 and web UI on :5173
bun dev:web        # only the UI, when the Rust server is already running
bun dev:server     # only the Rust server, after preparing the Python helper
bun run typecheck
bun run test       # frontend unit tests using Node
bun run build      # static app in web/dist
```

`bun dev` runs both processes with prefixed logs. It installs the locked Python helper environment
with uv and builds the Rust server with Cargo before starting it. Press Ctrl+C to stop both;
if a process fails, Bun stops the other. Rust changes need a restart; the web UI reloads as you edit.
Use `bun dev:web` if Lilt is already running on port 7878. The combined command uses the app's
usual data folder unless you set `LILT_DATA_DIR`.

Use `bun run test`, not `bun test`, to run the project's configured Node test suite. Workspace
scripts also work from `web` (for example, `bun run dev`). To change web dependencies, run
`bun add <package>` or `bun add --dev <package>` there, and commit the root lockfile with the manifest.

Install the analysis environment before running Rust tests: they use the real local Python helper.
From the repository root, `uv sync --locked --project analysis` installs the pinned dependencies
and pytest into `analysis/.venv` on Windows, macOS and Linux. The app and Rust tests select the
interpreter path for the current platform. The lockfile is not updated by this command.

```bash
cd server && cargo fmt --all -- --check
cd server && cargo clippy --all-targets --all-features -- -D warnings
cd server && cargo test --all-targets --all-features  # includes the real analysis helper
cd analysis && uv run --locked pytest      # analysis tests on fixed fixtures
cd analysis && uv run --locked python scripts/evaluate.py   # regenerates EVALUATION.md
cd web && node --test src/pitch.test.ts     # live pitch tracker (YIN) on synthetic tones
cd web && node --test e2e/storage.mjs       # isolated Storage Settings, synthetic sizes and native bridge
cd web && node --test e2e/settings-comparison.mjs  # starts its own test server: delayed saves, typing and comparison switches
cd web && LILT_URL=http://127.0.0.1:5173 node --test e2e/recording-lock.mjs  # Vite running: real browser locks/recorder, fake mic and stubbed API
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/safari.mjs  # disposable test server on :7979; open :5175 in Safari and click each tab's audio button
cd web && node --test src/insight.test.ts   # the note in words after each take
cd web && node --test src/room/scene.test.ts  # room: monitor warp, light blending, zoom box
bun dev:web                                # from the repo root: UI on :5173, server already running on :7878
# Browser end-to-end with Chrome's fake microphone (server running on :7979 with a scratch data dir):
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/flow.mjs /tmp/shots   # MOBILE=1 for phone size
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/practice.mjs /tmp/shots   # the Practice window; needs a fresh data dir
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/flashcards.mjs   # Flashcards: widget, swipes, a text locked until recorded
cd web && node --test src/flashcards.test.ts   # a chapter dealt as cards, and a run through them
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/photos.mjs   # Photos: add, show on the clock, delete, hide and restore
cd web && node --test src/yarn.test.ts   # Yarn: pitch to height, smoothing, loops, breaks, the words at the end
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/yarn.mjs /tmp/shots   # Yarn: widget, dock, calibration, the yarn follows the voice, speak mode, hurt
```

## Troubleshooting

- **"Microphone access was blocked":** allow the microphone for this site in the browser's site
  settings, or in macOS System Settings → Privacy & Security → Microphone for the browser. Then retry.
- **No mic prompt on your phone:** the page isn't secure (HTTPS). See
  [Access from another device](#access-from-another-device).
- **"Saved · analysis failed":** the audio is safe. Check that `analysis/.venv` exists (`cd analysis && uv sync`),
  then use **Retry analysis** in History. Pending jobs also resume when Lilt restarts.
- **Upload problems:** chunks stay in the browser's IndexedDB until the server confirms them, and
  they're re-sent the next time Lilt opens. The server also recovers interrupted takes at startup and
  labels them "interrupted". Chunks re-sent after that are accepted if the saved take already holds
  them; anything the server turns away (a 4xx reply) fails at once rather than being retried for minutes.
- **Laptop was asleep:** nothing runs while it sleeps. Pending analysis catches up on wake, and
  you'll see at most one reminder, not a backlog.

## Measuring older takes again

When the analysis improves, older takes keep the numbers they were first measured with. **Measure
older takes again** at the bottom of Recordings (or `curl -X POST http://127.0.0.1:7878/api/remeasure`)
re-measures every take analysed with an older method. Each take gets a new analysis run
(`run-<take>-a2.json`, …) and the earlier runs stay on disk, so reviews that cite them keep their
evidence; re-measuring never rewrites feedback you've already read.

## Content and licensing

The practice texts (the chapters and today's text cards) are Markdown files in `content/courses/voice`,
one per chapter, so you can edit them in any editor or as an Obsidian vault without touching code.
[content/courses/voice/README.md](content/courses/voice/README.md) explains the format. Restart Lilt after editing
(with Docker, `docker compose up -d --build`).

The five built-in exercises in `content/exercises` are written for Lilt in its own words. Each one
is based on the idea of an NHS Fife Speech and Language Therapy activity, credited and linked as
"Based on", and none of NHS Fife's text is reproduced, so the repository and the Mac app can be
shared. On 4 November 2026 every course chapter and exercise was compared with the six NHS Fife
pages they cite: no run of six words or more matches, apart from the page titles in the links.
Keep it that way: write in your own words and link to the source. Versions you already practised
stay in your data folder (`exercises/`), so older takes keep their own wording and scoring. The
status of every exercise is `source_checked`, and no clinician has reviewed them.
