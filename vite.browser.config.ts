import { mergeConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
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
          include: ["tests/browser/preview-geometry.test.tsx"],
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
