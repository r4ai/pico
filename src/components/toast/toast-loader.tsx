import type { ComponentProps, ComponentType } from "react";

type ToastModule = typeof import("@/components/ui/sonner");
type ToastComponent = ComponentType<ComponentProps<ToastModule["Toaster"]>>;

function ToastFallback(_: ComponentProps<ToastModule["Toaster"]>) {
  return (
    <div className="pico-toast fixed top-4 left-1/2 z-50 max-w-sm -translate-x-1/2" role="alert">
      <div className="pico-toast-content">
        <div className="pico-toast-title">The notification could not be shown.</div>
        <div className="pico-toast-description">Try again when the connection returns.</div>
      </div>
    </div>
  );
}

/** Loads the optional toast UI without letting its failure take down the app.
 *
 * @param pending The import started by the first notification.
 * @returns A lazy component module. Import failure resolves to a built-in alert.
 */
export async function loadToaster(
  pending: Promise<ToastModule>,
): Promise<{ default: ToastComponent }> {
  try {
    return { default: (await pending).Toaster };
  } catch {
    return { default: ToastFallback };
  }
}
