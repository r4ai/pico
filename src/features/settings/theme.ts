import type { FrameColors } from "@/features/preview/frame-colors";

export const THEME_IDS = [
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
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const COLOR_MODES = ["light", "dark"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export type ThemePair = {
  readonly id: ThemeId;
  readonly label: string;
  readonly light: string;
  readonly dark: string;
  /**
   * What the frame is painted with, for each variant.
   *
   * Duplicated from the theme files for two reasons: the sidebar can show what
   * a theme looks like without downloading every variant, and the frame can be
   * painted in its real colours on the very first frame instead of jumping
   * into them once the highlighter arrives. A test asserts they still match.
   */
  readonly colors: { readonly light: FrameColors; readonly dark: FrameColors };
};

/**
 * Shiki themes are individually either light or dark, so each entry pairs the
 * two variants of one family. That keeps "which theme" and "light or dark" as
 * the two independent choices the UI presents.
 */
export const THEMES = {
  vitesse: {
    id: "vitesse",
    label: "Vitesse",
    light: "vitesse-light",
    dark: "vitesse-dark",
    colors: {
      light: { background: "#ffffff", foreground: "#393a34", lineNumber: "#393a3450" },
      dark: { background: "#121212", foreground: "#dbd7caee", lineNumber: "#dedcd550" },
    },
  },
  github: {
    id: "github",
    label: "GitHub",
    light: "github-light",
    dark: "github-dark",
    colors: {
      light: { background: "#fff", foreground: "#24292e", lineNumber: "#1b1f234d" },
      dark: { background: "#24292e", foreground: "#e1e4e8", lineNumber: "#444d56" },
    },
  },
  catppuccin: {
    id: "catppuccin",
    label: "Catppuccin",
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
    colors: {
      light: { background: "#eff1f5", foreground: "#4c4f69", lineNumber: "#8c8fa1" },
      dark: { background: "#1e1e2e", foreground: "#cdd6f4", lineNumber: "#7f849c" },
    },
  },
  one: {
    id: "one",
    label: "One",
    light: "one-light",
    dark: "one-dark-pro",
    colors: {
      light: { background: "#FAFAFA", foreground: "#383A42", lineNumber: "#9D9D9F" },
      dark: { background: "#282c34", foreground: "#abb2bf", lineNumber: "#495162" },
    },
  },
  "rose-pine": {
    id: "rose-pine",
    label: "Rosé Pine",
    light: "rose-pine-dawn",
    dark: "rose-pine",
    colors: {
      light: { background: "#faf4ed", foreground: "#575279", lineNumber: "#797593" },
      dark: { background: "#191724", foreground: "#e0def4", lineNumber: "#908caa" },
    },
  },
  ayu: {
    id: "ayu",
    label: "Ayu",
    light: "ayu-light",
    dark: "ayu-dark",
    colors: {
      light: { background: "#f8f9fa", foreground: "#5c6166", lineNumber: "#828e9f66" },
      dark: { background: "#0d1017", foreground: "#bfbdb6", lineNumber: "#5a6378a6" },
    },
  },
  everforest: {
    id: "everforest",
    label: "Everforest",
    light: "everforest-light",
    dark: "everforest-dark",
    colors: {
      light: { background: "#fdf6e3", foreground: "#5c6a72", lineNumber: "#a4ad9ea0" },
      dark: { background: "#2d353b", foreground: "#d3c6aa", lineNumber: "#7f897da0" },
    },
  },
  gruvbox: {
    id: "gruvbox",
    label: "Gruvbox",
    light: "gruvbox-light-medium",
    dark: "gruvbox-dark-medium",
    colors: {
      light: { background: "#fbf1c7", foreground: "#3c3836", lineNumber: "#bdae93" },
      dark: { background: "#282828", foreground: "#ebdbb2", lineNumber: "#665c54" },
    },
  },
  kanagawa: {
    id: "kanagawa",
    label: "Kanagawa",
    light: "kanagawa-lotus",
    dark: "kanagawa-wave",
    colors: {
      light: { background: "#F2ECBC", foreground: "#545464", lineNumber: "#766B90" },
      dark: { background: "#1F1F28", foreground: "#DCD7BA", lineNumber: "#54546D" },
    },
  },
  material: {
    id: "material",
    label: "Material",
    light: "material-theme-lighter",
    dark: "material-theme-darker",
    colors: {
      light: { background: "#FAFAFA", foreground: "#90A4AE", lineNumber: "#CFD8DC" },
      dark: { background: "#212121", foreground: "#EEFFFF", lineNumber: "#424242" },
    },
  },
  "night-owl": {
    id: "night-owl",
    label: "Night Owl",
    light: "night-owl-light",
    dark: "night-owl",
    colors: {
      light: { background: "#FBFBFB", foreground: "#403f53", lineNumber: "#90A7B2" },
      dark: { background: "#011627", foreground: "#d6deeb", lineNumber: "#4b6479" },
    },
  },
  solarized: {
    id: "solarized",
    label: "Solarized",
    light: "solarized-light",
    dark: "solarized-dark",
    colors: {
      light: { background: "#FDF6E3", foreground: "#657B83", lineNumber: "#657B8366" },
      dark: { background: "#002B36", foreground: "#839496", lineNumber: "#83949666" },
    },
  },
} as const satisfies Record<ThemeId, ThemePair>;

/** Every Shiki theme name reachable from the registry. */
export type ShikiThemeName = (typeof THEMES)[ThemeId]["light"] | (typeof THEMES)[ThemeId]["dark"];

export const DEFAULT_THEME: ThemeId = "vitesse";
export const DEFAULT_MODE: ColorMode = "dark";

export function isThemeId(value: string): value is ThemeId {
  return Object.hasOwn(THEMES, value);
}

/** Resolves a theme pair and a mode to the Shiki theme name to highlight with. */
export function shikiThemeOf(theme: ThemeId, mode: ColorMode): ShikiThemeName {
  return THEMES[theme][mode];
}

/**
 * The frame's colors for a theme, without waiting for the highlighter.
 *
 * A frame that starts transparent and fills in later is a visible flash, and
 * one that starts with no colors at all is a different size than the finished
 * one. Both are avoided by painting from the registry's own copy immediately
 * and letting the resolved theme take over once it arrives.
 */
export function frameColorsOfTheme(theme: ThemeId, mode: ColorMode): FrameColors {
  return THEMES[theme].colors[mode];
}
