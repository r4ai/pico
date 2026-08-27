import { themeAccentsOf } from "@/features/settings/theme-accents";
import type { ThemeRegistrationResolved } from "shiki/core";
import { describe, expect, it } from "vite-plus/test";

function theme(
  fg: string,
  settings?: ThemeRegistrationResolved["settings"],
): ThemeRegistrationResolved {
  return { fg, settings } as ThemeRegistrationResolved;
}

describe("themeAccentsOf", () => {
  it("prefers exact scopes, then prefixes, then the theme foreground", () => {
    const accents = themeAccentsOf(
      theme("#fallback", [
        { scope: "ignored", settings: {} },
        { scope: "keyword.control.loop", settings: { foreground: "#prefix-keyword" } },
        { scope: ["", " keyword "], settings: { foreground: "#exact-keyword" } },
        {
          scope: "variable.other, support.function.builtin",
          settings: { foreground: "#prefix-function" },
        },
      ]),
    );

    expect(accents).toEqual({
      keyword: "#exact-keyword",
      fn: "#prefix-function",
      string: "#fallback",
    });
  });

  it("falls back to the foreground when the theme has no token settings", () => {
    expect(themeAccentsOf(theme("#foreground"))).toEqual({
      keyword: "#foreground",
      fn: "#foreground",
      string: "#foreground",
    });
  });
});
