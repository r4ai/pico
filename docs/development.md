# Development

Pico is a React and Vite single-page application deployed as static assets on Cloudflare Workers.
It has no Worker script, server-side rendering, or runtime storage.

## Setup

[mise](https://mise.jdx.dev/) installs the versions of Node.js, pnpm, and pinact specified by the repository.

```sh
mise install
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by `pnpm dev`.

## Agent tooling

The repository configures Chrome DevTools MCP for Codex in `.codex/config.toml`
and for Claude Code in `.mcp.json`. Both clients run the exact
`chrome-devtools-mcp` version installed by `pnpm install` through mise. The
server launches an isolated, headless Chrome profile and disables usage
statistics so it cannot read a developer's normal browser session.

Trust the project when Codex asks. Claude Code asks separately for one-time
approval of the shared `.mcp.json` server. Restart an existing agent session
after installing dependencies or changing either MCP configuration.

## Commands

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `pnpm dev`             | Start the development server                     |
| `pnpm check`           | Check formatting, lint rules, and types          |
| `pnpm run doctor`      | Scan the React codebase                          |
| `pnpm test`            | Run the unit tests once                          |
| `pnpm test:browser`    | Run geometry regressions in Chromium             |
| `pnpm test:coverage`   | Run the unit tests with coverage                 |
| `pnpm test:lighthouse` | Build and measure production performance         |
| `pnpm build`           | Build the production assets                      |
| `pnpm preview`         | Serve the production build                       |
| `pnpm storybook`       | Start Storybook                                  |
| `pnpm build-storybook` | Build Storybook                                  |
| `pnpm security:audit`  | Audit dependencies at moderate severity or above |

Run at least these checks before submitting a change:

```sh
pnpm check
pnpm test:coverage
pnpm test:browser
pnpm test:lighthouse
pnpm build
pnpm build-storybook
pnpm security:audit
```

## Performance

Measure on the production build rather than the development server, which
serves unbundled modules and renders through React's development build:

```sh
pnpm test:lighthouse
```

Lighthouse runs three mobile-profile measurements and evaluates their median.
CI keeps the HTML and JSON reports as a `lighthouse-reports` artifact
for 14 days. The enforced budgets are FCP at most 3,000 ms, LCP at most
4,000 ms, Speed Index at most 3,400 ms, TBT at most 200 ms, CLS at most 0.1,
and transferred bytes at most 450 kB. A median performance score below 0.85 is
reported as a warning because hosted-runner speed varies; the metric and byte
budgets remain blocking.

`.claude/launch.json` has an entry for that server. Several things are easy to
undo:

- CodeMirror loads as its own chunk, and the static rendering the export node
  is made of holds the frame until it lands. It was more than half the entry
  chunk — larger than React and React DOM together — and none of it is needed
  to lay out and paint the picture, which is the whole of what a shared link
  is for. Importing anything from `@codemirror/*`, `cm-theme`, or
  `shiki-highlight` outside `code-editor.tsx` puts it back. The three files
  carry a `react-doctor-disable-next-line` for exactly that reason; the rule
  reads one file at a time and cannot see the split.
- The editor's font, size, and line height are stylesheet rules rather than
  part of the CodeMirror theme, because the theme cannot be applied until
  Shiki has loaded and metrics arriving that late relayout every line. Its
  frame, foreground, and gutter colors also have synchronous stylesheet
  fallbacks, and CodeMirror is mounted in the layout phase, so neither its
  appearance nor its geometry changes after the first paint.
- The export node renders before the highlighter does, uncoloured, because the
  visible frame takes its width from it.
- The dock and the settings sidebar load as their own chunk. They are all of
  Pico's use of React Aria, which is the largest thing in the bundle after
  CodeMirror and React, and none of it is needed to paint the picture. Anything
  that pulls React Aria — or `cn`, which brings tailwind-merge — back onto the
  first-paint path undoes that.
- The build preloads the default font face from the HTML. Nothing fetches a
  webfont until something renders in it, so without the tag the request went
  out after the entry chunk had already rendered. Font-picker labels use the
  interface font: opening the list must not fetch every font it contains.
- `language.ts` holds only the ids. What a language is called and how its
  grammar is fetched lives in `language-registry.ts`, which is imported on
  demand by the highlighter and by the picker; it is 243 lazy `import()`
  closures and 10KiB of gzip, and no part of the first screen reads it. The two
  cannot drift, because the registry declares itself
  `satisfies Record<LanguageId, …>`.
- `toast` imports sonner on the first call rather than on load, and `<Toaster>`
  mounts on the same call. Nothing on the first screen has anything to
  announce. Importing `sonner` directly anywhere puts it back in the entry
  chunk.

Preview geometry has eight invariants:

- Padding, font size, frame width, and the line-number gutter use the same
  `260ms / --ease-glass` transition, and only a settings action or a font
  arriving late may enable it.
- The editor is built in a layout effect, already holding its theme and its
  placeholder. Its container is committed empty, and a passive effect runs
  after the browser has had its chance to paint, so the frame was painted at
  the height of nothing for a frame and sprang back — 0.06 of layout shift on
  a link that had done nothing but load. Anything the editor is handed from an
  effect instead is a frame of the wrong thing in the frame it takes over from
  the static rendering: blank where that had a placeholder, uncoloured where
  it had colour.
- The static rendering and the editor are the same size, empty or full. It is
  the invariant the export already rests on — what you see is what you save —
  and it is what lets the editor be swapped in under the reader without
  anything moving. The one thing only the live rendering draws is the
  placeholder, and it replaces the single empty line rather than joining it.
- The off-screen export node is always at the final settings. Its frame is
  synchronously measured as a border box before paint; `ResizeObserver` follows
  later font or content changes.
- The CodeMirror gutter stays mounted. Its width is shared with the export
  gutter and derives from the document's line-number digit count, including the
  9/10 and 99/100 boundaries.
- CodeMirror is asked to remeasure on every frame of that transition. It caches
  the document's height and writes it onto the gutter as a `min-height`, and a
  CSS transition changes every line without a DOM mutation, so nothing else
  tells it. Left stale, the frame holds its old height and then collapses in a
  single frame — visible only when shrinking.
- The frame is not painted until the code can be painted in its own font, and
  fades in when it can; see `useFontReady`. Chrome does not count an element
  fading up from zero as a contentful paint until the fade finishes, so first
  contentful paint reads about a transition longer than the frame is actually
  on screen. The alternative it replaced was a first paint in the system's
  monospace followed by a reflow. Whether the font is already here is asked
  while the first render is being built rather than from an effect, so a
  second visit skips the fade entirely rather than blanking a frame it could
  have painted.
- The narrowest a frame is drawn is one custom property,
  `--pico-frame-min-width`, read by the live frame and the export node alike.
  It is 28rem, or the width the canvas has if that is less — on a phone 28rem
  is wider than the window, and the picture came up clipped at both edges.

Changing the theme or the appearance is a view transition rather than a
transition per colour; see `crossFade`. Light and dark are cut in as a circle
growing out of the control that was pressed rather than dissolved: for that the
old snapshot is held still and the pair's blending is put back to normal, since
through `plus-lighter` the two would sum inside the circle and light and dark
would meet as white. Only a change somebody pointed at gets an origin — a name
chosen from a list has nowhere to grow from. The counterpart of a theme pair is
warmed the moment the settings open, which is what stops the first light-or-dark
switch of a session being the one switch that snaps; see `warmTheme`. Shiki's token colours are inline styles
on spans CodeMirror rebuilds, so they have no value to ease from and change in
one frame whatever the stylesheet says: easing the surfaces alone left dark
text on a background still going light, and easing the text as well sent it
through the grey it was crossing. Only a patch that is nothing but colour goes
through it — a setting that moves something is already easing to a new size.
The export node is at its new colours before the dissolve starts, so a capture
taken during one is the picture, not a blend.

`layout-shift.test.tsx` watches the browser's own `layout-shift` entries rather
than any of that indirectly: arriving at a link with code in it moves nothing at
all, picking a language moves nothing, and once a settings action's easing is
over nothing moves again. Not during one — every geometry change here is a
transition somebody started, and the picture easing to a new size is the point
of them. What the last of the three catches is the move after the move: a frame
holding a stale height and then collapsing into the right one in a single frame.

`pnpm test:browser` covers intermediate frames, rapid retargeting, export/live
agreement, height tracking while shrinking, the keyboard's way out of the
editor, the picker, the settings as a dialog and as a remembered layout, the
static rendering that stands in for the editor, and the dissolve. It runs three
Chromium instances: one at 1280px, where the settings sit beside the picture
and both can be driven at once; one at 420px for the drawer and the frame that
has to fit inside it; and one with reduced motion enabled.
Animation assertions control the Web Animations timeline directly; do not
replace that synchronization with frame counts or wall-clock sleeps, whose
progress depends on CI scheduling.

Measured on the production build at 4x CPU and 1.6 Mbps with a 150 ms round
trip, splitting the editor off took the entry chunk from 178 kB to 83 kB of
gzip, first contentful paint from about 1680 ms to about 1180 ms, and the
moment the picture behind a shared link is on screen from about 1.4 s to about
0.9 s. The editor itself arrives a few hundred milliseconds later than the
frame does; a click that lands in the meantime is remembered, and the editor
takes the keyboard as it mounts.

For a performance comparison, use the same 40-line snippet and the same
settings sequence on production builds before and after the change. Record a
Chrome Performance trace while changing padding, font, size, and line numbers;
check that the interaction contains no task longer than 50ms. Repeat a normal
typing trace to catch input regressions, and compare the gzip sizes printed by
`pnpm build` to keep the entry chunk's growth within 2KiB.

Throttle to check the parts that only show up on a slow connection: a Chrome
Performance trace with the CPU at 4x and the network at 1.6Mbps covers the
first paint, the font, and the order the chunks arrive in. What a keystroke
costs is dominated by Shiki retokenizing the whole document, which is within
budget at the sizes Pico is for; the language picker's list is virtualized
above forty options, without which opening it and typing in it each dropped a
frame.

Guessing the language runs in a worker. `highlightAuto` scores a document
against twenty grammars in one synchronous pass, and it was the longest task on
the page: measured on a hundred-line snippet, 223ms landing 1.1s after the
paste, alone, with nothing else running — which is to say while somebody is
still moving. Nothing about the guess touches the DOM. `language-detector.ts`
is the only thing that reaches for the worker and the only path to
`detect-language.ts`, so highlight.js and its grammars are reachable from
nowhere the page itself loads; importing `detect-language` from a component
puts all of it back. A browser test watches for a long task after the settle.

The React Compiler is enabled, so components do not need `useMemo` or `memo`
to survive the re-render every keystroke causes. It skips whole components and
hooks over syntax it cannot lower, silently as far as the app is concerned and
loudly in the build log — a `throw` inside a `try`, a `finally`, or a ref read
during a render each cost `useExport` and `CodeSurface` their memoization
until they were written another way. `pnpm build` should print no
`react-compiler` notes.

## React Doctor

React Doctor runs its full-project lint, dead-code, security, dependency, and health-score
diagnostics through `pnpm run doctor`. To inspect only issues introduced by the current branch, run
`pnpm run doctor --verbose --scope changed`. Pull requests receive advisory summaries and inline
review comments, while pushes to `main` record the full-project health score; these reports do not
block CI.

## Architecture

| Path                     | Responsibility                                   |
| ------------------------ | ------------------------------------------------ |
| `src/features/editor/`   | Editing, language detection, and highlighting    |
| `src/features/preview/`  | The visible code frame and export rendering      |
| `src/features/settings/` | Appearance settings and URL synchronization      |
| `src/features/export/`   | PNG/SVG generation and font embedding            |
| `src/features/toolbar/`  | Language selection, copy, save, and link actions |
| `src/components/`        | UI components shared across features             |
| `public/fonts/`          | The UDEV Gothic subset and its license           |

Pico synchronizes the code and appearance settings to URL query parameters.
Shared links compress the code into the URL, so the application does not need server-side storage.

## Design principles

- Show only the editor and essential export actions on first load.
- Prefer a small set of purposeful options over exhaustive configuration.
- Keep detailed settings in the sidebar, separate from editing and export.

## The chrome

Everything on screen that is not the picture. Four things about it are easy to
undo:

- Dock buttons go `aria-disabled` while a capture runs, never `disabled`. A
  button that disables itself under the press that started it hands focus back
  to the document, and `useExport` already refuses a second capture.
- Below 56rem the settings are a drawer over the picture behind a scrim, which
  makes them modal: `dialog`, `aria-modal`, and the canvas `inert` underneath.
  `useSidebarMode` is the single answer to which arrangement they are in, and a
  test holds the width it names to the one the stylesheet uses.
- As a drawer it can be pushed off the side with a finger; see
  `useSwipeDismiss`. Three things are easy to undo. The panel is written to
  directly rather than through state — a React render per pointer move would
  re-render every control the panel holds, sixty times a second, to move one
  box. The stylesheet says `touch-action: pan-y` rather than the hook calling
  `preventDefault`, which is what leaves the settings column its vertical
  scrolling while horizontal pans come here. And a dismissal ends by writing the
  panel to exactly where the closed state puts it, so the transform React writes
  a moment later is the one already running and the panel keeps going instead of
  restarting. Touch and pen only: a pointer with a cursor has the close button,
  the scrim, and Escape.
- That `inert` goes on the canvas div rather than on `<main>`, and the button
  that opens the settings leaves the tab order through `visibility` rather than
  `inert`. React Aria marks the top of the page inert while a popover is open
  and restores what it found there on close, so anything React writes to
  `inert` near the top of the tree is lost the first time a combobox closes.
- React Aria names the controls it adds — the button that opens a picker, what
  a list of options is called — in the browser's language rather than the
  document's, and Pico is English and says so in `<html lang="en">`. On a
  Japanese browser a screen reader was being handed Japanese words to read with
  English pronunciation. `Chrome` pins the two together with `I18nProvider`, and
  the wide Chromium instance runs under `ja-JP` so the test that holds them
  together can fail.
- `.pico-glass` asks for `backdrop-filter` and nothing else. Adding
  `-webkit-backdrop-filter` after it wins the cascade, the minifier collapses
  the pair onto the prefixed spelling, and Chrome and Firefox — which do not
  implement it — lose the blur entirely.

## Language support

The language picker uses a curated registry of standalone languages bundled with Shiki 4.4.3, plus Pico's custom CUDA grammar.
The registry does not automatically track Shiki, so dependency updates cannot silently change the available options.

Automatic detection covers these 30 languages:

TSX, TypeScript, JSX, JavaScript, C, C++, CUDA, Rust, LLVM IR, Python, Java, Go, C#, Kotlin, Swift, Dart, Scala, Ruby, PHP, Shell, PowerShell, SQL, JSON, YAML, HTML, XML, CSS, Lua, R, and Elixir.

## Fonts

Pico bundles eight coding fonts, including a subset of UDEV Gothic for Japanese text.
Opening the font picker does not download its candidates; Pico downloads and embeds only the
selected font.

See [`public/fonts/README.md`](../public/fonts/README.md) for instructions on updating the UDEV Gothic subset.

## Deployment

GitHub Actions deploys a public preview after CI passes for pull requests from this repository.
Pull requests from forks do not receive deployment credentials and therefore do not publish previews.

Pushes to `main` deploy to <https://pico.r4ai.dev> after CI passes.
Both environments use Cloudflare Workers Static Assets configured in [`wrangler.jsonc`](../wrangler.jsonc).

The repository requires these GitHub Actions secrets:

| Secret                  | Value                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | The Workers & Pages account ID, not a zone ID                                      |
| `CLOUDFLARE_API_TOKEN`  | A token with Workers Scripts Write and `r4ai.dev` Workers Routes Write permissions |

The token does not need DNS, KV, or R2 permissions.
Cloudflare creates the Custom Domain DNS record and certificate.

See [Supply chain](./supply-chain.md) for dependency and GitHub Actions update policies.
