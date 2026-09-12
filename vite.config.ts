import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite-plus";
import { HLJS_MODULES } from "./src/features/editor/lib/detect-language";

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
  // The detector's grammars, which nothing here can find on its own: they are
  // reachable only from inside a worker, and Vite's dependency scan does not
  // follow one. Left undeclared, the first guess of a session has the dev
  // server discovering twenty-one modules at once, optimizing them, and
  // reloading the page underneath whatever was already running — which in a
  // browser test is a reload in the middle of a render, and fails as a null
  // dispatcher somewhere else entirely. See HLJS_MODULES.
  optimizeDeps: { include: [...HLJS_MODULES] },
  fmt: {},
  lint: {
    // react-hooks carries the React Compiler's own diagnostics, which is the
    // only way this repository sees them: the compiler runs through
    // `react({ compiler: true })` above, and a component it cannot lower keeps
    // its memoization silently — see the React Compiler notes in
    // docs/development.md. Nothing else here reports that.
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "react-compiler", specifier: "eslint-plugin-react-hooks" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      // The compiler's bailouts and the rules of React it rests on. Not the
      // whole plugin: `exhaustive-deps` and `rules-of-hooks` are oxlint's own,
      // and running them twice would report everything twice.
      "react-compiler/component-hook-factories": "error",
      "react-compiler/error-boundaries": "error",
      "react-compiler/globals": "error",
      "react-compiler/hooks": "error",
      "react-compiler/immutability": "error",
      "react-compiler/incompatible-library": "error",
      "react-compiler/preserve-manual-memoization": "error",
      "react-compiler/purity": "error",
      "react-compiler/refs": "error",
      "react-compiler/set-state-in-effect": "warn",
      "react-compiler/set-state-in-render": "error",
      "react-compiler/static-components": "error",
      "react-compiler/unsupported-syntax": "error",
      "react-compiler/use-memo": "error",
      "react-compiler/void-use-memo": "error",
    },
    options: { typeAware: true, typeCheck: true },
    // The layering, made a lint error rather than a convention:
    //
    //   app → features → components / hooks → core → lib
    //
    // A feature may not name another feature or the shell that composes them.
    // What two features share belongs in @/core; what one of them needs from
    // the shell arrives as a prop or through a context. Each layer below may
    // only reach further down. A test that has to cross — one that mounts the
    // whole application, or composes two features — is an integration test and
    // lives in tests/browser/ rather than under src/.
    overrides: [
      {
        files: ["src/features/editor/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                "@/features/export/**",
                "@/features/preview/**",
                "@/features/settings/**",
                "@/features/toolbar/**",
                "@/app/**",
              ],
            },
          ],
        },
      },
      {
        files: ["src/features/export/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                "@/features/editor/**",
                "@/features/preview/**",
                "@/features/settings/**",
                "@/features/toolbar/**",
                "@/app/**",
              ],
            },
          ],
        },
      },
      {
        files: ["src/features/preview/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                "@/features/editor/**",
                "@/features/export/**",
                "@/features/settings/**",
                "@/features/toolbar/**",
                "@/app/**",
              ],
            },
          ],
        },
      },
      {
        files: ["src/features/settings/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                "@/features/editor/**",
                "@/features/export/**",
                "@/features/preview/**",
                "@/features/toolbar/**",
                "@/app/**",
              ],
            },
          ],
        },
      },
      {
        files: ["src/features/toolbar/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                "@/features/editor/**",
                "@/features/export/**",
                "@/features/preview/**",
                "@/features/settings/**",
                "@/app/**",
              ],
            },
          ],
        },
      },
      {
        files: ["src/components/**", "src/hooks/**"],
        rules: {
          "no-restricted-imports": ["error", { patterns: ["@/features/**", "@/app/**"] }],
        },
      },
      {
        files: ["src/core/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: ["@/features/**", "@/app/**", "@/components/**", "@/hooks/**"] },
          ],
        },
      },
      {
        files: ["src/lib/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: ["@/features/**", "@/app/**", "@/components/**", "@/hooks/**", "@/core/**"],
            },
          ],
        },
      },
    ],
  },
});
