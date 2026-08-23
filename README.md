# Pico

**Pico = Picture + Code.** Turn a snippet into an image you can copy, save, or share as a link.

Paste code in the middle of the screen. That editor _is_ the preview — what you type is what gets
exported. The dock at the bottom copies, saves, or hands you a link. Everything else lives behind
one toggle in the top-left corner, and stays out of your way until you want it.

## Design principles

- **No one should be lost on first use.** The initial screen is an editor and four buttons.
- **Feel good immediately, rather than configure endlessly.** Fewer, better-chosen options.
- **Show the minimum up front.** Details are one deliberate click away.

## Supported languages

TSX, TypeScript, JSX, JavaScript, C, C++, CUDA, Rust, LLVM IR.

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

## License

MIT
