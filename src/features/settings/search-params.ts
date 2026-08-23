import { LANGUAGE_IDS } from "@/features/editor/language";
import { FONT_SIZE_IDS, PADDING_IDS, RADIUS_IDS, SHADOW_IDS } from "@/features/settings/appearance";
import { FONT_IDS } from "@/features/settings/fonts";
import { DEFAULT_SETTINGS, type Settings } from "@/features/settings/settings";
import { COLOR_MODES, THEME_IDS } from "@/features/settings/theme";
import { decodeCode, encodeCode, SAFE_URL_LENGTH } from "@/lib/url-codec";
import {
  createParser,
  createSerializer,
  parseAsBoolean,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs";

/**
 * Every setting is a search param, so a link reproduces the picture exactly.
 *
 * nuqs drops params that still hold their default, which is what keeps the URL
 * short for the common case of "I changed nothing".
 */
const settingsParsers = {
  lang: parseAsStringLiteral(LANGUAGE_IDS).withDefault(DEFAULT_SETTINGS.lang),
  theme: parseAsStringLiteral(THEME_IDS).withDefault(DEFAULT_SETTINGS.theme),
  mode: parseAsStringLiteral(COLOR_MODES).withDefault(DEFAULT_SETTINGS.mode),
  padding: parseAsStringLiteral(PADDING_IDS).withDefault(DEFAULT_SETTINGS.padding),
  radius: parseAsStringLiteral(RADIUS_IDS).withDefault(DEFAULT_SETTINGS.radius),
  shadow: parseAsStringLiteral(SHADOW_IDS).withDefault(DEFAULT_SETTINGS.shadow),
  fontSize: parseAsStringLiteral(FONT_SIZE_IDS).withDefault(DEFAULT_SETTINGS.fontSize),
  font: parseAsStringLiteral(FONT_IDS).withDefault(DEFAULT_SETTINGS.font),
  lineNumbers: parseAsBoolean.withDefault(DEFAULT_SETTINGS.lineNumbers),
};

export const CODE_PARAM = "c";

const codeParser = createParser({
  parse: (value) => {
    try {
      return decodeCode(value);
    } catch {
      // nuqs falls back to the default; App reports the broken link separately.
      return null;
    }
  },
  serialize: encodeCode,
});

/** The settings, read from and written to the URL. */
export function useSettings() {
  return useQueryStates(settingsParsers, { history: "replace" });
}

/**
 * The code, compressed into the URL.
 *
 * Throttled because otherwise every keystroke would be a history write.
 */
export function useCode() {
  return useQueryState(
    CODE_PARAM,
    codeParser.withDefault("").withOptions({ history: "replace", throttleMs: 500 }),
  );
}

/**
 * Whether the `c` param is present but unreadable — a truncated or mangled link.
 *
 * Reported rather than repaired: guessing at what the code was meant to be
 * would be worse than saying the link is broken.
 */
export function hasBrokenCodeParam(search: string): boolean {
  const raw = new URLSearchParams(search).get(CODE_PARAM);
  if (raw === null || raw === "") return false;
  try {
    decodeCode(raw);
    return false;
  } catch {
    return true;
  }
}

const serializeShareUrl = createSerializer({ ...settingsParsers, [CODE_PARAM]: codeParser });

/** Whether the reader arrived with a language already chosen for them. */
export function hasExplicitLanguage(search: string): boolean {
  return new URLSearchParams(search).has("lang");
}

export type ShareUrl = {
  readonly url: string;
  /** Long links get truncated by some clients, so the UI warns about them. */
  readonly tooLong: boolean;
};

/**
 * The link to share, built from state rather than read from `location`.
 *
 * Reading the address bar would hand back a stale URL, because writes to the
 * code param are throttled while you type.
 */
export function buildShareUrl(settings: Settings, code: string, base: string): ShareUrl {
  const url = serializeShareUrl(base, { ...settings, [CODE_PARAM]: code });
  return { url, tooLong: url.length > SAFE_URL_LENGTH };
}
