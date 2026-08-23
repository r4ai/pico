import "@/global.css";
import { fontFaceCss } from "@/features/settings/fonts";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";

// The app injects these at start-up; stories need them too.
const fontFaces = document.createElement("style");
fontFaces.textContent = fontFaceCss();
document.head.append(fontFaces);

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    layout: "centered",
  },
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "dark",
    }),
  ],
};

export default preview;
