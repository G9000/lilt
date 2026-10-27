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

## Tokens (light; dark theme swaps the window and ink colours)

| Token | Value | Use |
| --- | --- | --- |
| `--font` | Geist Variable | everything; one family |
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
- **Record**: white 56–64px circle with a red dot; the dot becomes a rounded square while recording.
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
