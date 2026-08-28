import { hasExplicitLanguage } from "@/features/settings/search-params";
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
