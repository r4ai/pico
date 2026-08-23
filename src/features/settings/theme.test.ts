import { THEME_IDS } from "@/features/settings/theme";
import { expect, it } from "vite-plus/test";

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
});
