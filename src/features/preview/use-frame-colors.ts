import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import { useShikiHighlight } from "@/features/editor/use-shiki-highlight";
import { frameColorsOf, type FrameColors } from "@/features/preview/frame-colors";
import type { Settings } from "@/features/settings/settings";
import { frameColorsOfTheme, shikiThemeOf } from "@/features/settings/theme";

export type FramePaint = {
  /** `null` until the first grammar and theme have loaded. */
  readonly highlight: ShikiHighlight | null;
  /** What the frame is painted with, which is never nothing. */
  readonly colors: FrameColors;
};

/**
 * The highlighter the frame draws with, and the colours it draws around it.
 *
 * One hook because the second is a consequence of the first: the frame has to
 * be painted from the moment it exists, and the highlighter is not here yet.
 */
export function useFrameColors(settings: Settings): FramePaint {
  const highlight = useShikiHighlight(settings.lang, shikiThemeOf(settings.theme, settings.mode));

  // highlight.theme, not the requested one: while a new theme loads the
  // highlighter still only knows the previous one, and asking it for a theme it
  // has not loaded throws. Until the very first one arrives the registry's own
  // copy of the colors stands in, so the frame is never unpainted.
  const colors = highlight
    ? frameColorsOf(highlight.highlighter.getTheme(highlight.theme))
    : frameColorsOfTheme(settings.theme, settings.mode);

  return { highlight, colors };
}
