import { flushSync } from "react-dom";

/**
 * Makes a change that only repaints the page, and dissolves into it.
 *
 * For settings that change nothing but color — the theme and the appearance.
 * They repaint almost every pixel, and doing it in one frame was the only
 * abrupt thing left in an app that eases everything else.
 *
 * A view transition rather than a `transition` on each color, because a token's
 * color is an inline style on a span that CodeMirror throws away and rebuilds
 * every time the highlighter is reconfigured: there is no value to ease from,
 * so the code changes in one frame however the stylesheet is written. Easing
 * only the surfaces left dark text on a background still on its way to light;
 * easing the text too sent it through the very grey it was crossing. A snapshot
 * dissolving into the next one has neither problem, because nothing is being
 * interpolated — the page simply is what it was, and then what it is.
 *
 * `flushSync` because the browser captures the second snapshot the moment this
 * callback settles, and React would otherwise still be holding the change.
 *
 * Which is also why the caller has to know the colors are already here before
 * reaching for this. The frame takes its colors from the theme the highlighter
 * has loaded, not the one that was asked for, so a theme being fetched for the
 * first time arrives partway through the dissolve — or, on a slow link, just as
 * it ends, which is a snap at the end of a fade and worse than either alone.
 * See `isThemeLoaded`.
 *
 * Nothing here is load-bearing. Where view transitions are unsupported, or
 * where someone has asked for less motion, the change lands the way it always
 * did, in one frame. Nor does it delay anything: the DOM is at its final state
 * before the dissolve starts, so a capture taken during one is the picture you
 * asked for, not a blend of two.
 */
export function crossFade(change: () => void): void {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    change();
    return;
  }

  document.startViewTransition(() => {
    flushSync(change);
  });
}
