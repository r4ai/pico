<p align="center">
  <a href="https://pico.r4ai.dev">
    <img src="./assets/pico-icon.png" alt="Pico" width="128" height="128" />
  </a>
</p>

<h1 align="center">Pico</h1>

<p align="center">
  <strong>Code, framed.</strong><br />
  Turn a snippet into a picture you can copy, save, or share.
</p>

**Pico = Picture + Code.** The editor and the exported image are the same surface: what you type is
what you get.

Paste code in the middle of the screen. The dock at the bottom copies, saves, or hands you a link.
Everything else lives behind one toggle in the top-left corner, and stays out of your way until you
want it.

## Design principles

- **No one should be lost on first use.** The initial screen is an editor and four buttons.
- **Feel good immediately, rather than configure endlessly.** Fewer, better-chosen options.
- **Show the minimum up front.** Details are one deliberate click away.

## Supported languages

Pico has an explicitly curated catalog of 243 languages: every standalone language bundled with
Shiki 4.4.3, plus Pico's CUDA grammar. The picker lists each language once in alphabetical order;
you can search by its full name, id, or a familiar alias such as `py`, `bash`, or `cs`.

Language selection and syntax highlighting are available for the entire catalog. Conservative
automatic detection covers these 30 languages:

TSX, TypeScript, JSX, JavaScript, C, C++, CUDA, Rust, LLVM IR, Python, Java, Go, C#, Kotlin, Swift,
Dart, Scala, Ruby, PHP, Shell, PowerShell, SQL, JSON, YAML, HTML, XML, CSS, Lua, R, and Elixir.

The catalog is maintained by Pico rather than automatically synchronized with Shiki. Dependency
updates therefore cannot silently add or remove options, and custom grammars can use the same
registry as bundled ones.

## Development

```sh
pnpm install
pnpm dev
```

| Command      | What it does                 |
| ------------ | ---------------------------- |
| `pnpm dev`   | Start the dev server         |
| `pnpm build` | Production build             |
| `pnpm check` | Format, lint, and type-check |
| `pnpm test`  | Run unit tests               |

## Deployment

Pico is deployed as static assets on Cloudflare Workers. There is no Worker script, server-side
rendering, or runtime storage. Static asset requests and storage are free on both the Workers Free
and Paid plans.

- Pull requests from this repository publish a public version preview at
  `pr-<number>-pico.<workers-subdomain>.workers.dev` after CI passes. Fork pull requests are never
  given deployment credentials and do not publish previews.
- Pushes to `main` publish production to <https://pico.r4ai.dev> after CI passes.

The GitHub repository must define these Actions secrets:

| Secret                  | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | The Workers & Pages account ID, not a zone ID                               |
| `CLOUDFLARE_API_TOKEN`  | A token scoped to Workers Scripts Write and `r4ai.dev` Workers Routes Write |

The token does not need DNS, KV, or R2 permissions. Cloudflare creates the Custom Domain DNS
record and certificate from [`wrangler.jsonc`](wrangler.jsonc).

## Fonts

Geist Mono, JetBrains Mono, and a subset of UDEV Gothic for Japanese. Only the
one you pick is downloaded, and only that one is embedded in an exported image.
See `public/fonts/README.md`.

## License

MIT for Pico itself. The bundled UDEV Gothic subset is under the SIL Open Font
License 1.1 — see `public/fonts/UDEVGothic-LICENSE.txt`.
