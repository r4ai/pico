import { parseHexColor } from "@/features/settings/background";
import { describe, expect, it } from "vite-plus/test";

describe("background HEX input", () => {
  it.each([
    ["#AbC", "#aabbcc"],
    [" 123456 ", "#123456"],
    ["#ABCDEF", "#abcdef"],
    ["", null],
    ["#12", null],
    ["#12345g", null],
    ["#12345678", null],
    ["transparent", null],
    ["url(example.com)", null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseHexColor(input)).toBe(expected);
  });
});
