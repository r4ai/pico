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

/**
 * Every scope the theme colours, and what it colours it.
 *
 * Flattened once rather than walked per candidate: a theme is around sixty
 * rules and each rule names up to a dozen scopes, and the alternative was
 * re-splitting all of it for each of the nine scopes below. First mention of a
 * scope wins, which is the rule a `find` over the list in order would have
 * followed anyway.
 */
function foregroundsByScope(theme: ThemeRegistrationResolved): Map<string, string> {
  const byScope = new Map<string, string>();

  // `settings` rather than `tokenColors`: Shiki normalizes one into the other
  // as it loads a theme, and a resolved theme only ever has the former.
  for (const rule of (theme.settings as ThemeRule[] | undefined) ?? []) {
    const foreground = rule.settings?.foreground;
    if (!foreground) continue;

    const scope = rule.scope ?? [];
    for (const name of Array.isArray(scope) ? scope : scope.split(",")) {
      const trimmed = name.trim();
      if (trimmed && !byScope.has(trimmed)) byScope.set(trimmed, foreground);
    }
  }

  return byScope;
}

/**
 * Reads a theme's three signature colors out of its own token rules.
 *
 * Not shipped: {@link THEMES} carries the answers as literals so the sidebar
 * can draw a theme without downloading it, and this is what a test holds those
 * literals to.
 */
export function themeAccentsOf(theme: ThemeRegistrationResolved): ThemeAccents {
  const foregrounds = foregroundsByScope(theme);

  const pick = (candidates: readonly string[]): string => {
    for (const scope of candidates) {
      const exact = foregrounds.get(scope);
      if (exact) return exact;
    }
    for (const scope of candidates) {
      for (const [name, foreground] of foregrounds) {
        if (name.startsWith(`${scope}.`)) return foreground;
      }
    }
    return theme.fg;
  };

  return { keyword: pick(SCOPES.keyword), fn: pick(SCOPES.fn), string: pick(SCOPES.string) };
}
