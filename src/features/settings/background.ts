/** A theme-owned background, a fully transparent frame, or an explicit opaque RGB color. */
export type Background = "theme" | "transparent" | `#${string}`;

/** Accept short or full HEX, with an optional hash; store a canonical six-digit RGB value. */
export function parseHexColor(input: string): `#${string}` | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex;
  return `#${expanded.toLowerCase()}`;
}
