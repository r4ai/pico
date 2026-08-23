import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Takes the keyboard into a panel when it opens, and gives it back when the
 * panel closes.
 *
 * Without this the settings are a dead end. The button that opens them hides
 * itself and turns `inert` the moment they appear, and the panel is `inert`
 * again the moment they close — so both times focus is left on an element the
 * browser no longer considers focusable, and it falls back to the top of the
 * document. Tabbing after opening the settings would walk the page from the
 * beginning rather than through the settings themselves.
 *
 * @returns the ref to attach to the panel.
 */
export function usePanelFocus(open: boolean): RefObject<HTMLDivElement | null> {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      return;
    }
    // Only when the keyboard is still inside: someone who clicked back into the
    // editor and then dismissed the panel should be left where they were.
    if (panel.current?.contains(document.activeElement)) opener.current?.focus();
    opener.current = null;
  }, [open]);

  return panel;
}
