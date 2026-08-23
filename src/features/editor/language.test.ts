import { isLanguageId, LANGUAGE_IDS, LANGUAGES } from "@/features/editor/language";
import { describe, expect, it } from "vite-plus/test";

describe("language registry", () => {
  it("derives every supported id from the registry", () => {
    expect(LANGUAGE_IDS).toEqual(Object.keys(LANGUAGES));
  });

  it.each(LANGUAGE_IDS)("owns the lazy Shiki loader for %s", async (id) => {
    const registrations = await LANGUAGES[id].load();
    expect(registrations.length).toBeGreaterThan(0);
  });

  it("accepts supported ids and rejects unknown ones", () => {
    expect(isLanguageId("ts")).toBe(true);
    expect(isLanguageId("js")).toBe(true);
    expect(isLanguageId("python")).toBe(false);
  });

  it("keeps aliases searchable without turning them into language ids", () => {
    expect(LANGUAGES.ts.aliases).toContain("typescript");
    expect(LANGUAGES.js.aliases).toContain("javascript");
    expect(isLanguageId("typescript")).toBe(false);
  });
});
