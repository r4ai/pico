import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * A translucent, blurred surface that floats above the canvas.
 *
 * It reads as glass because of three things together: the blur behind it, a
 * hairline highlight along the top inside edge where light would catch, and a
 * soft shadow that separates it from what it covers.
 */
export function GlassPanel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("pico-glass", className)} {...props} />;
}
