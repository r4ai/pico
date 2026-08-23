import type { LanguageId } from "@/features/editor/language";
import { LANGUAGES } from "@/features/editor/language";
import type { ShikiThemeName } from "@/features/settings/theme";
import type { HighlighterCore, ThemeRegistration } from "shiki/core";

/** Typed by the registry, so a theme without a loader is a compile error. */
const THEME_LOADERS: Record<ShikiThemeName, () => Promise<{ default: ThemeRegistration }>> = {
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
};

let highlighter: Promise<HighlighterCore> | undefined;

/**
 * The highlighter, downloaded on first use.
 *
 * Shiki and its regex engine are the largest thing Pico would otherwise ship
 * in the entry chunk, and nothing on the first screen needs them: the frame
 * paints itself from the theme registry and lays the document out uncolored
 * until the grammar arrives, at the size it will keep.
 */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return await createHighlighterCore({
      langs: [],
      themes: [],
      // The JavaScript RegExp engine covers every grammar Pico ships (verified
      // by the registry test) and saves the ~500 kB Oniguruma WebAssembly
      // payload.
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  })();
  return highlighter;
}

const pendingLangs = new Map<LanguageId, Promise<void>>();
const pendingThemes = new Map<ShikiThemeName, Promise<void>>();

/**
 * Resolves once the given language and theme are registered, loading each one
 * at most once for the lifetime of the page.
 *
 * The grammar and the theme are asked for before the highlighter is awaited.
 * None of the three depends on the others, and waiting for the engine to
 * arrive before even requesting a grammar would cost a round trip on the one
 * path that decides when the code becomes colored.
 */
export async function ensureHighlighter(
  lang: LanguageId,
  theme: ShikiThemeName,
): Promise<HighlighterCore> {
  const core = getHighlighter();

  let langLoad = pendingLangs.get(lang);
  if (!langLoad) {
    const registrations = LANGUAGES[lang].load();
    langLoad = Promise.all([core, registrations]).then(([loaded, grammar]) =>
      loaded.loadLanguage(grammar),
    );
    pendingLangs.set(lang, langLoad);
  }

  let themeLoad = pendingThemes.get(theme);
  if (!themeLoad) {
    const registration = THEME_LOADERS[theme]();
    themeLoad = Promise.all([core, registration]).then(([loaded, module]) =>
      loaded.loadTheme(module.default),
    );
    pendingThemes.set(theme, themeLoad);
  }

  await Promise.all([langLoad, themeLoad]);
  return await core;
}

/** The grammar name to pass to Shiki for a Pico language id. */
export function shikiLangOf(lang: LanguageId): string {
  return LANGUAGES[lang].shikiLang;
}
