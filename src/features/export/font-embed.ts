import { familyNameOf, type Font, type FontId } from "@/features/settings/fonts";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Chunked so a large font does not blow the argument limit of String.fromCharCode.
  const CHUNK = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

async function faceRule(family: string, url: string, weight: number, style: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read the font at ${url} (${response.status})`);
  const data = `data:font/woff2;base64,${toBase64(await response.arrayBuffer())}`;
  return (
    `@font-face{font-family:"${family}";font-style:${style};` +
    `font-weight:${weight};src:url(${data}) format("woff2")}`
  );
}

const cache = new Map<FontId, Promise<string>>();

/**
 * `@font-face` rules with the font inlined as data, for html-to-image.
 *
 * The capture renders inside an SVG `foreignObject`, which cannot reach back
 * out to the page for its fonts — without this the image falls back to a
 * system monospace and the text reflows.
 *
 * Only the font in use is inlined. Embedding all of them would put hundreds of
 * kilobytes into every capture for no benefit.
 */
export function fontEmbedCss(font: Font): Promise<string> {
  let pending = cache.get(font.id);
  if (!pending) {
    const family = familyNameOf(font);
    pending = Promise.all(
      font.faces.map((face) => faceRule(family, face.url, face.weight, face.style)),
    ).then((rules) => rules.join("\n"));
    cache.set(font.id, pending);
  }
  return pending;
}
