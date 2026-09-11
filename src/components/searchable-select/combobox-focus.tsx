import { type RefObject, useContext, useEffect, useLayoutEffect } from "react";
import { ComboBoxStateContext } from "react-aria-components";

export type ComboboxFocusProps = {
  /** The popover this is rendered inside, which is the box that scrolls. */
  popover: RefObject<HTMLElement | null>;
};

/**
 * Keeps a picker's keyboard on the option Enter would take, and that option on
 * screen.
 *
 * Two things React Aria leaves undone in the arrangement Pico uses — a list
 * that opens on focus, over hundreds of options, with the field doubling as
 * the search box.
 *
 * **Typing left the keyboard on nothing.** The list is already open by the
 * time anyone types into it, so filtering it never moves the keyboard: type
 * "rust" until one language is left, press Enter, and the picker sits there.
 * You had to press Down first, at which point the field is not really a search
 * box. Whenever the option the keyboard is on is filtered away, it moves to
 * the first one still standing — and stays wherever the arrow keys put it, so
 * long as that option is still in the list.
 *
 * **Opening scrolled nowhere.** The selected option is focused on open, and
 * `aria-activedescendant` names it, but a virtualized list is not scrolled to
 * it: the language picker opened at "1C (Enterprise)", hundreds of names above
 * the one it was showing. `block: "nearest"` leaves a value that is already on
 * screen where it is rather than jumping it to the middle.
 *
 * Renders nothing, and is mounted and unmounted with the popover, so being
 * mounted is the picker being open. The scroll waits a frame because the
 * popover is still being measured and positioned during the commit that mounts
 * it, and a list with no height yet has nowhere to scroll to.
 */
export function ComboboxFocus({ popover }: ComboboxFocusProps) {
  const state = useContext(ComboBoxStateContext);

  // No dependencies: this is an invariant about every render, not a reaction
  // to one value. It settles in a single pass — once the keyboard is on an
  // option that exists, the next run has nothing to do. This must run during
  // layout: Enter can be the first browser event after filtering commits, so a
  // passive effect would leave that event with no option to take.
  useLayoutEffect(() => {
    if (!state?.isOpen) return;
    const { collection, selectionManager } = state;
    const focused = selectionManager.focusedKey;
    if (focused != null && collection.getItem(focused) != null) return;

    const first = collection.getFirstKey();
    if (first != null) selectionManager.setFocusedKey(first);
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      popover.current
        ?.querySelector('[data-slot="combobox-item"][data-selected]')
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [popover]);

  return null;
}
