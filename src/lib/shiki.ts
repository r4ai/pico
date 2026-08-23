import type { LanguageId } from "@/features/editor/language";
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

let registry: Promise<typeof import("@/features/editor/language-registry")> | undefined;

/**
 * The language registry, downloaded on first use.
 *
 * It is only ever consulted from here, and by then the highlighter itself is
 * already being fetched — so the request goes out alongside Shiki's core and
 * regex engine, which are several times its size and are what the first
 * colored frame actually waits on. Off the entry chunk it is 8 kB of gzip that
 * every load was paying for before it had anything to paint.
 */
function getRegistry() {
  registry ??= import("@/features/editor/language-registry");
  return registry;
}

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
const loadedThemes = new Set<ShikiThemeName>();

/**
 * Whether a theme is already registered, answered without waiting.
 *
 * For deciding, at the moment a setting is changed, whether the colors it asks
 * for can be on screen in the same frame as the rest of the change — a
 * question that is only worth asking synchronously. See `crossFade`.
 */
export function isThemeLoaded(theme: ShikiThemeName): boolean {
  return loadedThemes.has(theme);
}

export type LoadedHighlighter = {
  readonly highlighter: HighlighterCore;
  /** Shiki's own name for the requested language, which is not always its Pico id. */
  readonly shikiLang: string;
};

/**
 * Resolves once the given language and theme are registered, loading each one
 * at most once for the lifetime of the page.
 *
 * Nothing here is awaited before the next request goes out: the registry, the
 * theme and the engine are all asked for at once, and the grammar the moment
 * the registry names it. None of them depends on the others being present, and
 * waiting in turn would cost round trips on the one path that decides when the
 * code becomes colored.
 */
export async function ensureHighlighter(
  lang: LanguageId,
  theme: ShikiThemeName,
): Promise<LoadedHighlighter> {
  const core = getHighlighter();
  const definition = getRegistry().then((module) => module.LANGUAGES[lang]);

  let langLoad = pendingLangs.get(lang);
  if (!langLoad) {
    const registrations = definition.then((language) => language.load());
    langLoad = Promise.all([core, registrations]).then(([loaded, grammar]) =>
      loaded.loadLanguage(grammar),
    );
    pendingLangs.set(lang, langLoad);
  }

  let themeLoad = pendingThemes.get(theme);
  if (!themeLoad) {
    const registration = THEME_LOADERS[theme]();
    themeLoad = Promise.all([core, registration]).then(async ([loaded, module]) => {
      await loaded.loadTheme(module.default);
      loadedThemes.add(theme);
    });
    pendingThemes.set(theme, themeLoad);
  }

  const [highlighter, language] = await Promise.all([core, definition, langLoad, themeLoad]);
  return { highlighter, shikiLang: language.shikiLang };
}
