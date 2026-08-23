import { FONT_IDS, FONTS } from "@/features/settings/fonts";
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
});
