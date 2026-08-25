import { useBriefFlag } from "@/components/use-brief-flag";
import {
  PREVIEW_GEOMETRY_DURATION_MS,
  PREVIEW_GEOMETRY_GRACE_MS,
} from "@/features/settings/appearance";
import type { Settings } from "@/features/settings/settings";
import { shikiThemeOf } from "@/features/settings/theme";
import type { FontPhase } from "@/features/settings/use-font-ready";
import { crossFade, type RevealOrigin } from "@/lib/cross-fade";
import { isThemeLoaded } from "@/lib/shiki";
import { useCallback, useEffect, useRef } from "react";

/** Settings that change how much room the picture takes. */
const GEOMETRY_SETTINGS = new Set<keyof Settings>(["padding", "font", "fontSize", "lineNumbers"]);

/** Settings that change nothing but color, and so can simply be dissolved into. */
const COLOR_SETTINGS = new Set<keyof Settings>(["theme", "mode"]);

/** Writing a patch to wherever the settings actually live, which is the URL. */
export type ApplySettings = (patch: Partial<Settings>) => Promise<unknown>;

export type UseSettingsTransitionOptions = {
  settings: Settings;
  apply: ApplySettings;
  fontPhase: FontPhase;
};

export type SettingsTransition = {
  /** True while the frame's geometry is easing between two settings. */
  readonly animateGeometry: boolean;
  /** Makes a settings change, and decides how it reaches the screen. */
  readonly changeSettings: (patch: Partial<Settings>, origin?: RevealOrigin) => void;
  /**
   * Ends the easing early.
   *
   * For the code changing: typing is not a settings action, and a frame that
   * eases to fit every keystroke lags behind the caret that caused it.
   */
  readonly stopGeometryAnimation: () => void;
};

/**
 * How a settings change reaches the screen.
 *
 * Three kinds of change, and the difference between them is the whole of this
 * hook. One that moves something eases the picture to its new size. One that is
 * nothing but colour dissolves the page into its new colours. One that does
 * both would be two answers to the same action, so it eases and does not
 * dissolve.
 *
 * Kept together because the two are exclusive and the rule that makes them so
 * is the thing worth reading in one place. See {@link crossFade}.
 */
export function useSettingsTransition({
  settings,
  apply,
  fontPhase,
}: UseSettingsTransitionOptions): SettingsTransition {
  const {
    on: animateGeometry,
    raise: animatePreviewGeometry,
    lower: stopGeometryAnimation,
  } = useBriefFlag(PREVIEW_GEOMETRY_DURATION_MS + PREVIEW_GEOMETRY_GRACE_MS);

  const shownPhase = useRef(fontPhase);
  useEffect(() => {
    // The frame was on screen in a stand-in font and is about to be remeasured
    // in the real one. Everything about its size is about to change, so it
    // changes the way a settings action does rather than in one frame.
    if (shownPhase.current === "fallback" && fontPhase === "ready") animatePreviewGeometry();
    shownPhase.current = fontPhase;
  }, [animatePreviewGeometry, fontPhase]);

  const changeSettings = useCallback(
    (patch: Partial<Settings>, origin?: RevealOrigin) => {
      const keys = Object.keys(patch) as (keyof Settings)[];
      if (keys.some((key) => GEOMETRY_SETTINGS.has(key))) animatePreviewGeometry();

      // Only when the whole patch is color, and only when those colors can be
      // on screen in the same frame as the rest of the change.
      //
      // A patch that also moves something has geometry of its own to ease, and
      // a dissolve laid over that would be two answers to the same action. And
      // the frame's colors come from the theme the highlighter has actually
      // loaded, not the one that was asked for — so on the first switch to a
      // theme the snapshot would be taken with the old picture still in it, and
      // the new one would arrive partway through the dissolve or, on a slow
      // link, just as it ended: a snap at the end of a fade, which is worse
      // than either alone. Once the theme is warm — every switch after the
      // first, which is when anyone is going back and forth — everything moves
      // together — and the counterpart of a pair is warmed the moment the
      // settings are opened, so "the first switch" is usually not one anybody
      // reaches. See `warmTheme`.
      const next = { ...settings, ...patch };
      if (
        keys.every((key) => COLOR_SETTINGS.has(key)) &&
        isThemeLoaded(shikiThemeOf(next.theme, next.mode))
      ) {
        crossFade(() => void apply(patch), origin);
        return;
      }
      void apply(patch);
    },
    [animatePreviewGeometry, apply, settings],
  );

  return { animateGeometry, changeSettings, stopGeometryAnimation };
}
