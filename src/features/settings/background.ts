/** A theme-owned background, a fully transparent frame, or an explicit RGB(A) color. */
export type Background = "theme" | "transparent" | `#${string}`;

/** Accept RGB/RGBA HEX, with an optional hash; expand short forms and omit opaque alpha. */
export function parseHexColor(input: string): `#${string}` | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return null;
  const expanded =
    hex.length <= 4
      ? hex
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex;
  const normalized = expanded.toLowerCase();
  return `#${normalized.length === 8 && normalized.endsWith("ff") ? normalized.slice(0, 6) : normalized}`;
}
