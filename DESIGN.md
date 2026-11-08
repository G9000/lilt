# Lilt design system

Approved direction: mockup v7 (Oct 2026). The room painting is the world; inside its middle
monitor is a small macOS-style desktop where every part of Lilt is an app window.

**November 2026 refresh: clean and minimal.** The painting keeps the warmth; everything you read
and use is quiet. Greys are neutral (no blue cast) in both themes, the Practice sidebar is a solid
surface rather than glass over the room, and Today's card is plain white (`#222222` in dark) on the
page. Fewer boxes: a suggestion after a take is a sentence, not a tinted card; resonance sits
under **More about this take** rather than in a box inside the take. Practice's frame is a guided
app: the sidebar is a short list of places (no file tree), Home greets you with one next step and
the next four chapters as tiles, a Chapters page holds every chapter as a tile with the cover and
guide, a chapter splits into **Learn** and **Practise** tabs (a segmented control), and Today is
one card without the stacked-paper edges. Every Practice page shares one centred 960px column.
In the room, widgets and cues wait for the painting, so nothing floats on an empty dark room. Placeholders for
unfinished features (Remix) stay hidden until they work. Windows close with Escape, when you go to
another page, and with **Done** on phones, so no one has to aim for the 12px red light.

## The world

**Your companion** in Make it yours opens a compact cat picker: the original black-and-white
cat, dilute grey-and-white tuxedo, ginger tabby, Siamese and fluffy white. Each is one connected
painted cutout in the existing curled pose and room light. A 4.8-second breath accompanies a slow
stretch and tiny double settling twitch across a quiet 23-second cycle. Feathered deformation
adds occasional ear-tip flicks and a small tail-tip swish, leaving the face, paws and body intact.
The twice-resolution sprite and its silhouette outline share each pose; no detached pieces or
duplicate painted ears/tails remain behind. Whole-body movement stays under four painting pixels
around the fixed bed anchor, with no rotation. Reduced motion holds a neutral pose
and clears decorative hearts, including when that preference changes while the room is open.
Hover or keyboard focus traces the cat's alpha contour with the same pale-blue outline as the mug,
synchronized to its sleeping movement. Clicking pets the cat; holding for 650ms opens the compact picker
without also petting on release. Moving more than 10 screen pixels, cancellation, Escape or losing
focus cancels the hold. Enter and Space pet it. Make it yours remains the keyboard and phone entry
for choices when the cat is cropped out. Pet the cat inside the picker closes it with purrs and hearts.
Browser-local choices survive Reset layout, synchronize across tabs and retain the prior cat
on a failed swap. Initial failure tries the original before revealing the room; unavailable
artwork never blocks access. Escape, Done and outside click restore focus to the opener.

**Desk finishes** gives the microphone and each physical monitor frame its own compact picker:
original black, warm cream, soft sage and brushed silver. Both monitors also offer Cream retro,
Sage rounded and Silver studio: distinct thicker housings, rounded openings and broad grounded
stands. Existing choices remain available and the microphone keeps its original four finishes.
Registered artwork preserves the boom attachment and follows each monitor's perspective.
Screen media is below the bezel; legacy finishes explicitly exclude the screen quad, and each
new model exposes its own rounded opening. The mug repair is below it. Pale-blue contours follow the whole assembly and each frame/stand, including
their openings, without brightening the interior. The screen itself remains the entry target.
Its hit area follows the exact rounded opening, leaving the entire casing available to its picker.
Make it yours exposes all three pickers on phones; the microphone picker retains Open Practice.
Saved choices, retry, storage feedback and dismissal focus follow the existing prop controls.
First reveal waits for decoded saved artwork and monitor content, or explicit failure fallback;
later swaps never hide the room. No timer stands in for readiness.

**Your chair** opens a compact 360px picker when clicked, with Mesh & pink throw,
Cream upholstered, Sage padded and Walnut & cane choices. A Chair shortcut serves narrow
screens. The original painting remains the default; replacements use stationary cutouts,
matching room light and repaired desk/floor artwork. Players stay behind the chosen chair,
and the foreground bed covers its wheels where they overlap. Changes save in this browser
and survive Reset layout. Failed artwork retains the previous chair with Retry; Original
works without replacement assets. Escape, Done and outside click restore focus to the opener.
Hover or keyboard focus outlines the entire visible chair in the monitor's pale blue, with
a soft bloom and no interior brightening. The hit area follows the same silhouette, including
arm openings and the foreground bed boundary. The outline changes with the shown chair and
stays hidden while its picker is open. Reduced motion removes its opacity transition.

**Weekly plant** is the painted floor plant beside the drawers, with shaded ficus, monstera,
fern and jade artwork. Clicking it opens a light/dark picker; Plants in the room shortcuts
opens it on smaller screens. The pot stays anchored while the canopy subtly grows with this
week's practice days. Zero days says “A new week.” There is no floating tile. Choices stay in
browser storage; Reset layout leaves the plant alone. The art follows the room's lighting,
keyboard dismissal restores focus, and reduced motion removes the growth transition.

**Tea break** opens from the actual painted desk mug, left of the keyboard. Shaded cream stoneware,
sage, blue stripes and sleepy cat designs follow the room's light. The cup stays anchored;
Tea in the room shortcuts opens its controls on smaller screens. Its compact modal offers
3, 5 or 10 minutes and an optional soft clink
(off by default, suppressed during recording). Faint steam curls drift from the idle cup;
a running break makes them fuller. Wisps rise, spread and fade at staggered intervals, and
remain still with reduced motion. At the end they settle and it says “Whenever you're ready.” No automatic navigation,
scoring or missed-break state. The deadline and mug stay in this browser; resetting the layout
leaves both alone. Timer text appears in its controls and on hover/focus, with no floating tile.

**Storage** is a Settings pane with one total and four rows: recordings and analysis, Photos,
backups and recovery files, and other saved data. Plain numbers describe file sizes, not drive
capacity. Refresh updates the count; partial or failed scans say so without showing a false zero.
The folder paths can be selected and the data path copied. The installed app offers Open data
folder through its native host, with a copy-path fallback. Folder-opening status describes the
request, not an observed Finder window. Both colour themes and narrow layouts retain these controls.

**Backup & restore** is a Settings pane with Create backup and a separate Download backup link.
Choosing a ZIP opens a plain preview with date, recording count and size. A checkbox and explicit
Restore backup action confirm replacement; Cancel leaves practice untouched. A successful restore
offers Download safety copy and Reload Lilt. Loading, busy and invalid-file states use plain text;
the last-backup date describes creation, never an unverified successful download. The pane explains
that sign-ins and browser-only room choices are outside the backup. Controls wrap on narrow screens
and use the existing light/dark Settings surfaces.

**App updates** live in Settings → Updates and the Mac menu. In the installed app they open
a small native window with the installed version, a plain status sentence, release notes,
download progress and separate Download update / Update and restart buttons. Notes are
plain text. A saved take must finish before installation. The window uses warm surfaces,
plain ink and coral focus, supports light/dark and keyboard use, and does not interrupt
practice for a failed background check. Browser Settings explains that updating belongs
to the installed Mac app. Local builds without a release key say updates are not configured.
Settings shows the native installed version and live update status directly; browser-only
use labels the bundled version as Web version. An available release adds one quiet notification
per version to Notification Center. Opening it opens Updates; reading or clearing it is
remembered like other notices. No toast, sound, system notification or automatic download.

**Make it yours** lives in the illustrated room's menu bar. Its small nonmodal panel leaves
the painting visible. **Accent color** comes first: six named swatches, a native color picker,
a labelled hex field and Reset to orange. It also appears in Settings → Appearance. The chosen
color is saved in this browser and applies immediately to shared controls, highlights and pitch
charts. Light/dark text, focus and button-label shades are derived for readability; always-dark
cards use dark shades. Recording red and warning/success colors keep their meanings, as do the
paintings and illustrated app icons. Reset room restores orange too. Then choose automatic/morning/day/sunset/night light, adjust a subtle cool/warm
wash, set fairy lights to automatic/on/off, and swap the side monitor's picture. Native radio
controls and a labeled slider work by keyboard; Escape closes and returns focus. Choices stay
in this browser and Reset room restores the default look. Both monitors have independent
picture choices. Each monitor also accepts a local picture, GIF or video through three
compact upload actions below the presets. A preview, filename, Use upload, Play/Pause and
Remove stay inside the appearance panel. Videos loop muted; GIF pause uses a still and
Play restarts it. Animated PNG/WebP uploads are flattened into still pictures. Reduced
motion starts media paused until explicitly played; hidden tabs and the desk suspend it.
Files stay in browser Cache Storage, with bounded media and metadata, no server upload.
Reset room removes them; Reset layout does not affect them.
The original furniture arrangement remains; the 3D experiments have been removed.
The refined paintings reduce repeated props and ambiguous details while keeping the cozy
palette and composition. Night has visible midtones and warm interior light. The cat is one
connected alpha cutout over empty bedding, gently breathing; it no longer rotates fragments
over a baked-in duplicate. Desktop framing includes the cat where possible while keeping
the main monitor's navigation target visible, including tall displays. The small left monitor
is replaced with a painted music player. Clicking it opens a compact 340px dialog over the room,
matching the mug controls, with lo-fi and Spotify. **Change player** folds open beneath the
playback controls to choose Cream cassette, Sage boombox,
Walnut radio or Record player. Shaded cutouts stay anchored on the desk and match all four lights.
Each device has its own size and contact shadow; the turntable stays level. The original chair and pink throw
are a foreground layer: a registered transparent cutout masks the original room pixels above
the players, preserving the chair's texture and lighting while covering their lower left edges.
The chair mask loads with the player before a replacement appears; missing layers retain the
original or previous painting until retry succeeds.
The cassette reels and record label turn during playback; the walnut radio has a soft tuning-light
pulse. Motion pauses at the desk, in hidden tabs, while the microphone ducks music and with reduced
motion. Choosing a design never starts music or changes its source. Browser-local preferences
survive Reset layout; failed artwork loads retain the original or previous player with a retry.
The camera opens a compact picker with Classic black, Silver film, Cream instant and Sage compact
designs, plus an explicit Open Photos action. The iced-coffee glass opens the same kind of picker
for Iced latte, Cold brew, Iced matcha and Strawberry milk, with Buy me a coffee inside. Choosing
art never navigates or opens the support page. Each design stays anchored on the desk and matches
the room light. Small background repairs sit below monitor media so uploaded pictures stay intact.
Choices save independently in this browser, survive Reset layout, and retain the previous art if
loading fails. Retry and unsaved-storage feedback are visible. Escape, Done and backdrop clicks
restore the opener, or its visible shortcut after resizing. The support action stays a real link.
The microphone opens the same Practice entry as the computer.
The mug, plant, player, iced drink and camera gain a pale-blue silhouette outline with a soft bloom on hover or
keyboard focus, like the chair. Their current cutouts supply the contour: the plant's canopy
growth stays aligned, steam and contact shadows are excluded, and the player outline remains
behind the chair. Outlines hide while their controls are open or the desk is entered; reduced
motion removes the fade. Existing labels and targets remain, with the old target glow retained
only until replacement artwork is ready. The microphone target keeps its glow.
On narrow screens, Photos/Practice/Music/Plants/Tea/Chair/Coffee/Camera shortcuts
use one compact row when space allows, and two rows on phones with 44px targets. This
keeps these actions reachable when their painted objects are cropped. Music opens without
playing or changing the route or camera. Its metallic CD with cover artwork sits above source tabs,
a mood select, skip/play/pause and volume controls; four artwork choices fit in one row.
The complete 160px CD spins during playback, pausing when music pauses, the microphone is in
use, the dialog is closed or the tab is hidden; reduced motion keeps it still. Changing the
room's player artwork leaves this CD and the selected music alone.
The dialog uses the mug's rounded surface and backdrop, stays within phone bounds and scrolls
on short screens. Closing, Escape or a backdrop click returns focus while music continues.
Old `#/music` links open the same compact controls over the room. A compact
player in both menu bars shows the selection with a separate play/pause button; clicking
its artwork/title reopens Music, even when paused. Spotify stays mounted across navigation.

- **Room** (`#/`): the painting full screen in the light of the hour (morning, day, sunset,
  night), with its small animations (birds, dust, the sleeping cat). Today's cards sit
  lower in the room as a swipeable paper stack (one per practice card, Motion springs);
  plain light/dark surfaces show the chapter, prompt, practice hint and Start action, with
  a small Up next label. No rotating photo covers; the back cards are quiet paper edges.
  tapping the top card starts it. The default stack sits in the lower-right corner on desktop
  and lower-center on phones. A few small widgets float in the painting (clock, note), riding
  the camera and draggable (Motion); they step aside rather than cover the stack. On smaller screens
  (under 1100×800, and again under 860×660) their contents shrink a little with CSS `zoom`; a widget
  still at home slides just clear of a neighbour, and of the Photos/Practice/Music shortcuts strip
  that replaces the painted desk objects on squarer screens. One you placed never moves. The sticky note
  is paper, not UI: six soft papers and six washi tapes drawn in CSS (no images), chosen in a small
  `--win` tray that appears under it only while you write, with a Neat/Handwritten choice (Caveat,
  bundled, SIL OFL); a second note can join it under the first; the selection gets a 2px `--accent` ring,
  and a round handle on its top-right corner resizes it (130–300px wide). The plant reads "A new
  week" before the week's first practice: the room shows no zeros. The
  computer itself is the other way in: its middle monitor has a steady glow following its painted edges,
  and a visible "Click the screen" cue ("Tap" on touch devices). Hover and keyboard focus make the
  edge clearer. The glow does not pulse. The glow and cue hide when entering.
- **The move**: the camera pushes into the painted monitor (about 1.1 s, ease in-out). As the
  screen fills the view, the desktop fades up out of a blur. Leaving reverses it. No rectangles
  are drawn over the painting during the move.
- **Menu bar** (room and desk alike, one `ds-bar` recipe): 30px in the room and 32px on the desk,
  dark glass with a 0.5px light hairline underneath and a faint text shadow so it reads over the
  morning painting. Left: the mark and app name, a 1px divider, then the course as a quiet chip with
  a small chevron (it truncates first when space runs out). Right, in groups split by short dividers:
  the room's icon actions (a palette for Make it yours, a reset arrow for Reset layout), then now
  playing, the desk's theme toggle, notifications and settings, then the date and time as one clock,
  then Leave desk on the desk. Every control is 24px tall with a radius of 6, a soft white hover, and
  the .97 press. Icon buttons keep their names for assistive tech and show a small ink tip under
  them after a short hover or on keyboard focus (`data-tip`), hidden while their panel is open. Below
  760px the dividers and the date go; below 1000px the now-playing title is capped at 150px. Reset
  layout stays visible even at the default layout.
  **Notification Center** slides in from the right edge (368px,
  greeting + date on top, one frosted card per notification, "Clear all"); a soft scrim dims the
  room behind it (a full blur on phones). An orange dot on the envelope means unread; never a count.
- **The room reacts, never scores**: the cat greets you on arrival; string lights and a warm lamp
  come on once today's cards are done.
- **Desktop** (`#/desk` and every other route): wallpaper is the same painting, blurred
  (34px) and slightly darkened. A menu bar on top (app name, now playing, date and time, Leave
  desk), a dock at the bottom, widgets in the middle, and at most one app window open on top.
  When a window is open the widgets fade back (opacity .3, blur 3px).
- **Practice** is the window you land in, filling the screen under the menu bar edge to edge as **one frosted
  sheet** over the blurred room (white glass about 58–80% with a 40px backdrop blur; the sidebar,
  text and recorder are split by hairlines; the sidebar is the most solid layer (about 90 % light
  neutral, less colour saturation) so the tree reads clearly in any light, even the night painting). It is laid out like a Markdown editor and fills the screen
  under the menu bar (the dock hides while it's open; the window's traffic lights sit at the top of
  the sidebar, like a Mac app). **A new voice starts** at `#/studio/start`: read the reference line once in your everyday voice;
  Lilt offers that take's range as your comfortable range and keeps it as Day 1. Under Home's welcome
  and opening paragraph sits a quiet callout (a `--panel` surface with a hairline): "First time here?" with a
  mic icon and a "Find my starting voice" primary button until a range is set; after, **your practice**, led by one **next step** (today's cards with a "Start today's cards"
  button, a rest day, or the next unfinished chapter once the cards are done), then: days this month, the last two weeks as dots
  (today ringed), and **Then and now** (your first and latest take of the same text, the reference line first, with how far
  apart they are). The two takes sit flat on the panel, each pitch chart in a `--fill` well, both on one shared scale, with one
  caption under the pair.
  **Today** (titled Today, with "Your daily deck: 5 cards" or how many are left under it) opens with one active stationery card: ivory paper in light mode,
  charcoal in dark, subtle grain and two decorative paper edges. The card position sits above
  the exercise, and the room's cat (92px) dozes on the card's top edge: it
  breathes faster and shows one small paper bubble while recording, and a pink heart rises once
  when you stop. Finished cards stack as a tiny tilted pile beside the count. The end of the deck
  is a slightly tilted paper slip: the date, one italic serif sentence and the cards by chapter,
  with the cat on top. Optional soft sounds (off by default) are paper, pencil and a two-note
  G5–D6 chime, synthesised quietly and silent whenever the microphone is in use. The prompt leads in the reading serif, followed by one hint
  and optional **Reading tips**. Record, replay and neutral Again/Hard/Good/Easy buttons share
  the area below the prompt. **How to practise**, **Up next** and **Practised today** fold away;
  upcoming choices are keyboard buttons, disabled while recording or reviewing. The centred
  column caps at 920px; controls wrap on phones and the page scrolls for longer text. A brief
  card entrance and recorder scrolling respect reduced motion. If the microphone can't be used, a calm help box says what happened and
  the one step that fixes it, with **Try again**.
  **A take's result reads top to bottom**: the note in words; then "Your middle pitch 165 Hz · E3"
  once, the scale and its sentence, and one quiet line of facts (usual range, voice heard, last time
  with the difference); the take's pitch chart, open and ready to play (click the line to hear that
  moment; the listen-back button and the chart share one audio and move together); one small footnote.
  **Resonance** sits under a chapter take's players (and a card's chart): a white card with a
  darker–brighter strip, your first take of that text as a tick in the middle, last time as a hollow
  ring and this take as the coral dot, then one sentence ("Brighter than your first take of this text,
  by about a semitone"; under 0.5 st "About the same"; 0.5–1 st "A little"). It compares only takes of
  the same text and microphone, says so when it can't, and ends "A rough guide; your ear decides."
  Daily ratings use plain labels and the next interval, with quiet keyboard hints; "Record it again"
  and "It hurts or feels strained" remain beside the review controls. While you rate a card,
  the recorder steps aside for replay and review. **The pitch reference scale**: the average man's (grey), the overlap where pitch can be
  heard either way (striped) and the average woman's (coral) speaking ranges, each average ± 1 SD, with a
  tick at each average and your middle pitch as a coral dot; then one sentence placing it in words
  and semitones from the average woman's pitch, and a caption that pitch is one part of how a voice is
  heard. Never percentages, never a score. Numbers and source live in `content/courses/voice/_pitch.md`.
  **Every take's result leads with words**: one observation and one thing to try (comfort first,
  then an end drop, then range and movement), on an accent-soft panel, before any numbers.
  **Recordings** opens inside Practice, listed with Home above the tree (and as a chip on phones):
  every take, newest first, grouped by day, one row each like a voice memo: a round play button
  (coral while playing), what it was (Free recording, Reference line, or the chapter) with its text
  and length, a waveform that fills coral as it plays and seeks on click, the time, and quiet
  favourite, note and delete icons. A status word appears only when a take needs attention.
  **Progress** says "Coming soon" (with a Soon tag in the sidebar) and points at Then and now and
  Recordings, until it can be trusted. While Practice fills the screen, the desk's widgets are hidden
  so nothing shows through the glass.
  **Home** (`#/studio`, the dock's Chapters app) opens with a time-of-day greeting and the date
  under it, then your practice (the next step first) and the next four chapters as tiles (from the
  one up next) with an "All chapters" link. **Chapters** (`#/studio/chapters`) shows the course cover as a rounded
  picture, then the owner's complete Markdown introduction in the expandable **Course guide**
  (above the chapters, since it introduces them), preserving references and code blocks across
  sections, then every chapter as a tile. The
  guide and chapter introductions use one centred reading column, fitting smaller screens.
  Width controls and section columns are removed for now. Previously saved width choices have
  no effect. References and footnotes stay within the same parsed Markdown document. The
  chapter catalog is generated with progress. When an agent has rewritten the syllabus for you, one quiet
line under the chapters says you're using your own version, with how many changes, and that your AI
assistant can show the differences, undo, or go back to Lilt's original; when Lilt's original has changed
since, a coral link adds "Lilt's original has N updates for you →". **Updates from Lilt**
(`#/studio/updates`, a full-width page like Recordings) lists them: **Choose** first, where you both
changed something, with yours and Lilt's new version side by side as two `--fill` options (the picked
one on `--accent-soft` with a 1px accent ring, its label in `--accent-ink`), texts in the reading
serif with their hint; then **Coming in**, one hairline row each (chapter title, a New / Updated /
Removed pill, which part in `--ink-3`), folding open to show the new version; then the ink "Bring in N
updates" pill, enabled once every choice is made, and "You can undo this afterwards". Done, it says
"All up to date." with how many came in and were kept, Back to Home and Undo. The recorder takes free
  recordings beside it. You can **resize** it: drag the sidebar's
  edge (200–420px; drag it very narrow to fold it away) or the divider between the text and the
  recorder (32–72%); double-click either to reset, or use the arrow keys on it. The sidebar
  **folds away**, sliding and fading over about a third of a second (the toggle glides with it), with
  the toggle beside the traffic lights or ⌘\ / Ctrl+\; the recorder half never gets narrower than
  340px, whatever the split. These sizes are kept in
  this browser. The sidebar (224px by default) lists places in 38px rows with 17px icons: Home,
  Today (with how many cards are left), Chapters, Recordings, Studio and Mixtape, and Practice
  settings at the foot. On the Chapters page and in a chapter, every chapter is listed indented
  under Chapters, by part (12px part names in sentence case), with a small medal once complete;
  the one you're in is a shade brighter and opens to its texts, 30px rows like the chapters on a
  hairline guide, with a grey tick once practised (never a pass/fail green). Only what you're on
  gets the `--fill-2` highlight, whether a place, a chapter or a text; every row has 8px corners.
  Elsewhere the list stays folded away. A chevron inside the Chapters row folds and unfolds the
  list (kept in this browser as
  `lilt.sidebar.chapters`); folded, only the chapter you're in and its texts remain.
  Choosing a text there or in the chapter keeps the URL (`#/studio/<chapter>/<text>`) in step. Links at the bottom carry the desk's app icons
  (Guided session, All practice texts, Back to the room). A finished chapter shows a "Chapter complete" badge under
  its title, which pops in with a spring (and a toast) when you earn it on that visit. The chapter reads as a document
  (720px column): a bold Geist H1 (54px, 760, −0.05em), a sans subtitle and meta line, an "About this chapter" note on a
  soft `--fill` panel (what the skill is, how it feels, how you'll know it's working; all of it on a first
  visit, then its first paragraph and a quiet "Read more ↓" once you've practised there), then texts in **Newsreader** (serif, 27px, passages 21px) with a plain hint
  under each and a quiet number in the margin. The active text has no card: it is in full ink with its
  number in coral, while the others step back to `--ink-3`; done texts get a drawn green tick. Each chapter's check-in text carries a small coral pill above it,
  "Check-in · record it each visit". A chapter with a video shows a quiet card under its tips (a red play tile, title, channel, "plays
  from YouTube"); nothing loads from YouTube until it's pressed, then the no-cookie player opens in place.
  Wider than 1100px, the screen splits in half: the text on the left, the recorder on the right.
  **While idle** (not recording or listening) the right half is just artwork and the record pill:
  the room's **cat asleep on its blanket** in the current light, filling the whole right half edge
  to edge (the painting anchored bottom-left and scaled to cover, the three cat layers placed as in
  the room), breathing, its tail swaying and ear twitching now and then, with little "z"s floating
  up. One centred column sits above the cat, over a soft dark glow:
  "Ready when you are" (42px, white), the hint, then the record pill as the main action (white,
  56px, red dot, `Space`), then the links as small quiet text.
  **Nothing chosen yet** (Today opened from the computer rather than from a card, or a chapter
  before a text is picked): no item is active and the recorder takes a **free recording** (prompt
  `free`, today's Studio session). Once it stops, the right half shows that take under a bold "Your
  take": listen back, then the measured pitch line and numbers as analysis lands, compared with the
  last free take. Picking a card or text makes it the exercise; exercise results stay under the item.
  **In use**, the instruments rise in, top to bottom: a big live **Now** readout (Geist 200, 68px, note
  under it) with a status pill (Ready, Live, Recording with a pulsing red dot, Saved); the pitch
  graph straight on the panel (note names up the side on a semitone grid from E2 to G4, comfortable
  band, faint loudness bars, every reading a faint dot and a smooth coral line through them with a
  soft glow and a dot at its tip); three
  white tiles (Middle, Usual range, Steadiness; a faint dash until there's data); then a compact centred
  **record pill** (ink, red dot, "Record", `Space`) that turns red with a white square, "Stop" and
  the timer while recording; hints under it. A take keeps the half second before you press Record (a
  pre-roll from a delay line that runs while the mic is open) and a short tail after Stop, so a quick
  start or a last syllable is never clipped; Practice opens the mic on arrival when it is already
  allowed. The live numbers are calm: the Now readout eases in semitones, ignores wobbles under a
  quarter semitone and changes at most about seven times a second; through a pause it keeps your
  last pitch at half opacity with "Last heard · E3" (and after Stop), and the tiles hold their last
  values instead of dropping to a dash. The pitch graph fills from the left and scrolls once it
  reaches the edge (8 s across). It reads your voice every 10 ms, and the line is cleaned before it is
  drawn (`cleanContour` in `pitch.ts`): octave slips are folded back; a wild reading goes when the
  detector was unsure of it or it sits beside a pause (a clear jump mid-speech stays); quiet, dead-steady
  hum (a fan, a fridge) under a fifth of your speech's loudness goes; each point is the median of its
  five neighbours, blips under 60 ms are dropped, and the line eases in semitones, so it glides
  rather than jumps; loudness behind it is a faint voice-memo waveform, one thin bar every 6 px. Narrower, the recorder docks at the bottom: **idle it is one slim row** (the
  record pill and its links), and the pitch readout, graph and numbers open only while recording or
  listening; it steps away while you rate a card. Rating sits inside
  the card you just said, under the listen-back, so your eyes never leave it. On phones the sidebar
  becomes a strip of chapter chips, sharing its row with the window's traffic lights.

**Settings** in the room is just the app's icon, like one on a Mac desktop, in the current macOS
style (drawn for Lilt): a 68px light glassy tile, a dark bezel, a fine-toothed metal gear and a smaller
one inside it, with no label. It, the
settings button in the room's and the desk's menu bars, and old `#/settings` links open **Settings,
its own window** over the room or the desk (up to 1080px wide, filling the height under the menu bar,
the world dimmed behind it), laid out like System Settings: a sidebar on `--fill` with the traffic
lights (red closes), a Search field, and categories with quiet line icons. The selected category
uses the soft accent color. That window is for Lilt as a whole; each app keeps its own settings
inside it, as Mac apps do.
**Practice settings** (`#/studio/settings`, the sidebar's foot with the Settings icon, a Settings chip on
phones, or ⌘,) is a page in Practice: a big "Practice settings" title with "Saved", then Your goal,
Routine (session length, reminder, comparison window) and Comfortable range as grouped rows; it
saves as you go, the open one on `--accent`. The pane on `--page` has a
"Settings" toolbar title and "Saving… / Saved", then the pane's name and one line on what it's
for, then grouped rows on `--panel` (label and help left, control right; choices like Theme and Text
size full width under their label). Changes save as you make them; there is no Save button. On a
phone the categories are a list, and a pane opens over it with a back arrow. Escape or a click
outside closes it.

**Settings → AI connections** starts with a choice of app, four cards in a row (ChatGPT first, then
Claude Desktop, Claude Code, Other apps; the chosen one on `--accent-soft` with an accent ring), and
shows that app's steps only. Previously: three quiet groups in the usual `--fill` boxes: **On this computer** (Claude Code, Claude Desktop,
other apps, each a command on a `--page` panel in `--mono` with a Copy button), **ChatGPT, and other
apps in the cloud** (three numbered steps: the tunnel command and the public address with "Save
address", the public MCP address to paste into ChatGPT, and "Get a code", which shows the one-time
code large in `--mono` with a countdown; signed-in apps follow as rows with Disconnect), and
**Recently used by** (app, last tool, how long ago). The sign-in page a cloud app opens is a single
white card on a warm grey page with the coral Lilt wordmark, "Connect ChatGPT to Lilt?", what it will
be able to do, the code field and Connect / Don't connect.

**Your mixtape** is what Lilt calls your own remix of a course (your AI's changes to it; the original
stays as it is). In Practice it is a place in the sidebar under Recordings, with a cassette icon and
a tag: how many changes (accent) or "N new" when the original has updates (green). Its page
(`#/studio/mixtape`, a Mixtape chip on phones) has a 44px "Your mixtape" title and one line on what it
is, then the same sections as a course's page in Courses: the green updates callout, **Now playing**
(the original, or your mixtape with Go back to the original), **Remix it with your AI** (first while
you're on the original, last once you have a mixtape), History with Undo last change, and Chapters
(remixed and added ones marked). Home's line under the chapters links to it.

**Remix** happens where you practise. Each chapter has an ink **Remix** pill (cassette icon) at the
top right of its title, beside a greyed-out **Edit** pill (pencil) that is planned, not built: it
does nothing, and on hover or focus a small ink tooltip says "Coming soon: edit this chapter
yourself". Remix it opens the **Remix chat**, a 400px panel floating on the right of Practice
(a bottom sheet on phones) in the window glass, sliding in from the right out of a slight blur. While
it is open the recorder half recedes (half opacity, 8px blur) so nothing is left cut at its edge. The
header is the chapter's name in bold with "Remixing into your mixtape" under it, beside a coral
cassette tile. Empty, it asks "What would you like to change in …?" (18px, 600) with one line on the
mixtape and three ideas as full-width rows with a chevron. Your asks sit right-aligned in ink; replies
on `--panel`, each change ending in a green saved row (tick, the change's note, and **Undo** on the
latest; "Undone" once taken back). While it works, a reply bubble of three bouncing coral dots says
"Remixing with your ChatGPT…"; a failed reply turns amber with **Try again**. The input grows with
what you type, with a coral send button and "Enter to remix · Shift+Enter for a new line". After a
remix the texts that changed glow coral for a moment in the chapter. Your ChatGPT rewrites the files
into your mixtape; the chat remembers the last turns, so "even shorter" works. **New chapter**, a
quiet "+" row at the end of the sidebar's chapters, adds a blank chapter to your mixtape and opens
the chat on it ("What should this chapter be about?"). The Mixtape page explains the three ways (a
chapter, a new chapter, the whole course) and has "Remix the whole course". Without ChatGPT
connected, the chat offers Connect ChatGPT.

**Courses** (`#/courses`, a dock app: three books on violet) opens in a 1280px window. The list: a
34px "Courses" title and one line on what a course is, then one card per course (a kind tile, coral
for voice and blue for language, the title, the kind and "in Practice" for the app's course, two lines
of summary, then pills: "Original" or "Your copy · N changes" in accent, "N updates" in green), and a
quiet note on adding a course folder. A course's page: "All courses" back link; the tile at 64px, the
title, summary and pills, and "Open in Practice" for the app's course; a green callout with "Review
updates" when the original has changed; then grouped boxes: Now playing (with Go back to the original,
confirmed inline), History (each change's note, what it did and when, with "Undo last change"),
Chapters (numbered, yours marked), and Change it with your AI (example asks, the locked sections, a
button to AI connections). Updates open in the same window, with "Back to the course".

## Tokens (light; dark theme swaps the window and ink colours)

**Ball of yarn** uses painted day/night window-side scenes with garden foliage, embroidered linen,
wood grain, a braided rug, books and a knitting basket. A fluffy grey-and-cream kitten has separate
watching, reaching and resting artwork; the coral yarn has overlapping wraps, twisted fibers and fuzz.
The cat bobs when changing position, reaches for nearby yarn, briefly perks up after threading
a loop and curls up at rest. Free play leaves out loops and their note cues. Static scenery is cached
separately from the voice-driven yarn and loops. Setup shares the scene with a compact sheet;
on narrow screens it scrolls below the illustration. How-to instructions expand on demand.
The play field caps at 1920×1100 CSS pixels on large screens, with a persistent bottom row
for a breathing break, Stop and the comfort stop. Light/dark scenes stay legible, and reduced
motion stops the preview float, yarn spin, cat bobbing, reaching, hops and light shimmer.
Breathing breaks freeze decorative game time as well as play.
Local WebP art loads without blocking play; the drawn room and cat remain as a fallback. The
background is painted to a separate cached canvas on resize, theme change or image load. Intro
copy and sentence controls have their own quiet surfaces, and loops have a fine cream edge so
they remain readable over the detailed painting. Prompts and provenance are in `web/public/yarn/CREDITS.md`.

| Token | Value | Use |
| --- | --- | --- |
| `--font` | Geist Variable | everything except texts you read aloud |
| `--read` | Newsreader Variable | the practice texts in the Practice document |
| `--mono` | Geist Mono, else system mono | kbd and numbers that must align, never labels |
| `--ink` | `#171717` (dark `#f4f4f4`) | text, primary buttons |
| `--ink-2` | `#4a4a4a` (dark `#c8c8c8`) | secondary text |
| `--ink-3` | `#737373` (dark `#9a9a9a`) | captions, meta |
| `--hair` | `rgba(0,0,0,.07)` | dividers |
| `--fill` / `--fill-2` | `rgba(0,0,0,.04)` / `.075` | quiet surfaces, hover |
| `--page` / `--panel` | `#fafafa` / `#fff` (dark `#181818` / `#212121`) | reading pages, raised surfaces |
| `--win` | `rgba(250,250,250,.94)` (dark `rgba(26,26,26,.92)`) + `blur(30px) saturate(1.7)` | windows |
| `--accent` / `--accent-ink` / `--accent-soft` | orange defaults: `#e0643c` / `#b8461f` / `rgba(224,100,60,.12)` | next-up, progress, current selection; custom light/dark shades from Accent color |
| `--rec` | `#ff4255` | the record dot only |
| `--ok` / `--warn` | `#16936a` / `#b26a00` | status text |
| radii | window 22, control 12, small 8, pill 999 | |

## Type

Text size (Settings → Appearance, kept in this browser as `lilt.text`) scales the reading areas as a whole with CSS `zoom` (0.92, 1, 1.12, 1.25): the Practice page column, the windows' contents and the Settings sheet, so their proportions hold. The Practice frame, sidebar, recorder and the room stay at their size.

Settings, Course Home and Today share tokens in `web/src/theme/base.css`: page titles 28–34px / 600,
section headings 18px, body 15px, controls 14px and captions 13px. Help text uses `--ink-2`.
Weights are 400, 500, 600 and 700 (200 and 300 for big live numbers). The reading serif keeps its
own sizes. Big numbers are Geist 300 with tight tracking. Sentence case everywhere.

Spacing follows 4, 8, 12, 16, 24, 32 and 48px. Every Practice page (Home, Chapters, a chapter,
Today, Recordings, Studio, Practice settings, Mixtape) uses one centred 960px column with 18–40px
responsive side padding, so nothing jumps when you switch pages; running text inside it (chapter
intros, tips, hints, notes) stops at about 68 characters, while players, charts and videos use the
full column. Reading
surfaces are opaque `--page` so room artwork does not compete with the text. Course Home's
shortcuts are quiet links, and its guide is a disclosure between hairlines.

The chapter comfort footer uses the full reading width, with 24px above its divider and 16px
inside it. Course lists use rows between hairlines; course detail pages lead with linked chapters
before copy management. Markdown reads like a quiet modern page (`web/src/ui/markdown.ts`):
16px body at a 1.7 line height, prose stopping at about 68 characters, headings in semibold with
more room above (2.2em before an h2) than below, and links in ink with a soft accent underline that
turns accent on hover. Quotes are a 1px hairline on the left, tables are plain rows with a stronger
rule under the header (no zebra), and pictures are framed with a hairline and soft shadow at the
reading width. Footnotes sit in their own area. Tables and code scroll within the reading column.
Practice Home, like a chapter, is a centered 960px column under its full-width cover.

Course homes, chapters, guides, practice texts and course details share this width, including
other courses and their guided practice and recordings pages. Course browser windows use the
same 1280px outer width and 40px desktop side padding. Today's practice uses the same centered
width with its existing paper cards.
The active voice exercise keeps the plain reading surface with its recorder below; all exercises
use compact rows with hairline dividers.
A voice chapter is a centered 960px column, so its intro, tips, texts and players line up with
the text width and wide screens keep even margins instead of an empty right side. It keeps its
side padding, number gutter and introduction spacing. Selection and hover keep the reading
surface plain.

## Components

UI components use Tailwind 4 utilities and explicit shared recipes. Runtime theme values are
mapped through `web/src/theme/tailwind.css`; see [Tailwind conventions](docs/tailwind.md).
Keep component styles out of separate handwritten stylesheets. The room's custom geometry
uses the same utilities, while animation keyframes and document defaults stay centralized.

- **Window**: traffic lights (red closes back to the desktop), title or a back button in the
  toolbar, content padded 24–28px, scrolls inside. One window at a time.
- **Primary button**: ink background, white text, 44px tall, radius 12. **Secondary**: `--fill`.
  **Quiet link**: `--ink-2`, no underline until hover.
- **Record**: an ink pill with a red dot and "Record"; while recording it turns `--rec` with a white square, "Stop" and the timer.
- **Segmented control**: `--fill` track, the active segment white with a hairline shadow.
- **Lists**: rows with hairline separators. No card inside a card.
- **Stats**: small `--fill` tiles, caption above, number below.
- **Pills**: 11.5px / 600, sentence case, `--fill` (or `--accent-soft` for "up next").
- **Pitch charts**: one chart everywhere (`PianoRoll`: live, after a take, in a chapter): note names
  on a semitone grid (C lines strongest), a soft accent band for the comfortable range, faint accent
  dots for each reading, a smooth accent line, the middle pitch dashed, last time as a grey line, and
  after a take a playhead with a dot where it meets the line; click to play from there. Hovering shows
  what's there in a small ink label above the line ("1.8 s · 172 Hz · F3").

## Motion

150–250 ms on controls, ease-out; transform and opacity only; buttons scale to .97 on press;
everything has a `prefers-reduced-motion` fallback.

## Never

Purple-to-blue gradients, gradient text, tracked capital labels or eyebrows above headings,
monospace as decoration, hard offset shadows, coloured side stripes thicker than 1px,
emoji or unicode glyphs as icons, cards inside cards, chunky 2px dark borders.
