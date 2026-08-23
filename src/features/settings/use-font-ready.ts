import { familyNameOf, type Font, type FontFace } from "@/features/settings/fonts";
import { useEffect, useRef, useState } from "react";

/**
 * How long the preview waits for its font before painting in a stand-in.
 *
 * Short enough to read as the page still arriving rather than as a page that
 * has stopped, and long enough to cover a font that is already in the cache or
 * on its way from a preload — which is nearly every load.
 */
export const FONT_HOLD_MS = 150;

export type FontPhase =
  /** Nothing painted yet: the font may still arrive in time to be the first thing seen. */
  | "held"
  /** It did not, so the code is on screen in whatever monospace the system has. */
  | "fallback"
  /** On screen in the font it is supposed to be in. */
  | "ready";

/** The face the layout is made of, as `document.fonts` wants it spelled. */
function layoutFaceQuery(font: Font): string {
  const family = familyNameOf(font);
  // A theme emboldens and italicises a few tokens, but only once the
  // highlighter has loaded, which is later than anything this hook is timing.
  const regular = font.faces.find((face) => face.weight === 400 && face.style === "normal");
  return regular ? `${regular.style} ${regular.weight} 1em "${family}"` : `1em "${family}"`;
}

/**
 * Whether the font is here already, answered without waiting a render.
 *
 * Asked while the first render is being built, not from an effect. The frame is
 * held at `opacity: 0` until this says otherwise, and an effect runs after the
 * browser has had its chance to paint — so a font that was already in the cache
 * still got a frame painted at nothing and a 260ms fade up from it, and the
 * first contentful paint is not counted until a fade like that has finished.
 * A browser with no way of being asked paints at once, which is what it did
 * before any of this existed.
 */
function alreadyHere(font: Font): boolean {
  const fonts = document.fonts as FontFaceSet | undefined;
  return fonts ? fonts.check(layoutFaceQuery(font)) : true;
}

/**
 * Whether the code can be painted in the font it is meant to be painted in.
 *
 * A webfont that lands after the first paint reflows every line under the
 * reader: the frame is measured from the glyphs, so the box, the code and the
 * shadow all move at once. `font-display` alone cannot fix that — it only
 * chooses which of the two flashes to have.
 *
 * So the frame is held back for a moment instead. Almost always the font wins
 * that race and the first thing on screen is already right. When it does not,
 * the frame comes up in the fallback rather than making anyone wait, and the
 * caller can ease the geometry across when `ready` finally arrives.
 *
 * Changing fonts later never returns to `held`: there is already a picture on
 * screen, and blanking it would be a worse answer than a moment of the old
 * metrics.
 */
export function useFontReady(font: Font, holdMs: number = FONT_HOLD_MS): FontPhase {
  const shown = useRef(false);
  const [phase, setPhase] = useState<FontPhase>(() => (alreadyHere(font) ? "ready" : "held"));

  useEffect(() => {
    const family = familyNameOf(font);
    const shorthand = (face: FontFace) => `${face.style} ${face.weight} 1em "${family}"`;
    const regular = font.faces.find((face) => face.weight === 400 && face.style === "normal");
    const query = layoutFaceQuery(font);
    const fonts = document.fonts as FontFaceSet | undefined;

    let cancelled = false;
    const reveal = (next: Exclude<FontPhase, "held">) => {
      if (cancelled) return;
      shown.current = true;
      setPhase(next);
    };

    // A browser with no way of being asked paints at once, which is what it
    // did before this hook existed.
    if (!fonts) {
      reveal("ready");
      return;
    }

    // The rest of the family is fetched alongside but holds nothing up. Left
    // to arrive on demand they land after the highlighter does, and the lines
    // a theme italicises reflow a second time.
    for (const face of font.faces) {
      if (face !== regular) void fonts.load(shorthand(face)).then(undefined, () => {});
    }

    if (fonts.check(query)) {
      reveal("ready");
      return;
    }

    setPhase(shown.current ? "fallback" : "held");
    const deadline = setTimeout(() => reveal("fallback"), holdMs);
    // A face that fails to load is not worth holding the picture for; the
    // fallback is what the reader would end up with either way.
    void fonts.load(query).then(
      () => reveal("ready"),
      () => reveal("fallback"),
    );

    return () => {
      cancelled = true;
      clearTimeout(deadline);
    };
  }, [font, holdMs]);

  return phase;
}
