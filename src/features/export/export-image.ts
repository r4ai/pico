import { fontEmbedCss } from "@/features/export/font-embed";
import { FONTS } from "@/features/settings/fonts";
import type { Settings } from "@/features/settings/settings";

const EXPORT_FORMATS = ["png", "svg"] as const;
export const EXPORT_SCALES = [1, 2, 3] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportScale = (typeof EXPORT_SCALES)[number];

/** Retina by default, so a pasted image is not soft on the display most people have. */
export const DEFAULT_SCALE: ExportScale = 2;

/**
 * How long to wait for the capture before giving up.
 *
 * The capture finishes by decoding an image, and a browser does not decode
 * images in a hidden tab. Without this, switching away mid-export leaves the
 * promise unsettled and the dock disabled forever.
 */
const RENDER_TIMEOUT_MS = 20_000;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(new Error("The capture did not finish. Switching tabs during an export stops it.")),
      RENDER_TIMEOUT_MS,
    );
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export type RenderRequest = {
  node: HTMLElement;
  settings: Settings;
  format: ExportFormat;
  scale: ExportScale;
};

/**
 * Turns the export node into an image.
 *
 * No background color is passed: the frame paints its own, so everything
 * outside the rounded corners stays transparent.
 */
export async function renderImage({ node, settings, format, scale }: RenderRequest): Promise<Blob> {
  // Downloaded here rather than with the app: nothing can be exported before
  // there is something to export, and the request goes out alongside the font
  // and the fonts.ready wait that the capture needs anyway.
  const [{ toBlob, toSvg }, fontEmbedCSS] = await Promise.all([
    import("html-to-image"),
    fontEmbedCss(FONTS[settings.font]),
    // Webfonts the page has not finished loading would be captured as fallbacks.
    document.fonts.ready,
  ]);
  const options = { fontEmbedCSS, pixelRatio: scale, cacheBust: false };

  if (format === "svg") {
    const dataUrl = await withTimeout(toSvg(node, options));
    // A data: URL, so a failure here is the browser refusing to parse what the
    // capture produced rather than a network error — but `fetch` reports that
    // by resolving, and an unchecked read would hand back an empty file.
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error("The browser could not read the captured SVG");
    return await response.blob();
  }

  const blob = await withTimeout(toBlob(node, options));
  if (!blob) throw new Error("The browser produced an empty image");
  return blob;
}

/** A sortable, collision-free name like `pico-20260823-114233.png`. */
export function imageFileName(format: ExportFormat, now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `pico-${stamp}.${format}`;
}

export function isExportScale(value: number): value is ExportScale {
  return (EXPORT_SCALES as readonly number[]).includes(value);
}
