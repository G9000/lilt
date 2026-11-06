# Tailwind bundle optimization — 7 November 2026

The initial migration repeated identical utilities behind component-specific `:where(...)`
guards. Although those guards added no specificity, they prevented Tailwind from sharing
the generated rules. Thousands of class strings were also assembled with array joins and
tagged templates at runtime.

Removed redundant own-marker guards from shared, Markdown, accent and practice recipes.
Preserved actual states, ancestor/descendant selectors and specificity-bearing conditions.
Converted static recipe arrays into literal class text, including page recipes. This keeps
Tailwind 4 and its explicit source scanning; no replacement legacy CSS layer was added.

## Matching production builds

Built the same application with and without these recipe changes. Bytes include every
CSS/JavaScript asset; gzip uses Node's `gzipSync`. Fonts and public artwork were unchanged.

| Assets | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| CSS | 942,454 | 570,061 | 39.5% |
| JavaScript | 1,437,872 | 1,307,571 | 9.1% |
| CSS, gzip | 139,108 | 95,755 | 31.2% |
| JavaScript, gzip | 378,309 | 369,297 | 2.4% |
| Combined | 2,380,326 | 1,877,632 | 21.1% |
| Combined, gzip | 517,417 | 465,052 | 10.1% |

This measures downloaded/build bytes, not a measured improvement in loading or interaction
time. The existing large-JavaScript-chunk warning remains; code splitting was not part of
this change.

## Verification

- Web type check and 153 unit tests passed.
- Tailwind source audit emitted all 7,971 recipe utilities (10,304 before optimization).
- Production build passed. The new `test:bundle` builds into a disposable directory and
  verifies total CSS/JS against raw and gzip budgets, including every chunk.
- Twelve practice comparisons passed with no computed-style differences: daily deck,
  free studio and Flashcards, at 390/1440px in light/dark themes.
- Thirty-six page comparisons against the original production stylesheet passed with
  no differences: Settings, AI, Courses, Texts, Photos, Feedback, Library, Progress and Compare,
  at 390/1440px in both themes.
- UI consistency passed against the optimized production build and an isolated source build:
  Home, daily deck, Settings, largest text, free practice, desktop Today and guided practice.
- Eighteen room/Music/Yarn comparisons passed in the isolated snapshot: 49,786 computed
  properties across 390/600/1440px and light/dark themes, with no differences.
- Stationery-deck recording/retry, ratings, Again order, eyes-off reveal, selection,
  completion and comfort-stop interactions passed in the isolated snapshot.
- Markdown passed five widths, both themes and both text sizes. Accent controls passed
  picker/presets/hex input, contrast, persistence, resets, keyboard and narrow layouts.
- Independent review checked ordered recipe tokens against the original source: only the
  intended guard removals and note-control specificity fix changed tokens.

Removing guards exposed two cascade changes. The reading-column recipe retains its small
guard to preserve centering. The compact note control's padding explicitly wins over the
ghost-button recipe composed on the same element. The UI suite now checks both cases.

Another chat was modifying course navigation during verification. Its temporarily missing
`CoursePractice` import interrupted live-source room/deck tests. Final source checks use an
isolated snapshot of commit `6bc9942` plus only this optimization, with the existing local
dependencies. No owner server or practice data was accessed, restarted or replaced.
Evidence is in ignored `lilt-data-tailwind/optimization/`.

After the missing course import was added, the shared checkout also passed a fresh type
check, all 159 current unit tests, source audit and production bundle budget. That build
included the concurrent course additions (572,775 bytes CSS / 96,309 gzip and 1,321,426
bytes JS / 373,475 gzip); the matching-build table above isolates this optimization's effect.
