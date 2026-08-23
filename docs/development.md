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
| `pnpm test`            | Run the unit tests once                          |
| `pnpm test:coverage`   | Run the unit tests with coverage                 |
| `pnpm build`           | Build the production assets                      |
| `pnpm preview`         | Serve the production build                       |
| `pnpm storybook`       | Start Storybook                                  |
| `pnpm build-storybook` | Build Storybook                                  |
| `pnpm security:audit`  | Audit dependencies at moderate severity or above |

Run at least these checks before submitting a change:

```sh
pnpm check
pnpm test
pnpm build
```

## Performance

Measure on the production build rather than the development server, which
serves unbundled modules and renders through React's development build:

```sh
pnpm build
pnpm preview
```

`.claude/launch.json` has an entry for that server. Two things in particular
are easy to undo:

- The editor's font, size, and line height are stylesheet rules rather than
  part of the CodeMirror theme, because the theme cannot be applied until
  Shiki has loaded and metrics arriving that late relayout every line.
- The export node renders before the highlighter does, uncoloured, because the
  visible frame takes its width from it.

The React Compiler is enabled, so components do not need `useMemo` or `memo`
to survive the re-render every keystroke causes.

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
