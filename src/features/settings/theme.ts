export const THEME_IDS = ["vitesse", "github", "catppuccin", "one", "rose-pine"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const COLOR_MODES = ["light", "dark"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export type ThemePair = {
  readonly id: ThemeId;
  readonly label: string;
  readonly light: string;
  readonly dark: string;
};

/**
 * Shiki themes are individually either light or dark, so each entry pairs the
 * two variants of one family. That keeps "which theme" and "light or dark" as
 * the two independent choices the UI presents.
 */
export const THEMES = {
  vitesse: { id: "vitesse", label: "Vitesse", light: "vitesse-light", dark: "vitesse-dark" },
  github: { id: "github", label: "GitHub", light: "github-light", dark: "github-dark" },
  catppuccin: {
    id: "catppuccin",
    label: "Catppuccin",
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
  },
  one: { id: "one", label: "One", light: "one-light", dark: "one-dark-pro" },
  "rose-pine": {
    id: "rose-pine",
    label: "Rosé Pine",
    light: "rose-pine-dawn",
    dark: "rose-pine",
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
