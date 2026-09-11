import { parseHexColor } from "@/core/settings/background";
import { describe, expect, it } from "vite-plus/test";

describe("background HEX input", () => {
  it.each([
    ["#AbC", "#aabbcc"],
    [" 123456 ", "#123456"],
    ["#ABCDEF", "#abcdef"],
    ["", null],
    ["#12", null],
    ["#12345g", null],
    ["#12345678", "#12345678"],
    ["#AbC8", "#aabbcc88"],
    [" 1234 ", "#11223344"],
    ["#ABCDEF80", "#abcdef80"],
    ["#12345600", "#12345600"],
    ["#123456ff", "#123456"],
    ["#abcdF", null],
    ["#1234567", null],
    ["#123456789", null],
    ["#123456gg", null],
    ["transparent", null],
    ["url(example.com)", null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseHexColor(input)).toBe(expected);
  });
});
