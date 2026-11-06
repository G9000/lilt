# JavaScript loading — 7 November 2026

## Measured production output

The original bundle loaded every screen immediately. Route screens and Settings now use
module-level React lazy imports. The existing room, desktop chrome and microphone provider
remain mounted while a page loads. Local loading/error boundaries keep navigation usable;
an explicit Reload Lilt action recovers from a failed module download.

| JavaScript | Before | After |
| --- | ---: | ---: |
| Initial load, including static imports | 1,322,178 bytes | 594,751 bytes |
| Initial load, gzip | 373,683 bytes | 179,668 bytes |
| Total across all chunks | 1,322,178 bytes | 1,307,961 bytes |
| Total across all chunks, gzip | 373,683 bytes | 384,271 bytes |

The initial download is **55.0% smaller**, or **51.9% smaller compressed**. Total raw
JavaScript is only 1.1% smaller. Compressing separate chunks costs about 3% more than one
large compressed file if every feature is eventually downloaded. These are byte measurements,
not loading-time benchmarks. The existing Vite warning above 500 KB remains visible.

`test:bundle` now checks the initial entry and its recursive static imports against 650 KB
raw / 200 KB gzip, in addition to the existing total budgets. Browser tests also observe
actual requests to verify that closed screens are not downloaded at startup.

## Changes that support the split

- Moved the microphone context/provider into `components/Microphone.tsx`. Its logic is
  unchanged; `Recording.tsx` reexports the same provider and hook for existing consumers.
  Starting Lilt no longer imports all the recording controls and practice recipes through it.
- Moved seven window-chrome recipes into `ui/desktop.ts`, so Desk and Music do not eagerly
  import the full practice stylesheet data.
- Removed 48 recipes with no static references in either the current source or committed
  source. Preserved all ordered tokens in the other recipes.
- Folded static class text at build time and replaced 701 repeated JSX array/filter/join
  expressions with the existing `cx` helper. An independent AST comparison verified all
  33 affected files against their saved originals.
- A failed boundary resets on navigation, but healthy children retain their identity.
  In particular, switching between Voice's full-window routes does not remount VoicePage
  or refetch its course data.

## Verification

- Type check, all 161 unit tests and production builds passed; the generated CSS source
  audit emitted all 7,852 retained recipe utilities.
- Production loading tests passed: exact initial request graph, delayed and failed module
  downloads, explicit reload recovery, direct phone links, closing/reopening Settings while
  its first download is pending, preserved Voice state and one shared microphone stream
  across Yarn and practice.
- Production UI consistency passed for Home, daily deck, Settings, enlarged text, free
  practice, desktop Today and guided practice in light/dark themes at phone/desktop widths.
- Stationery-deck recording/retry, ratings, Again order, eyes-off reveal, selection,
  completion and comfort-stop interactions passed.
- Music's 17 moods, no autoplay, persistent mini player, microphone ducking and phone
  layout passed. Markdown passed five widths, both themes and both text sizes.
- Independent review verified retained recipe tokens, exact microphone extraction,
  static `cx` substitutions and healthy-screen identity preservation. A final structural
  comparison checked all 1,152 class expressions against saved originals, with zero differences
  beyond the 701 intended substitutions; unchanged joins and templates were included.
- Settings comparison passed all 10 cases; Feedback switching and accent interaction
  checks passed. The final repaired source passed production loading, UI consistency,
  recording, source-scanning and bundle-budget checks again.

All builds used disposable/scratch output; all browser API responses were stubbed. No owner
practice data or running server was used or replaced. The separate course work was committed
as `42ade78` and `8c87cb2` during this task; those changes remain outside this commit.
The before figure was captured at the start of this task, so the final total also includes
those small concurrent course fixes. The startup request graph and enforced budgets were
verified directly against the final build.
Local evidence is under ignored `lilt-data-tailwind/javascript/`.
