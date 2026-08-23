import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";

/**
 * Beyond this length browsers and chat clients start truncating or refusing
 * URLs, so the UI warns the author instead of silently handing out a dead link.
 */
export const SAFE_URL_LENGTH = 8000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses source code into a URL-safe token for the `c` search param.
 *
 * @returns An empty string for empty input, so the param can be dropped entirely.
 */
export function encodeCode(code: string): string {
  if (code === "") return "";
  return toBase64Url(deflateSync(strToU8(code)));
}

/**
 * Reverses {@link encodeCode}.
 *
 * @throws If the token is not valid base64url or not valid deflate data. Callers
 * must surface the failure rather than guessing at a repair.
 */
export function decodeCode(encoded: string): string {
  if (encoded === "") return "";
  return strFromU8(inflateSync(fromBase64Url(encoded)));
}
