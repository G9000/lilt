# Styling Lilt with Tailwind

Lilt uses Tailwind CSS 4 and its Vite plugin. The owner chose modern browser support;
older Safari is not a target. The web app and isolated browser fixtures use the same plugin.
The native updater uses Tailwind's CLI to produce its bundled stylesheet.

## Where styles live

- `web/src/styles.css` is the entry point, with explicit source scanning for `src` and test fixtures.
- `web/src/theme/base.css` contains document defaults and runtime light/dark, accent and text-size variables.
- `web/src/theme/tailwind.css` exposes those variables through `@theme inline` utilities and the dark variant.
- `web/src/theme/*-keyframes.css` contains animation definitions and their registered properties.
- `web/src/ui/` contains explicit shared, practice, page, Markdown and accent utility recipes.
- `web/src/desk/roomStyles.ts` contains the illustrated room, desktop, music and yarn recipes.
- `desktop/styles/updates.css` is the native updater's theme input; `desktop/ui/updates.html`
  contains its utilities. `desktop/ui/updates.css` is generated, not handwritten.

Use utilities directly in new JSX. Extract repeated combinations into a named recipe or shared
component. Compose complete class strings with `cx`; do not build a utility name from fragments.
For example, choose between complete `text-ink` and `text-accent-ink` strings.

The migration retains marker classes used by interactions, tests and state selectors. Recipes
are explicitly attached to their elements; there is no runtime class-name registry. A guarded
recipe such as `shared['btn-primary']` needs the `btn-primary` marker alongside it. Selectors
inside arbitrary variants preserve existing descendant and state behavior. Avoid adding new
marker-based styling when a direct utility or a small shared component expresses it clearly.

## Theme and interaction rules

Use semantic utilities such as `bg-page`, `bg-panel`, `text-ink`, `text-ink-2`, `border-hair`,
`text-accent-ink` and `rounded-control`. The accent picker still updates the same runtime
variables. Recording red and descriptive status colors keep their separate meanings.
`--control-radius` is the old 12px control token; it deliberately does not override Tailwind's
own `--radius-sm` token.

Preflight is omitted to preserve existing document defaults. When adding a border, specify
its style as well as its width and color. Keep focus indicators, disabled states, reduced motion,
both themes, custom accent colors and enlarged text working.

Use arbitrary properties for precise painted geometry and transforms that must cooperate with
Motion. Dynamic data such as waveform heights, playback position, chosen colors and dragged
coordinates may still use inline styles or CSS variables. Static layout belongs in utilities.

CSS source order is not class-string order. Avoid competing shorthands and longhands; for
example, a `font` shorthand can reset a separate weight, and `grid-area` can reset `grid-column`.
Use explicit non-conflicting properties and verify overlapping responsive variants.

Tailwind must see the exact class literal in source. For quoted or escaped arbitrary values,
use a suitable quote delimiter or `String.raw` so source scanning and the runtime class match.
Do not hide utility strings behind JSON escapes or dynamically generated names.

## Build and verify

`bun run build` builds the web app and regenerates the native updater stylesheet.
`bun run --cwd web build:desktop-styles` regenerates only the updater. Mac packaging also
regenerates it. Keep the generated updater CSS in sync with its HTML and theme input.

Run `bun run typecheck`, `bun run test`, and the relevant isolated browser suites after changes.
`bun run --cwd web test:styles` checks that every reusable recipe generates CSS, catching
source-scanning mistakes that TypeScript cannot detect.
Use a scratch output directory while testing web builds. Inspect narrow and wide screens in
light/dark themes, and exercise states rather than relying only on static screenshots.

Do not reintroduce handwritten component stylesheets, a plugin containing legacy selectors,
or an `@apply` wrapper around the former stylesheet system.
