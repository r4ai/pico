import { useCallback, useEffect, useRef, useState } from "react";

/** Long enough to be read, short enough that the button is itself again by the time you look back. */
const DEFAULT_DURATION_MS = 1600;

export type BriefFlag = {
  readonly on: boolean;
  readonly raise: () => void;
};

/**
 * A flag that turns itself off.
 *
 * For acknowledging something that happened in an instant, on the control that
 * did it. A toast says what happened, but it appears away from the button that
 * was just pressed, and the button going quiet is the thing the eye is already
 * looking at.
 */
export function useBriefFlag(durationMs: number = DEFAULT_DURATION_MS): BriefFlag {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const raise = useCallback(() => {
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), durationMs);
  }, [durationMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { on, raise };
}
