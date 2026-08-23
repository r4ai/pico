export const PADDING_IDS = ["sm", "md", "lg", "xl"] as const;
export const RADIUS_IDS = ["none", "sm", "md", "lg"] as const;
export const SHADOW_IDS = ["none", "sm", "md", "lg"] as const;
export const FONT_SIZE_IDS = ["sm", "md", "lg", "xl"] as const;

export type PaddingId = (typeof PADDING_IDS)[number];
export type RadiusId = (typeof RADIUS_IDS)[number];
export type ShadowId = (typeof SHADOW_IDS)[number];
export type FontSizeId = (typeof FONT_SIZE_IDS)[number];

/**
 * Presets rather than free numbers: a handful of good-looking steps is faster
 * to choose from than a slider, and every step is one somebody vetted.
 */
export const PADDINGS: Record<PaddingId, string> = {
  sm: "16px",
  md: "28px",
  lg: "44px",
  xl: "64px",
};

export const RADII: Record<RadiusId, string> = {
  none: "0px",
  sm: "6px",
  md: "12px",
  lg: "20px",
};

export const SHADOWS: Record<ShadowId, string> = {
  none: "none",
  sm: "0 1px 2px rgb(0 0 0 / 0.10), 0 2px 8px rgb(0 0 0 / 0.10)",
  md: "0 2px 4px rgb(0 0 0 / 0.10), 0 8px 24px rgb(0 0 0 / 0.16)",
  lg: "0 4px 8px rgb(0 0 0 / 0.12), 0 24px 56px rgb(0 0 0 / 0.24)",
};

/**
 * How much transparent room the export needs around the frame so the drop
 * shadow is not clipped at the edge of the image.
 */
export const SHADOW_ROOM: Record<ShadowId, string> = {
  none: "0px",
  sm: "16px",
  md: "36px",
  lg: "72px",
};

export const FONT_SIZES: Record<FontSizeId, string> = {
  sm: "12px",
  md: "14px",
  lg: "16px",
  xl: "18px",
};

/** Loose enough that highlighted code breathes, tight enough to stay compact. */
export const LINE_HEIGHT = "1.6";

/** One motion language for every geometry change in the live preview. */
export const PREVIEW_GEOMETRY_DURATION_MS = 260;

/**
 * How long the preview keeps its transitions after the animation should be over.
 *
 * The countdown starts when the control is pressed, but the transition only
 * starts once React has re-rendered and the browser has recalculated the
 * frame's styles. Ending the two at the same moment therefore cuts the last
 * frames off — invisibly on a fast render, and as a jump on a slow one, which
 * is exactly when nothing should be jumping.
 */
export const PREVIEW_GEOMETRY_GRACE_MS = 120;

export const DEFAULT_PADDING: PaddingId = "lg";
export const DEFAULT_RADIUS: RadiusId = "md";
export const DEFAULT_SHADOW: ShadowId = "md";
export const DEFAULT_FONT_SIZE: FontSizeId = "md";
export const DEFAULT_LINE_NUMBERS = false;
