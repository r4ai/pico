import { mergeConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  // react-stately's virtualizer reads process.env.NODE_ENV. A build replaces
  // it and the dev server prebundles the module that does; the test browser
  // serves it as it is, and the language picker throws on open.
  define: { "process.env.NODE_ENV": '"test"' },
  optimizeDeps: {
    include: ["vitest-browser-react/pure"],
  },
  test: {
    include: ["tests/browser/**/*.test.tsx"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotFailures: false,
      instances: [
        {
          browser: "chromium",
          include: [
            "tests/browser/preview-geometry.test.tsx",
            "tests/browser/editor-keyboard.test.tsx",
          ],
          name: "chromium",
        },
        {
          browser: "chromium",
          include: ["tests/browser/preview-geometry-reduced.test.tsx"],
          name: "chromium-reduced-motion",
          provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
        },
      ],
    },
  },
});
