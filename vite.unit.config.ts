import { mergeConfig } from "vite-plus";
import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
