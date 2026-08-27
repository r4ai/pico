import firaCode400 from "@fontsource/fira-code/files/fira-code-latin-400-normal.woff2?url";
import firaCode700 from "@fontsource/fira-code/files/fira-code-latin-700-normal.woff2?url";
import geistMono400Italic from "@fontsource/geist-mono/files/geist-mono-latin-400-italic.woff2?url";
import geistMono400 from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?url";
import geistMono700 from "@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff2?url";
import ibmPlexMono400Italic from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-italic.woff2?url";
import ibmPlexMono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";
import ibmPlexMono700 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2?url";
import inconsolata400 from "@fontsource/inconsolata/files/inconsolata-latin-400-normal.woff2?url";
import inconsolata700 from "@fontsource/inconsolata/files/inconsolata-latin-700-normal.woff2?url";
import jetBrainsMono400Italic from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2?url";
import jetBrainsMono400 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url";
import jetBrainsMono700 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url";
import sourceCodePro400Italic from "@fontsource/source-code-pro/files/source-code-pro-latin-400-italic.woff2?url";
import sourceCodePro400 from "@fontsource/source-code-pro/files/source-code-pro-latin-400-normal.woff2?url";
import sourceCodePro700 from "@fontsource/source-code-pro/files/source-code-pro-latin-700-normal.woff2?url";
import spaceMono400Italic from "@fontsource/space-mono/files/space-mono-latin-400-italic.woff2?url";
import spaceMono400 from "@fontsource/space-mono/files/space-mono-latin-400-normal.woff2?url";
import spaceMono700 from "@fontsource/space-mono/files/space-mono-latin-700-normal.woff2?url";

export const FONT_IDS = [
  "geist-mono",
  "jetbrains-mono",
  "fira-code",
  "ibm-plex-mono",
  "source-code-pro",
  "space-mono",
  "inconsolata",
  "udev-gothic",
] as const;

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
  "fira-code": {
    id: "fira-code",
    label: "Fira Code",
    stack: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
    // Fira Code has no italic face; the browser synthesizes the few italic
    // tokens rather than downloading a substitute family.
    faces: [
      { url: firaCode400, weight: 400, style: "normal" },
      { url: firaCode700, weight: 700, style: "normal" },
    ],
  },
  "ibm-plex-mono": {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    stack: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    faces: [
      { url: ibmPlexMono400, weight: 400, style: "normal" },
      { url: ibmPlexMono400Italic, weight: 400, style: "italic" },
      { url: ibmPlexMono700, weight: 700, style: "normal" },
    ],
  },
  "source-code-pro": {
    id: "source-code-pro",
    label: "Source Code Pro",
    stack: '"Source Code Pro", ui-monospace, SFMono-Regular, Menlo, monospace',
    faces: [
      { url: sourceCodePro400, weight: 400, style: "normal" },
      { url: sourceCodePro400Italic, weight: 400, style: "italic" },
      { url: sourceCodePro700, weight: 700, style: "normal" },
    ],
  },
  "space-mono": {
    id: "space-mono",
    label: "Space Mono",
    stack: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    faces: [
      { url: spaceMono400, weight: 400, style: "normal" },
      { url: spaceMono400Italic, weight: 400, style: "italic" },
      { url: spaceMono700, weight: 700, style: "normal" },
    ],
  },
  inconsolata: {
    id: "inconsolata",
    label: "Inconsolata",
    stack: '"Inconsolata", ui-monospace, SFMono-Regular, Menlo, monospace',
    // Inconsolata's static package has no italic face.
    faces: [
      { url: inconsolata400, weight: 400, style: "normal" },
      { url: inconsolata700, weight: 700, style: "normal" },
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

/** The family name inside a font's stack, as it appears in its `@font-face` rules. */
export function familyNameOf(font: Font): string {
  const first = font.stack.split(",", 1).join("");
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
