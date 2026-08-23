import { useSyncExternalStore } from "react";

type Sonner = typeof import("sonner");

export type ToastOptions = {
  /** The second line, for the part that explains rather than announces. */
  description?: string;
};

let sonner: Promise<Sonner> | undefined;
let wanted = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether anything has asked for a toast yet.
 *
 * What {@link Toaster} is mounted on. Reading it through
 * `useSyncExternalStore` rather than through state somewhere is what lets
 * {@link toast} be an ordinary function call from inside a `catch`, with no
 * hook and no provider between the thing that went wrong and saying so.
 */
export function useToastsWanted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => wanted,
    () => false,
  );
}

function announce(kind: "success" | "warning" | "error", message: string, options?: ToastOptions) {
  if (!wanted) {
    wanted = true;
    for (const listener of listeners) listener();
  }
  sonner ??= import("sonner");
  void sonner.then(
    (module) => module.toast[kind](message, options),
    // Nothing left to say it with. Every caller is already reporting something
    // that has finished happening, so there is nothing to fall back to and
    // nothing to unwind.
    () => {},
  );
}

/**
 * What Pico says when something happened away from the control that caused it.
 *
 * A façade over sonner, which is fetched by the first call rather than by the
 * entry chunk: it was 33 kB of the chunk that decides when the picture appears,
 * and the first screen has nothing to announce. By the time anything does, the
 * button that did it is already showing a spinner or a tick — see
 * {@link DockIcon} — so the toast arriving a moment behind it costs nothing.
 *
 * Deliberately fire-and-forget. Toasts are told, not awaited, and a caller in
 * a `catch` has no use for a promise.
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => announce("success", message, options),
  warning: (message: string, options?: ToastOptions) => announce("warning", message, options),
  error: (message: string, options?: ToastOptions) => announce("error", message, options),
};
