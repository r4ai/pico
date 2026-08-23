import type { ThemedToken } from "shiki/core";
import type { CSSProperties } from "react";

/** Shiki's FontStyle flags. */
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

/**
 * The styling one Shiki token needs.
 *
 * The single source for how a token looks, so the editor's decorations and the
 * export node cannot disagree.
 */
export function tokenStyle(token: ThemedToken): CSSProperties {
  const fontStyle = token.fontStyle ?? 0;
  return {
    ...(token.color ? { color: token.color } : {}),
    ...(fontStyle & ITALIC ? { fontStyle: "italic" as const } : {}),
    ...(fontStyle & BOLD ? { fontWeight: "bold" as const } : {}),
    ...(fontStyle & UNDERLINE ? { textDecoration: "underline" as const } : {}),
  };
}

const CSS_PROPERTY_NAMES: Record<string, string> = {
  color: "color",
  fontStyle: "font-style",
  fontWeight: "font-weight",
  textDecoration: "text-decoration",
};

/**
 * {@link tokenStyle} as an inline `style` string, for CodeMirror decorations,
 * which take attributes rather than React style objects.
 *
 * @returns An empty string for tokens that need no styling at all.
 */
export function tokenStyleCss(token: ThemedToken): string {
  return Object.entries(tokenStyle(token))
    .map(([property, value]) => `${CSS_PROPERTY_NAMES[property] ?? property}:${value}`)
    .join(";");
}
