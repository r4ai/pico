import { FONT_SIZES, LINE_HEIGHT, PADDINGS, RADII, SHADOWS } from "@/features/settings/appearance";
import { FONTS } from "@/features/settings/fonts";
import type { Settings } from "@/features/settings/settings";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export type CodeFrameProps = {
  settings: Settings;
  /** The Shiki theme's background color. */
  background: string;
  children: ReactNode;
  className?: string;
};

/**
 * The box the code sits in — background, padding, corners and shadow.
 *
 * Both the live editor and the hidden export node are wrapped in one of these,
 * and all their geometry is read from the custom properties set here. That is
 * what keeps what you see and what you save the same shape.
 */
export function CodeFrame({ settings, background, children, className }: CodeFrameProps) {
  const style = {
    "--pico-font-family": FONTS[settings.font].stack,
    "--pico-font-size": FONT_SIZES[settings.fontSize],
    "--pico-line-height": LINE_HEIGHT,
    "--pico-pad": PADDINGS[settings.padding],
    "--pico-radius": RADII[settings.radius],
    "--pico-shadow": SHADOWS[settings.shadow],
    "--pico-bg": background,
    "--pico-gutter-gap": "1.5ch",
    "--pico-gutter-min-width": "2ch",
  } as CSSProperties;

  return (
    <div className={cn("pico-frame", className)} style={style}>
      {children}
    </div>
  );
}
