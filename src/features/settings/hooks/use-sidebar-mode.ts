import { useSyncExternalStore } from "react";

/**
 * The width at which the settings stop covering the picture.
 *
 * The same condition as the `@media` rules in `global.css` that move the panel
 * between its two arrangements, written once here because the difference is
 * not only a matter of looks — see {@link SidebarMode}. A browser test holds
 * the two in step.
 */
export const SIDEBAR_INSET_QUERY = "(width >= 56rem)";

export type SidebarMode =
  /** Beside the picture, in a column the canvas gives up for it. */
  | "inset"
  /** Over the picture, behind a scrim. */
  | "drawer";

let media: MediaQueryList | undefined;

function mediaQuery(): MediaQueryList {
  media ??= window.matchMedia(SIDEBAR_INSET_QUERY);
  return media;
}

function subscribe(onChange: () => void) {
  const query = mediaQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Which of its two arrangements the settings panel is currently in.
 *
 * The panel is two different things at the two widths, and not only to look
 * at. Inset it is one region of the page beside another, and the picture next
 * to it stays editable. As a drawer it lies on top of the picture behind a
 * scrim, which makes it modal — so it has to say so, and the page underneath
 * has to be out of the keyboard's reach while it is open, or Tab walks off
 * into a canvas nobody can see.
 */
export function useSidebarMode(): SidebarMode {
  return useSyncExternalStore(subscribe, () => (mediaQuery().matches ? "inset" : "drawer"));
}
