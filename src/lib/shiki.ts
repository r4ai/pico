import { cudaGrammars } from "@/features/editor/cuda-grammar";
import type { LanguageId } from "@/features/editor/language";
import { LANGUAGES } from "@/features/editor/language";
import { createHighlighterCore, type HighlighterCore, type LanguageRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/**
 * Static so the bundler can split each grammar into its own chunk. A template
 * literal import would defeat that and pull all 300+ Shiki grammars in.
 */
const LANG_LOADERS: Record<LanguageId, () => Promise<LanguageRegistration[]>> = {
  tsx: async () => (await import("@shikijs/langs/tsx")).default,
  ts: async () => (await import("@shikijs/langs/typescript")).default,
  jsx: async () => (await import("@shikijs/langs/jsx")).default,
  js: async () => (await import("@shikijs/langs/javascript")).default,
  c: async () => (await import("@shikijs/langs/c")).default,
  cpp: async () => (await import("@shikijs/langs/cpp")).default,
  cuda: async () => [...(await import("@shikijs/langs/cpp")).default, ...cudaGrammars],
  rust: async () => (await import("@shikijs/langs/rust")).default,
  llvm: async () => (await import("@shikijs/langs/llvm")).default,
};

const THEME_LOADERS = {
  "vitesse-light": () => import("@shikijs/themes/vitesse-light"),
  "vitesse-dark": () => import("@shikijs/themes/vitesse-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "catppuccin-latte": () => import("@shikijs/themes/catppuccin-latte"),
  "catppuccin-mocha": () => import("@shikijs/themes/catppuccin-mocha"),
  "one-light": () => import("@shikijs/themes/one-light"),
  "one-dark-pro": () => import("@shikijs/themes/one-dark-pro"),
  "rose-pine-dawn": () => import("@shikijs/themes/rose-pine-dawn"),
  "rose-pine": () => import("@shikijs/themes/rose-pine"),
} as const;

export type ShikiThemeName = keyof typeof THEME_LOADERS;

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    langs: [],
    themes: [],
    // The JavaScript RegExp engine covers every grammar Pico ships (verified by
    // the registry test) and saves the ~500 kB Oniguruma WebAssembly payload.
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
}

const pendingLangs = new Map<LanguageId, Promise<void>>();
const pendingThemes = new Map<ShikiThemeName, Promise<void>>();

/**
 * Resolves once the given language and theme are registered, loading each one
 * at most once for the lifetime of the page.
 */
export async function ensureHighlighter(
  lang: LanguageId,
  theme: ShikiThemeName,
): Promise<HighlighterCore> {
  const core = await getHighlighter();

  let langLoad = pendingLangs.get(lang);
  if (!langLoad) {
    langLoad = LANG_LOADERS[lang]().then((registrations) => core.loadLanguage(registrations));
    pendingLangs.set(lang, langLoad);
  }

  let themeLoad = pendingThemes.get(theme);
  if (!themeLoad) {
    themeLoad = THEME_LOADERS[theme]().then((module) => core.loadTheme(module.default));
    pendingThemes.set(theme, themeLoad);
  }

  await Promise.all([langLoad, themeLoad]);
  return core;
}

/** The grammar name to pass to Shiki for a Pico language id. */
export function shikiLangOf(lang: LanguageId): string {
  return LANGUAGES[lang].shikiLang;
}
