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
    include: ["src/**/*.browser.test.{ts,tsx}"],
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
            "src/app/initial-render.browser.test.tsx",
            "src/features/settings/japanese-fonts.browser.test.tsx",
            "src/features/settings/background.browser.test.tsx",
            "src/features/preview/preview-geometry.browser.test.tsx",
            "src/features/editor/editor-keyboard.browser.test.tsx",
            "src/app/chrome-keyboard.browser.test.tsx",
            "src/components/searchable-select/combobox-focus.browser.test.tsx",
            "src/features/toolbar/language-picker.browser.test.tsx",
            "src/features/settings/settings-motion.browser.test.tsx",
            "src/features/settings/sidebar-memory.browser.test.tsx",
            "src/features/toolbar/save-menu.browser.test.tsx",
            "src/features/editor/code-surface.browser.test.tsx",
            "src/components/toast/toast.browser.test.tsx",
            "src/components/toast/toast-failure.browser.test.tsx",
            "src/components/glass-panel/glass-hover.browser.test.tsx",
            "src/features/editor/language-detection-attempt.browser.test.tsx",
            "src/features/editor/language-detection.browser.test.tsx",
            "src/app/layout-shift.browser.test.tsx",
            "src/app/large-code.browser.test.tsx",
            "src/features/export/export-snapshot.browser.test.ts",
            "src/features/settings/settings-mode-focus.browser.test.tsx",
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
          include: ["src/features/preview/preview-geometry-reduced.browser.test.tsx"],
          name: "chromium-reduced-motion",
          provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
        },
        {
          browser: "chromium",
          include: [
            "src/features/settings/settings-drawer.browser.test.tsx",
            "src/features/settings/drawer-swipe.browser.test.tsx",
            "src/app/narrow-frame.browser.test.tsx",
          ],
          name: "chromium-narrow",
          viewport: { width: 420, height: 900 },
        },
      ],
    },
  },
});
