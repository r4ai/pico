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
      // Wide enough for the settings to sit beside the picture rather than
      // over it. Almost every test here drives the settings and the editor in
      // the same breath, which is only possible in that arrangement: as a
      // drawer the panel is modal, and the canvas under it is deliberately out
      // of reach. The drawer has an instance of its own below.
      viewport: { width: 1280, height: 900 },
      instances: [
        {
          browser: "chromium",
          include: [
            "tests/browser/initial-render.test.tsx",
            "tests/browser/preview-geometry.test.tsx",
            "tests/browser/editor-keyboard.test.tsx",
            "tests/browser/chrome-keyboard.test.tsx",
            "tests/browser/language-picker.test.tsx",
            "tests/browser/settings-motion.test.tsx",
            "tests/browser/sidebar-memory.test.tsx",
            "tests/browser/save-menu.test.tsx",
            "tests/browser/code-surface.test.tsx",
            "tests/browser/toast.test.tsx",
            "tests/browser/glass-hover.test.tsx",
            "tests/browser/language-detection.test.tsx",
            "tests/browser/layout-shift.test.tsx",
          ],
          name: "chromium",
          // Deliberately not English. React Aria names the controls it adds in
          // the browser's language rather than the document's, and Pico says
          // `lang="en"`: run under the same locale as the machine and the test
          // that holds the two together cannot fail. See `Chrome`.
          provider: playwright({ contextOptions: { locale: "ja-JP" } }),
        },
        {
          browser: "chromium",
          include: ["tests/browser/preview-geometry-reduced.test.tsx"],
          name: "chromium-reduced-motion",
          provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
        },
        {
          browser: "chromium",
          include: [
            "tests/browser/settings-drawer.test.tsx",
            "tests/browser/drawer-swipe.test.tsx",
            "tests/browser/narrow-frame.test.tsx",
          ],
          name: "chromium-narrow",
          viewport: { width: 420, height: 900 },
        },
      ],
    },
  },
});
