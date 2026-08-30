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
import { useCallback } from "react";

/**
 * Every setting is a search param, so a link reproduces the picture exactly.
 *
 * nuqs drops params that still hold their default, which is what keeps the URL
 * short for the common case of "I changed nothing".
 */
const languageParser = parseAsStringLiteral(LANGUAGE_IDS);

const settingsParsers = {
  lang: languageParser.withDefault(DEFAULT_SETTINGS.lang),
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
const PENDING_CODE_KEY = "pico:pending-code";

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

function flushCodeToUrl(code: string): void {
  const url = new URL(window.location.href);
  if (code === "") url.searchParams.delete(CODE_PARAM);
  else url.searchParams.set(CODE_PARAM, codeParser.serialize(code));
  window.history.replaceState(window.history.state, "", url);
}

type PendingCode = readonly [from: string | null, code: string];

function readPendingCode(): PendingCode | undefined {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CODE_KEY);
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length !== 2) return undefined;
    const [from, code] = value;
    if ((from !== null && typeof from !== "string") || typeof code !== "string") return undefined;
    return [from, code];
  } catch {
    return undefined;
  }
}

function writePendingCode(code: string): void {
  const from = new URLSearchParams(window.location.search).get(CODE_PARAM);
  try {
    window.sessionStorage.setItem(PENDING_CODE_KEY, JSON.stringify([from, code]));
  } catch {
    // Losing the reload checkpoint must not stop editing in a restricted browser.
  }
}

function removePendingCode(): void {
  try {
    window.sessionStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    // A restricted browser may refuse storage access altogether.
  }
}

function clearPendingCode(code: string): void {
  if (readPendingCode()?.[1] === code) removePendingCode();
}

/** Restores an edit whose throttled URL write was interrupted by a reload. */
export function recoverPendingCode(): void {
  const pending = readPendingCode();
  if (pending) {
    const [from, code] = pending;
    const current = new URLSearchParams(window.location.search).get(CODE_PARAM);
    if (current === from) flushCodeToUrl(code);
  }
  // A checkpoint is single-use. A different URL means navigation won the race;
  // an invalid value has nothing safe to recover and should not linger either.
  removePendingCode();
}

/** The settings, read from and written to the URL. */
export function useSettings() {
  return useQueryStates(settingsParsers, { history: "replace" });
}

/**
 * The code, compressed into the URL.
 *
 * Throttled because otherwise every keystroke would be a history write. Until
 * that write lands, a tab-scoped checkpoint lets startup recover a reload.
 */
export function useCode() {
  const [code, setQueryCode] = useQueryState(
    CODE_PARAM,
    codeParser.withDefault("").withOptions({ history: "replace", throttleMs: 500 }),
  );

  const setCode = useCallback(
    (nextCode: string) => {
      writePendingCode(nextCode);
      const pending = setQueryCode(nextCode);
      void pending.then(
        () => clearPendingCode(nextCode),
        () => {},
      );
      return pending;
    },
    [setQueryCode],
  );

  return [code, setCode] as const;
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

// withDefault matters here: without it an empty document still writes a bare
// `?c=` onto every link.
const serializeShareUrl = createSerializer({
  ...settingsParsers,
  [CODE_PARAM]: codeParser.withDefault(""),
});

/** Whether the reader arrived with a language already chosen for them. */
export function hasExplicitLanguage(search: string): boolean {
  const language = new URLSearchParams(search).get("lang");
  return language !== null && languageParser.parse(language) !== null;
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
