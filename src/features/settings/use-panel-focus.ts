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
 * Only ever when the panel opens or closes, though — never for the state it
 * mounts in. A panel that is open because that is how it was left last time is
 * a layout, not an action somebody just took, and taking the keyboard into it
 * on arrival puts a close button between the reader and the page they came
 * for. See {@link useSidebarOpen}.
 *
 * @returns the ref to attach to the panel.
 */
export function usePanelFocus(open: boolean): RefObject<HTMLDivElement | null> {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // What the panel was doing last time this ran, seeded with the state it
  // mounted in, so the first run has nothing to react to. Comparing values
  // rather than counting runs, because StrictMode runs the first one twice.
  const was = useRef(open);

  useEffect(() => {
    if (open === was.current) return;
    was.current = open;

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
