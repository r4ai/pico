import type { ThemeRegistrationResolved } from "shiki/core";

/**
 * The three token colors a theme is recognized by.
 *
 * Enough to tell twelve themes apart in a sixteen-pixel swatch, and no more: a
 * preview drawn from the whole palette is a smear at that size. Keywords,
 * function names and strings are the three that carry a theme's character —
 * they are what changes most between families and what the eye lands on first
 * in a real snippet.
 */
export type ThemeAccents = {
  readonly keyword: string;
  readonly fn: string;
  readonly string: string;
};

/**
 * The TextMate scopes each accent is looked for under, in the order they are
 * tried.
 *
 * Themes disagree about how specific they are: some settle `keyword` in one
 * rule, others only ever name `keyword.control`. Every candidate is tried as an
 * exact scope across the whole theme before any of them is tried as a prefix,
 * so a rule that merely happens to start with the right words — a docstring
 * under `string.quoted.docstring`, which is a comment colour — cannot beat a
 * plain `string` rule further down the file.
 */
const SCOPES: Record<keyof ThemeAccents, readonly string[]> = {
  keyword: ["keyword.control", "keyword", "storage.type", "storage"],
  fn: ["entity.name.function", "support.function", "entity.name.type", "entity.name"],
  string: ["string.quoted.double", "string.quoted.single", "string", "string.quoted"],
};

type ThemeRule = { scope?: string | string[]; settings?: { foreground?: string } };

function scopesOf(rule: ThemeRule): string[] {
  const scope = rule.scope ?? [];
  return (Array.isArray(scope) ? scope : scope.split(","))
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * Reads a theme's three signature colors out of its own token rules.
 *
 * Not shipped: {@link THEMES} carries the answers as literals so the sidebar
 * can draw a theme without downloading it, and this is what a test holds those
 * literals to.
 */
export function themeAccentsOf(theme: ThemeRegistrationResolved): ThemeAccents {
  // `settings` rather than `tokenColors`: Shiki normalizes one into the other
  // as it loads a theme, and a resolved theme only ever has the former.
  const rules = ((theme.settings as ThemeRule[] | undefined) ?? []).filter(
    (rule) => rule.settings?.foreground,
  );

  const pick = (candidates: readonly string[]): string => {
    for (const scope of candidates) {
      const exact = rules.find((rule) => scopesOf(rule).includes(scope));
      if (exact?.settings?.foreground) return exact.settings.foreground;
    }
    for (const scope of candidates) {
      const prefixed = rules.find((rule) =>
        scopesOf(rule).some((name) => name.startsWith(`${scope}.`)),
      );
      if (prefixed?.settings?.foreground) return prefixed.settings.foreground;
    }
    return theme.fg;
  };

  return { keyword: pick(SCOPES.keyword), fn: pick(SCOPES.fn), string: pick(SCOPES.string) };
}
