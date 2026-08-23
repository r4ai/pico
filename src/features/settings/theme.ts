import type { FrameColors } from "@/features/preview/frame-colors";

export const THEME_IDS = ["vitesse", "github", "catppuccin", "one", "rose-pine"] as const;

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
   * a theme looks like without downloading all five, and the frame can be
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
} as const satisfies Record<ThemeId, ThemePair>;

/** Every Shiki theme name reachable from the registry. */
export type ShikiThemeName = (typeof THEMES)[ThemeId]["light"] | (typeof THEMES)[ThemeId]["dark"];

export const DEFAULT_THEME: ThemeId = "vitesse";
export const DEFAULT_MODE: ColorMode = "dark";

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
