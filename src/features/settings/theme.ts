export const THEME_IDS = ["vitesse", "github", "catppuccin", "one", "rose-pine"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ColorMode = "light" | "dark";

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

export const DEFAULT_THEME: ThemeId = "vitesse";
export const DEFAULT_MODE: ColorMode = "dark";

export function isThemeId(value: string): value is ThemeId {
  return Object.hasOwn(THEMES, value);
}

/** Resolves a theme pair and a mode to the Shiki theme name to highlight with. */
export function shikiThemeOf(theme: ThemeId, mode: ColorMode): string {
  return THEMES[theme][mode];
}
