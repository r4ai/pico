import { mergeConfig } from "vite-plus";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      include: [
        "src/components/searchable-option.ts",
        "src/features/editor/cuda-grammar.ts",
        "src/features/editor/detect-language.ts",
        "src/features/editor/language-registry.ts",
        "src/features/editor/language.ts",
        "src/features/preview/frame-colors.ts",
        "src/features/settings/fonts.ts",
        "src/features/settings/theme-accents.ts",
        "src/features/settings/theme.ts",
        "src/lib/shiki.ts",
        "src/lib/url-codec.ts",
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
