import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type DockButtonProps = Omit<ComponentProps<typeof Button>, "isDisabled"> & {
  /** True while a capture is running — this button's or the one beside it. */
  busy?: boolean;
};

/**
 * One of the dock's actions.
 *
 * `aria-disabled` while a capture runs, never `disabled`. A button that
 * disables itself under the press that started it hands the keyboard back to
 * the document — a browser will not leave focus on an element it no longer
 * considers focusable — so pressing Copy from the keyboard used to drop you at
 * the top of the page, with the dock four Tab stops and one Escape away. The
 * flag only has to say the button is not taking anything right now; `useExport`
 * already refuses a second capture, so it never had to enforce it.
 */
export function DockButton({ busy = false, className, ...props }: DockButtonProps) {
  return (
    <Button
      aria-disabled={busy || undefined}
      className={cn(
        "pico-glass-hover aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      size="sm"
      variant="ghost"
      {...props}
    />
  );
}
