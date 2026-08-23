import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DockIconProps = {
  /** The icon the button wears when nothing is happening. */
  children: ReactNode;
  /** True while this button's own work is in flight. */
  pending?: boolean;
  /** True for a moment after that work landed. */
  done?: boolean;
};

/**
 * A dock button's icon, standing in for whatever the button is doing.
 *
 * A toast says the same things, but it appears at the top of the window and
 * the button is where the eye already is. Only the icon changes: swapping the
 * words for "Copied" would resize the dock and shuffle every control beside it
 * each time somebody copied something.
 */
export function DockIcon({ children, pending = false, done = false }: DockIconProps) {
  if (pending) {
    return <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />;
  }
  if (done) {
    return <CheckIcon className="pico-icon-arrives" data-icon="inline-start" />;
  }
  return children;
}

/**
 * A dock button's word.
 *
 * Kept for screen readers once the window is too narrow to draw it: the icons
 * for copying, downloading and linking are drawn the same way everywhere, so
 * they can carry the buttons alone where the language field cannot.
 */
export function DockLabel({ children }: { children: string }) {
  return <span className="max-[26rem]:sr-only">{children}</span>;
}
