import { DEFAULT_FONT, familyNameOf, FONT_IDS, fontFaceCss, FONTS } from "@/core/settings/fonts";
import { readFileSync } from "node:fs";
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
      "hackgen",
      "plemoljp",
      "firge",
    ]);
  });

  it.each(FONT_IDS)("gives %s a regular face for the preview", (id) => {
    expect(FONTS[id].faces).toContainEqual(
      expect.objectContaining({ weight: 400, style: "normal" }),
    );
  });

  it.each([
    ["hackgen", "HackGen"],
    ["plemoljp", "PlemolJP"],
    ["firge", "Firge"],
  ] as const)("identifies %s by its original family name", (id, family) => {
    expect(FONTS[id].label).toBe(family);
    expect(familyNameOf(FONTS[id])).toBe(family);
    expect(FONTS[id].note).toBe("Japanese");
  });

  it.each([
    ["hackgen", ["LICENSE_GenJyuuGothic", "LICENSE_Hack", "LICENSE_NerdFonts"]],
    [
      "plemoljp",
      [
        "LICENSE_IBM-Plex",
        "LICENSE_NerdFonts",
        "IBM-Plex-Mono/license.txt",
        "IBM-Plex-Sans-JP/unhinted/license.txt",
        "hack/LICENSE",
        "nerd-fonts/LICENSE",
      ],
    ],
    ["firge", ["LICENSE_FiraMono", "LICENSE_GenJyuuGothic_GenShinGothic"]],
  ] as const)("ships %s source-font notices with the public assets", (id, notices) => {
    for (const notice of notices) {
      expect(readFileSync(`public/fonts/licenses/${id}/source/${notice}`, "utf8")).toMatch(
        /copyright/i,
      );
    }
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
