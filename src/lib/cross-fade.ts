import { flushSync } from "react-dom";

/** Where a change came from, in client coordinates. */
export type RevealOrigin = {
  readonly x: number;
  readonly y: number;
};

/** The distance from a point to the furthest corner of the window. */
function radiusFrom({ x, y }: RevealOrigin): number {
  return Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
}

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
 * See `isThemeLoaded`, and `warmTheme` for how the pair of themes one press
 * apart from each other stop being that case.
 *
 * Nothing here is load-bearing. Where view transitions are unsupported, or
 * where someone has asked for less motion, the change lands the way it always
 * did, in one frame. Nor does it delay anything: the DOM is at its final state
 * before the dissolve starts, so a capture taken during one is the picture you
 * asked for, not a blend of two.
 *
 * @param origin where the change was asked for. Given one, the new page is cut
 * in over the old as a circle growing out of that point rather than dissolved
 * into — light and dark arriving from under the switch that asked for them,
 * which is a thing that happened rather than a thing that faded. Only for a
 * change somebody pointed at: everything else has nowhere to grow from, and a
 * circle out of the middle of the window is a transition with an opinion about
 * where you were looking.
 */
export function crossFade(change: () => void, origin?: RevealOrigin): void {
  if (
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    change();
    return;
  }

  const root = document.documentElement;
  if (origin) {
    root.style.setProperty("--pico-reveal-x", `${origin.x}px`);
    root.style.setProperty("--pico-reveal-y", `${origin.y}px`);
    root.style.setProperty("--pico-reveal-radius", `${radiusFrom(origin)}px`);
    root.dataset.picoReveal = "true";
  }

  const transition = document.startViewTransition(() => {
    flushSync(change);
  });

  // `finished` rejects when a second change skips this one, which is a thing
  // somebody pressing a switch twice is entitled to do; either way the marker
  // has to come off, or the next plain dissolve would be cut in from wherever
  // this one started.
  void transition.finished.catch(() => {}).finally(() => delete root.dataset.picoReveal);
}
