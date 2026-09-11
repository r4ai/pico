/**
 * What an export is, as far as anything outside the exporter needs to know.
 *
 * The dock offers these formats and scales and the app remembers which scale
 * is chosen, none of which requires the capture itself — which pulls in
 * html-to-image and every embedded font. Kept here so the toolbar can name a
 * format without reaching into `@/features/export`.
 */

const EXPORT_FORMATS = ["png", "svg"] as const;
export const EXPORT_SCALES = [1, 2, 3] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportScale = (typeof EXPORT_SCALES)[number];

/** Retina by default, so a pasted image is not soft on the display most people have. */
export const DEFAULT_SCALE: ExportScale = 2;

/** Which control is waiting on a capture, so only that one shows it. */
export type ExportTask = "copy" | "save";

export function isExportScale(value: number): value is ExportScale {
  return (EXPORT_SCALES as readonly number[]).includes(value);
}
