import geistMono400Italic from "@fontsource/geist-mono/files/geist-mono-latin-400-italic.woff2?url";
import geistMono400 from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?url";
import geistMono700 from "@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff2?url";
import jetBrainsMono400Italic from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2?url";
import jetBrainsMono400 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url";
import jetBrainsMono700 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url";

export const FONT_IDS = ["geist-mono", "jetbrains-mono", "udev-gothic"] as const;

export type FontId = (typeof FONT_IDS)[number];

export type FontFace = {
  readonly url: string;
  readonly weight: 400 | 700;
  readonly style: "normal" | "italic";
};

export type Font = {
  readonly id: FontId;
  readonly label: string;
  /** A word about what sets this font apart, shown beside its name. */
  readonly note?: string;
  /** The `font-family` value, always ending in a generic fallback. */
  readonly stack: string;
  readonly faces: readonly FontFace[];
};

export const FONTS: Record<FontId, Font> = {
  "geist-mono": {
    id: "geist-mono",
    label: "Geist Mono",
    stack: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    faces: [
      { url: geistMono400, weight: 400, style: "normal" },
      { url: geistMono400Italic, weight: 400, style: "italic" },
      { url: geistMono700, weight: 700, style: "normal" },
    ],
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    faces: [
      { url: jetBrainsMono400, weight: 400, style: "normal" },
      { url: jetBrainsMono400Italic, weight: 400, style: "italic" },
      { url: jetBrainsMono700, weight: 700, style: "normal" },
    ],
  },
  "udev-gothic": {
    id: "udev-gothic",
    label: "UDEV Gothic",
    note: "Japanese",
    stack: '"UDEV Gothic", ui-monospace, SFMono-Regular, Menlo, monospace',
    // Regular only. Every export inlines the whole face, and doubling that for
    // the few tokens a theme emboldens is not worth it — the browser
    // synthesizes bold instead. See scripts/build-udev-subset.sh.
    faces: [
      {
        url: `${import.meta.env.BASE_URL}fonts/udev-gothic-subset.woff2`,
        weight: 400,
        style: "normal",
      },
    ],
  },
};

export const DEFAULT_FONT: FontId = "geist-mono";

export function isFontId(value: string): value is FontId {
  return Object.hasOwn(FONTS, value);
}

/** The family name inside a font's stack, as it appears in its `@font-face` rules. */
export function familyNameOf(font: Font): string {
  const first = font.stack.split(",")[0] ?? "";
  return first.trim().replaceAll('"', "");
}

/**
 * `@font-face` rules for every font Pico offers.
 *
 * Declaring them all up front costs nothing: a browser only downloads a face
 * once something on the page actually renders with it, so switching fonts in
 * the sidebar is what triggers the fetch.
 */
export function fontFaceCss(): string {
  return Object.values(FONTS)
    .flatMap((font) =>
      font.faces.map(
        (face) =>
          `@font-face{font-family:"${familyNameOf(font)}";font-style:${face.style};` +
          `font-weight:${face.weight};font-display:swap;src:url("${face.url}") format("woff2")}`,
      ),
    )
    .join("\n");
}
