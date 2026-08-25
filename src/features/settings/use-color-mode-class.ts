import type { ColorMode } from "@/features/settings/theme";
import { useLayoutEffect } from "react";

/**
 * Puts light or dark on the document, where every colour on the page reads it.
 *
 * A layout effect, because the browser photographs the page the moment
 * `crossFade`'s `flushSync` returns and the class this sets is what nearly
 * every colour on it comes from. React commits layout effects inside a
 * `flushSync` and merely tends to reach passive ones in time, which is a
 * difference between a reveal that grows the new mode and one that grows a
 * picture of the old room and then changes underneath it. See `crossFade`.
 */
export function useColorModeClass(mode: ColorMode) {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);
}
