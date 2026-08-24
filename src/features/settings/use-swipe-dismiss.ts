import { type RefObject, useEffect, useEffectEvent } from "react";

/** Below this a touch is a tap, not a drag. */
const AXIS_THRESHOLD_PX = 8;

/** How far it has to be dragged, as a share of its own width, to be let go of. */
const DISMISS_DISTANCE = 0.4;

/** A flick is a dismissal at any distance past a tap. Pixels per millisecond. */
const DISMISS_VELOCITY = 0.35;

/** How much of a drag the wrong way is given back, so the edge feels like an edge. */
const RUBBER_BAND = 0.15;

/** Where the panel rests when it is closed — the same distance the stylesheet uses. */
const CLOSED_OFFSET = "calc(-100% - 1.5rem)";

export type SwipeDismissOptions = {
  /** The panel that moves. */
  panel: RefObject<HTMLElement | null>;
  /** The scrim behind it, which fades with the drag. */
  scrim: RefObject<HTMLElement | null>;
  /** False wherever the panel is not a drawer, or is not open. */
  enabled: boolean;
  onDismiss: () => void;
};

/**
 * Lets a drawer be pushed away with a finger.
 *
 * A drawer that can only be dismissed by finding a 16-pixel cross in its
 * corner is a drawer on a desktop that happens to be narrow. The gesture that
 * opens it is a tap; the one that closes it should be the one the hand already
 * expects, and it should follow the finger rather than waiting for it to let
 * go — that is the whole of why it reads as a sheet and not as a dialog that
 * slides.
 *
 * Written by hand rather than reached for, because the panel is not a Radix
 * dialog and the alternative was a second overlay library underneath React
 * Aria, holding a second opinion about focus, `inert`, and what is modal. All
 * of that is already settled here; see {@link useSidebarMode} and
 * {@link usePanelFocus}. What was missing was one gesture.
 *
 * Three things make it feel like a sheet rather than like a slider:
 *
 * - The panel is written to directly, not through state. A React render per
 *   pointer move would re-render every control the panel holds, sixty times a
 *   second, to move one box — and the box is the only thing that moved.
 * - `touch-action: pan-y` in the stylesheet, not `preventDefault` here. The
 *   browser keeps the vertical scrolling the settings column needs and hands
 *   over the horizontal pans, which is the arrangement that lets a drag start
 *   inside a list without either gesture guessing.
 * - Letting go past four tenths of the panel's width dismisses it, and so does
 *   a flick at any distance past a tap. Distance alone means a quick flick
 *   springs back, which reads as the drawer having refused.
 *
 * Touch and pen only. A pointer with a cursor has the close button, the scrim
 * and Escape, and dragging a panel full of text and fields with a mouse fights
 * selection for a gesture nobody was going to use.
 */
export function useSwipeDismiss({ panel, scrim, enabled, onDismiss }: SwipeDismissOptions): void {
  // An Effect Event, so the listeners are bound once per open rather than
  // again on every render of the parent that hands `onDismiss` down.
  const dismiss = useEffectEvent(() => onDismiss());

  useEffect(() => {
    const element = panel.current;
    if (!element) return;

    /**
     * Puts back everything a drag writes.
     *
     * A dismissal ends with the panel written to where the closed state puts
     * it, and that offset has to go before anything can open again — including
     * when what opens is not a drawer. Widening the window past the breakpoint
     * after a swipe leaves the gesture unbound and the offset behind, and an
     * inset panel reading it comes up translated off the side of the window: a
     * settings column that cannot be reached and cannot be swiped back. So it
     * is cleared on the way out as well as on the way in, and the way out is
     * the case that matters.
     *
     * It costs nothing where it does nothing: by the time this runs the panel
     * is already closed, and the closed state does not read the offset at all.
     */
    const clearGesture = () => {
      element.style.removeProperty("--pico-drawer-offset");
      scrim.current?.style.removeProperty("--pico-drawer-progress");
    };

    clearGesture();
    if (!enabled) return;

    let pointer: number | undefined;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let lastX = 0;
    let lastAt = 0;
    let velocity = 0;

    const draw = (offset: number) => {
      element.style.setProperty("--pico-drawer-offset", `${offset}px`);
      const width = element.getBoundingClientRect().width || 1;
      const remaining = Math.max(0, 1 + offset / width);
      scrim.current?.style.setProperty("--pico-drawer-progress", String(remaining));
    };

    const stopDragging = () => {
      dragging = false;
      pointer = undefined;
      delete element.dataset.dragging;
      if (scrim.current) delete scrim.current.dataset.dragging;
    };

    const settle = (offset: number) => {
      const width = element.getBoundingClientRect().width || 1;
      const far = -offset > width * DISMISS_DISTANCE;
      const flicked = velocity < -DISMISS_VELOCITY && -offset > AXIS_THRESHOLD_PX;
      stopDragging();

      if (!far && !flicked) {
        // Back where it was, on the curve everything else here moves on.
        element.style.setProperty("--pico-drawer-offset", "0px");
        scrim.current?.style.removeProperty("--pico-drawer-progress");
        return;
      }

      // The rest of the way out, to exactly where the closed state puts it —
      // so the transform React is about to write is the one already running,
      // and the panel simply keeps going instead of restarting.
      element.style.setProperty("--pico-drawer-offset", CLOSED_OFFSET);
      scrim.current?.style.removeProperty("--pico-drawer-progress");
      dismiss();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || pointer !== undefined) return;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastX = event.clientX;
      lastAt = event.timeStamp;
      velocity = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - startX;

      if (!dragging) {
        // A tap is not a drag, and neither is the beginning of a scroll: the
        // settings are a column that scrolls, and a drag has to be committed
        // to sideways before it takes the panel with it.
        if (Math.abs(dx) < AXIS_THRESHOLD_PX) return;
        if (Math.abs(dx) <= Math.abs(event.clientY - startY)) {
          pointer = undefined;
          return;
        }
        dragging = true;
        // Keeps the moves coming once the finger leaves the panel, which it
        // does well before the panel is far enough to let go of. Refused for a
        // pointer the browser is not tracking, and the drag is no worse for it
        // than a drag that never asked.
        try {
          element.setPointerCapture(event.pointerId);
        } catch {
          /* empty */
        }
        element.dataset.dragging = "true";
        if (scrim.current) scrim.current.dataset.dragging = "true";
      }

      const elapsed = event.timeStamp - lastAt;
      if (elapsed > 0) velocity = (event.clientX - lastX) / elapsed;
      lastX = event.clientX;
      lastAt = event.timeStamp;

      // Rightwards there is nowhere to go, so most of the drag is given back
      // rather than refused outright: an edge that does not move at all reads
      // as a panel that has stopped responding.
      draw(dx < 0 ? dx : dx * RUBBER_BAND);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      if (!dragging) {
        pointer = undefined;
        return;
      }
      settle(Math.min(0, event.clientX - startX));
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      stopDragging();
      element.style.setProperty("--pico-drawer-offset", "0px");
      scrim.current?.style.removeProperty("--pico-drawer-progress");
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerCancel);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerCancel);
      stopDragging();
      clearGesture();
    };
  }, [enabled, panel, scrim]);
}
