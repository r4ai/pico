import { mergeConfig } from "vite-plus";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      include: [
        "src/components/searchable-select/searchable-option.ts",
        "src/core/language/cuda-grammar.ts",
        "src/features/editor/lib/detect-language.ts",
        "src/core/language/language-registry.ts",
        "src/core/language/language.ts",
        "src/core/theme/frame-colors.ts",
        "src/core/settings/background.ts",
        "src/core/settings/fonts.ts",
        "src/core/theme/theme-accents.ts",
        "src/core/theme/theme.ts",
        "src/core/highlight/shiki.ts",
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
