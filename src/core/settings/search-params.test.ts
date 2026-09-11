import { hasExplicitLanguage } from "@/core/settings/search-params";
import { describe, expect, it } from "vite-plus/test";

describe("explicit language query", () => {
  it.each([
    { query: "", state: "missing", explicit: false },
    { query: "?lang=", state: "empty", explicit: false },
    { query: "?lang=not-a-language", state: "invalid", explicit: false },
    { query: "?lang=python", state: "valid", explicit: true },
  ])("classifies a $state lang value", ({ query, explicit }) => {
    expect(hasExplicitLanguage(query)).toBe(explicit);
  });
});

import { buildShareUrl } from "@/core/settings/search-params";
import { DEFAULT_SETTINGS } from "@/core/settings/settings";

it.each(["theme", "transparent", "#123456", "#12345680", "#12345600"] as const)(
  "shares background %s",
  (background) => {
    const { url } = buildShareUrl({ ...DEFAULT_SETTINGS, background }, "", "https://pico.example/");
    expect(new URL(url).searchParams.get("background")).toBe(
      background === "theme" ? null : background,
    );
  },
);
