import { useToastsWanted } from "@/components/toast";
import type { ColorMode } from "@/features/settings/theme";
import { lazy, Suspense } from "react";

const Sonner = lazy(async () => ({ default: (await import("@/components/ui/sonner")).Toaster }));

export type ToasterProps = {
  theme: ColorMode;
};

/**
 * Where toasts appear, once there is one to appear.
 *
 * Nothing is mounted until the first {@link toast} call, which is also what
 * starts sonner downloading. Both arrive in the same commit, and sonner replays
 * whatever was raised before its subscriber existed, so the toast that caused
 * all this is not the one that gets lost.
 *
 * No fallback: a placeholder for a message nobody has been shown yet would be
 * a message.
 */
export function Toaster({ theme }: ToasterProps) {
  const wanted = useToastsWanted();
  if (!wanted) return null;

  return (
    <Suspense fallback={null}>
      <Sonner position="top-center" theme={theme} />
    </Suspense>
  );
}
