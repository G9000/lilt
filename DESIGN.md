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
  text and recorder are split by hairlines, and the text is the most opaque so it reads easily). It is laid out like a Markdown editor and fills the screen
  under the menu bar (the dock hides while it's open; the window's traffic lights sit at the top of
  the sidebar, like a Mac app). A 272px sidebar holds a white **Today** card with a coral progress
  bar, then the seven **chapters** (the text levels): a mono number until started, then a progress
  ring, then a coral **medal** (a white star on coral) once every text is practised; the "Chapters"
  heading counts how many are complete. A finished chapter shows a "Chapter complete" badge under
  its title, which pops in with a spring (and a toast) when you earn it on that visit. The chapter reads as a document
  (720px column): a bold Geist H1 (54px, 760, −0.05em), a sans subtitle and meta line, a "How to do it" note on a
  soft `--fill` panel, then texts in **Newsreader** (serif, 27px, passages 21px) with a plain hint
  under each and a quiet number in the margin. The active text has no card: it is in full ink with its
  number in coral, while the others step back to `--ink-3`; done texts get a drawn green tick.
  Wider than 1100px, the screen splits in half: the text on the left, the recorder standing on the
  right on the sidebar's tone, top to bottom: a big live **Now** readout (Geist 200, 68px, note
  under it) with a status pill (Ready, Live, Recording with a pulsing red dot, Saved); the pitch
  graph straight on the panel (comfortable band, faint Hz guide lines labelled on the right,
  rounded loudness bars, the live pitch line in coral with a soft glow and a dot at its tip); three
  white tiles (Middle, Usual range, Steadiness; a faint dash until there's data); then a compact centred
  **record pill** (ink, red dot, "Record", `Space`) that turns red with a white square, "Stop" and
  the timer while recording; hints under it. Narrower, the same parts dock at the bottom in their own panel, with the numbers on a second row. Rating sits inside
  the card you just said, under the listen-back, so your eyes never leave it. On phones the sidebar
  becomes a strip of chapter chips.

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
