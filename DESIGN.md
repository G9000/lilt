# Lilt design system

Approved direction: mockup v7 (Oct 2026). The room painting is the world; inside its middle
monitor is a small macOS-style desktop where every part of Lilt is an app window.

## The world

- **Room** (`#/`): the painting full screen in the light of the hour (morning, day, sunset,
  night), with its small animations (birds, dust, the sleeping cat). Today's cards sit in the
  bottom-right as a swipeable stack (folder-style cards, one per practice card, Motion springs);
  tapping the top card starts it. A few small widgets float in the painting (radio, note), riding
  the camera and draggable (Motion); they step aside rather than cover the stack. The
  computer itself is the other way in (the middle monitor glows on hover).
- **The move**: the camera pushes into the painted monitor (about 1.1 s, ease in-out). As the
  screen fills the view, the desktop fades up out of a blur. Leaving reverses it. No rectangles
  are drawn over the painting during the move.
- **Menu bar** (room and desk alike): 30px, dark glass, the mark and app name left; now playing,
  notifications, date and time right. **Notification Center** slides in from the right edge (368px,
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
  and opening paragraph sits a quiet callout (a `--fill` panel, no shadow): "First time here?" with a
  mic icon and a "Find my starting voice →" link until a range is set; after, **your practice**, led by one **next step** (today's cards with a "Start today's cards"
  button, a rest day, or the next unfinished chapter once the cards are done), then: days this month, the last two weeks as dots,
  and **Then and now** (your first and latest take of the same text, the reference line first).
  Today opened with nothing picked tags the next card **Start here** and offers "Start today's
  cards" by the recorder. If the microphone can't be used, a calm help box says what happened and
  the one step that fixes it, with **Try again**.
  **A take's result reads top to bottom**: the note in words; then "Your middle pitch 165 Hz · E3"
  once, the scale and its sentence, and one quiet line of facts (usual range, voice heard, last time
  with the difference); the pitch line folded behind "See the pitch line"; one small footnote.
  The ratings carry a face for how it felt (😣 Again, 😕 Hard, 🙂 Good, 😌 Easy), and "Record it again"
  and "It hurt or felt strained" are pill buttons with drawn icons (the latter tinted `--rec`).
  While you rate a card, the recorder half says "Nice one / Listen back, then rate how it felt"
  with no record button. **The pitch reference scale**: the average man's (grey), the overlap where pitch can be
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
  **Home** (`#/studio`, the dock's Chapters app) is the Practice index, read like a Notion page:
  a full-width cover (`cover:` in `content/courses/voice/index.md`), then the owner's words and pictures
  from that file (why it exists, an honest note, how it's laid out, looking after your voice, how to
  contribute, sources), then the chapters with progress, generated. When an agent has rewritten the syllabus for you, one quiet
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
  this browser. The sidebar (272px by default) is a **file tree, like Obsidian**, with a Home
  row at the top, aligned like the folders (its icon where their chevrons sit): **Today** and each
  **chapter** are folders (a chevron that folds, the name, a count, or a small medal once a chapter
  is complete); their cards and texts are the files, under a hairline indent guide, with a green
  tick once practised and the open one highlighted. The page you're on opens its folder. Clicking a
  card starts it; clicking a text opens it (`#/studio/<chapter>/<text>`), and choosing a text in
  the document keeps the URL and the tree in step. Links at the bottom carry the desk's app icons
  (Guided session, All practice texts, Back to the room). A finished chapter shows a "Chapter complete" badge under
  its title, which pops in with a spring (and a toast) when you earn it on that visit. The chapter reads as a document
  (720px column): a bold Geist H1 (54px, 760, −0.05em), a sans subtitle and meta line, a "How to do it" note on a
  soft `--fill` panel, then texts in **Newsreader** (serif, 27px, passages 21px) with a plain hint
  under each and a quiet number in the margin. The active text has no card: it is in full ink with its
  number in coral, while the others step back to `--ink-3`; done texts get a drawn green tick.
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
  graph straight on the panel (comfortable band, faint Hz guide lines labelled on the right,
  rounded loudness bars, the live pitch line in coral with a soft glow and a dot at its tip); three
  white tiles (Middle, Usual range, Steadiness; a faint dash until there's data); then a compact centred
  **record pill** (ink, red dot, "Record", `Space`) that turns red with a white square, "Stop" and
  the timer while recording; hints under it. A take keeps the half second before you press Record (a
  pre-roll from a delay line that runs while the mic is open) and a short tail after Stop, so a quick
  start or a last syllable is never clipped; Practice opens the mic on arrival when it is already
  allowed. The live numbers are calm: the Now readout eases in semitones, ignores wobbles under a
  quarter semitone and changes at most about seven times a second; through a pause it keeps your
  last pitch at half opacity with "Last heard · E3" (and after Stop), and the tiles hold their last
  values instead of dropping to a dash. The pitch graph fills from the left and scrolls once it
  reaches the edge (8 s across); each point is the median of its five neighbours, so a one-frame
  octave misread doesn't spike the line; loudness behind it is a faint voice-memo waveform, one thin
  bar every 4 px. Narrower, the recorder docks at the bottom: **idle it is one slim row** (the
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
lights (red closes), a Search field, and the categories, each a coloured rounded tile with a white
glyph (Appearance graphite, AI connections coral, Notifications red, Date & time slate, Privacy
blue). That window is for Lilt as a whole; each app keeps its own settings inside it, as Mac apps do.
**Practice settings** (`#/studio/settings`, the sidebar's foot with the Settings icon, a Settings chip on
phones, or ⌘,) is a page in Practice: a big "Practice settings" title with "Saved", then Your goal,
Routine (session length, reminder, comparison window) and Comfortable range as grouped rows; it
saves as you go, the open one on `--accent`. The pane on `--page` has a
toolbar title and "Saving… / Saved", then a large tile, the pane's name and one line on what it's
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

**Courses** (`#/courses`, a dock app: three books on violet) opens in an 860px window. The list: a
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

| Token | Value | Use |
| --- | --- | --- |
| `--font` | Geist Variable | everything except texts you read aloud |
| `--read` | Newsreader Variable | the practice texts in the Practice document |
| `--mono` | Geist Mono, else system mono | kbd and numbers that must align, never labels |
| `--ink` | `#17171d` | text, primary buttons |
| `--ink-2` | `#4c4c58` | secondary text |
| `--ink-3` | `#8b8b97` | captions, meta |
| `--hair` | `rgba(0,0,0,.07)` | dividers |
| `--fill` / `--fill-2` | `rgba(0,0,0,.04)` / `.075` | quiet surfaces, hover |
| `--win` | `rgba(250,249,247,.92)` + `blur(30px) saturate(1.7)` | windows |
| `--accent` / `--accent-ink` / `--accent-soft` | `#e0643c` / `#b8461f` / `rgba(224,100,60,.12)` | the one warm accent: next-up, progress, current selection |
| `--rec` | `#ff4255` | the record dot only |
| `--ok` / `--warn` | `#16936a` / `#b26a00` | status text |
| radii | window 22, control 12, small 8, pill 999 | |

## Type

Text size (Settings → Appearance, kept in this browser as `lilt.text`) scales the reading areas as a whole with CSS `zoom` (0.92, 1, 1.12, 1.25): the Practice page column, the windows' contents and the Settings sheet, so their proportions hold. The Practice frame, sidebar, recorder and the room stay at their size.

Practice uses one scale (web/src/styles/editor.css): captions 12, small 13, secondary 14, body 15,
lead and small headings 17, section headings 21 and 24, page titles 44 (34 on phones); weights 400,
500, 600 and 700 only (200 and 300 for the big live numbers). The reading serif keeps its own sizes.


Window title 28–32px / 600 / -0.035em. Section 17–18px / 600. Body 15px. Small 13px. Caption 12px
in `--ink-3`. Big numbers are Geist 300 with tight tracking. Sentence case everywhere.

## Components

- **Window**: traffic lights (red closes back to the desktop), title or a back button in the
  toolbar, content padded 24–28px, scrolls inside. One window at a time.
- **Primary button**: ink background, white text, 44px tall, radius 12. **Secondary**: `--fill`.
  **Quiet link**: `--ink-2`, no underline until hover.
- **Record**: an ink pill with a red dot and "Record"; while recording it turns `--rec` with a white square, "Stop" and the timer.
- **Segmented control**: `--fill` track, the active segment white with a hairline shadow.
- **Lists**: rows with hairline separators. No card inside a card.
- **Stats**: small `--fill` tiles, caption above, number below.
- **Pills**: 11.5px / 600, sentence case, `--fill` (or `--accent-soft` for "up next").
- **Pitch lines**: accent line on a soft accent band for the comfortable range.

## Motion

150–250 ms on controls, ease-out; transform and opacity only; buttons scale to .97 on press;
everything has a `prefers-reduced-motion` fallback.

## Never

Purple-to-blue gradients, gradient text, tracked capital labels or eyebrows above headings,
monospace as decoration, hard offset shadows, coloured side stripes thicker than 1px,
emoji or unicode glyphs as icons, cards inside cards, chunky 2px dark borders.
