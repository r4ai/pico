import {
  DEFAULT_FONT,
  familyNameOf,
  FONT_IDS,
  fontFaceCss,
  FONTS,
} from "@/features/settings/fonts";
import { describe, expect, it } from "vite-plus/test";

describe("font registry", () => {
  it("offers a varied set of coding fonts", () => {
    expect(FONT_IDS).toEqual([
      "geist-mono",
      "jetbrains-mono",
      "fira-code",
      "ibm-plex-mono",
      "source-code-pro",
      "space-mono",
      "inconsolata",
      "udev-gothic",
    ]);
  });

  it.each(FONT_IDS)("gives %s a regular face for the preview", (id) => {
    expect(FONTS[id].faces).toContainEqual(
      expect.objectContaining({ weight: 400, style: "normal" }),
    );
  });

  it("generates one font-face rule for every registered face", () => {
    const css = fontFaceCss();
    const faces = Object.values(FONTS).flatMap((font) => font.faces);

    expect(familyNameOf(FONTS[DEFAULT_FONT])).toBe("Geist Mono");
    expect(css.split("\n")).toHaveLength(faces.length);
    for (const font of Object.values(FONTS)) {
      for (const face of font.faces) {
        expect(css).toContain(
          `font-family:"${familyNameOf(font)}";font-style:${face.style};font-weight:${face.weight}`,
        );
        expect(css).toContain(`src:url("${face.url}") format("woff2")`);
      }
    }
  });
});
