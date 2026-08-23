import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite-plus";

/**
 * The face the first screen is painted in, unless a link says otherwise.
 *
 * Kept as the file name rather than as a font id so a build against a
 * @fontsource release that renamed it fails loudly instead of quietly
 * shipping without the preload.
 */
const FIRST_SCREEN_FACE = "geist-mono-latin-400-normal.woff2";

/**
 * Preloads the font the code will be set in, from the HTML rather than from
 * the application.
 *
 * A webfont is only fetched once something on the page is rendered in it, so
 * the request went out after the entry chunk had downloaded, parsed and
 * rendered — on a throttled link, at 1.9s, well after the first paint. The
 * preload starts it during HTML parsing instead, alongside the JavaScript, and
 * the font is there before there is anything to paint with it.
 *
 * Only the default face: the URL is hashed, so the tag cannot be written by
 * hand, and a link that names one of the other two fonts is rare enough not to
 * be worth an inline script that picks between them. Those fall back to
 * {@link useFontReady}, which holds the frame briefly rather than flashing it.
 */
function preloadFirstScreenFont(): Plugin {
  return {
    name: "pico:preload-first-screen-font",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        const face = Object.values(bundle ?? {}).find(
          (output) =>
            output.type === "asset" &&
            output.originalFileNames.some((name) => name.endsWith(FIRST_SCREEN_FACE)),
        );
        if (!face) throw new Error(`The build emitted no ${FIRST_SCREEN_FACE} to preload.`);

        return [
          {
            tag: "link",
            attrs: {
              rel: "preload",
              as: "font",
              type: "font/woff2",
              // Fonts are fetched anonymously even from the same origin, and a
              // preload whose mode does not match is downloaded twice.
              crossorigin: "",
              href: `/${face.fileName}`,
            },
            // Appended rather than prepended so <meta charset> stays first.
            injectTo: "head",
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [
    // The React Compiler memoizes renders for us. Pico re-renders its whole
    // tree on every keystroke, and the alternative is hand-written useMemo and
    // memo scattered across components that read better without them.
    react({ compiler: true }),
    tailwindcss(),
    preloadFirstScreenFont(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
