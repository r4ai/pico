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

## Commands

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `pnpm dev`             | Start the development server                     |
| `pnpm check`           | Check formatting, lint rules, and types          |
| `pnpm run doctor`      | Scan the React codebase                          |
| `pnpm test`            | Run the unit tests once                          |
| `pnpm test:browser`    | Run geometry regressions in Chromium             |
| `pnpm test:coverage`   | Run the unit tests with coverage                 |
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
pnpm build
pnpm build-storybook
pnpm security:audit
```

## Performance

Measure on the production build rather than the development server, which
serves unbundled modules and renders through React's development build:

```sh
pnpm build
pnpm preview
```

`.claude/launch.json` has an entry for that server. Several things are easy to
undo:

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
  out after the entry chunk had already rendered.
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

Preview geometry has six invariants:

- Padding, font size, frame width, and the line-number gutter use the same
  `260ms / --ease-glass` transition, and only a settings action or a font
  arriving late may enable it.
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
  monospace followed by a reflow.
- The narrowest a frame is drawn is one custom property,
  `--pico-frame-min-width`, read by the live frame and the export node alike.
  It is 28rem, or the width the canvas has if that is less — on a phone 28rem
  is wider than the window, and the picture came up clipped at both edges.

Changing the theme or the appearance is a view transition rather than a
transition per colour; see `crossFade`. Shiki's token colours are inline styles
on spans CodeMirror rebuilds, so they have no value to ease from and change in
one frame whatever the stylesheet says: easing the surfaces alone left dark
text on a background still going light, and easing the text as well sent it
through the grey it was crossing. Only a patch that is nothing but colour goes
through it — a setting that moves something is already easing to a new size.
The export node is at its new colours before the dissolve starts, so a capture
taken during one is the picture, not a blend.

`pnpm test:browser` covers intermediate frames, rapid retargeting, export/live
agreement, height tracking while shrinking, the keyboard's way out of the
editor, the picker, the settings as a dialog, and the dissolve. It runs three
Chromium instances: one at 1280px, where the settings sit beside the picture
and both can be driven at once; one at 420px for the drawer and the frame that
has to fit inside it; and one with reduced motion enabled.

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

The React Compiler is enabled, so components do not need `useMemo` or `memo`
to survive the re-render every keystroke causes.

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
- That `inert` goes on the canvas div rather than on `<main>`, and the button
  that opens the settings leaves the tab order through `visibility` rather than
  `inert`. React Aria marks the top of the page inert while a popover is open
  and restores what it found there on close, so anything React writes to
  `inert` near the top of the tree is lost the first time a combobox closes.
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

Pico bundles Geist Mono, JetBrains Mono, and a subset of UDEV Gothic for Japanese text.
It downloads and embeds only the selected font.

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
