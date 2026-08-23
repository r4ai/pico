import type { FrameColors } from "@/features/preview/frame-colors";
import {
  FONT_SIZES,
  LINE_HEIGHT,
  PADDINGS,
  RADII,
  SHADOW_ROOM,
  SHADOWS,
} from "@/features/settings/appearance";
import { FONTS } from "@/features/settings/fonts";
import type { Settings } from "@/features/settings/settings";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export type CodeFrameProps = {
  settings: Settings;
  colors: FrameColors;
  children: ReactNode;
  className?: string;
  width?: number;
};

/**
 * The box the code sits in — background, padding, corners and shadow.
 *
 * Both the live editor and the hidden export node are wrapped in one of these,
 * and all their geometry is read from the custom properties set here. That is
 * what keeps what you see and what you save the same shape.
 */
export function CodeFrame({ settings, colors, children, className, width }: CodeFrameProps) {
  const style = {
    "--pico-font-family": FONTS[settings.font].stack,
    "--pico-font-size": FONT_SIZES[settings.fontSize],
    "--pico-line-height": LINE_HEIGHT,
    "--pico-pad": PADDINGS[settings.padding],
    "--pico-radius": RADII[settings.radius],
    "--pico-shadow": SHADOWS[settings.shadow],
    "--pico-shadow-room": SHADOW_ROOM[settings.shadow],
    "--pico-bg": colors.background,
    "--pico-fg": colors.foreground,
    "--pico-line-number": colors.lineNumber,
    "--pico-gutter-gap": "1.5ch",
    "--pico-gutter-min-width": "2ch",
    width,
  } as CSSProperties;

  return (
    <div className={cn("pico-frame", className)} style={style}>
      {children}
    </div>
  );
}
