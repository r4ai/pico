import {
  COLOR_MODES,
  DEFAULT_MODE,
  DEFAULT_THEME,
  frameColorsOfTheme,
  shikiThemeOf,
  themeAccents,
  THEME_IDS,
  THEMES,
} from "@/features/settings/theme";
import { describe, expect, it } from "vite-plus/test";

describe("theme registry", () => {
  it("offers a varied catalog of paired themes", () => {
    expect(THEME_IDS).toEqual([
      "vitesse",
      "github",
      "catppuccin",
      "one",
      "rose-pine",
      "ayu",
      "everforest",
      "gruvbox",
      "kanagawa",
      "material",
      "night-owl",
      "solarized",
    ]);
    expect([DEFAULT_THEME, DEFAULT_MODE]).toEqual(["vitesse", "dark"]);
  });

  it.each(THEME_IDS)("resolves %s without loading its Shiki files", (id) => {
    for (const mode of COLOR_MODES) {
      expect(shikiThemeOf(id, mode)).toBe(THEMES[id][mode]);
      expect(frameColorsOfTheme(id, mode)).toBe(THEMES[id].colors[mode]);
      expect(themeAccents(id, mode)).toBe(THEMES[id].accents[mode]);
    }
  });
});
