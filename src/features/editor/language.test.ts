import { isLanguageId, LANGUAGE_IDS, LANGUAGES } from "@/features/editor/language";
import { bundledLanguagesInfo } from "shiki/langs";
import { describe, expect, it } from "vite-plus/test";

describe("language registry", () => {
  it("derives every supported id from the registry", () => {
    expect(LANGUAGE_IDS).toEqual(Object.keys(LANGUAGES));
  });

  it("lists languages alphabetically by their displayed name", () => {
    const labels = LANGUAGE_IDS.map((id) => LANGUAGES[id].label);
    expect(labels).toEqual(labels.toSorted((left, right) => left.localeCompare(right, "en")));
  });

  it("deliberately includes every bundled Shiki language plus CUDA", () => {
    const shikiLanguages = LANGUAGE_IDS.filter((id) => id !== "cuda").map(
      (id) => LANGUAGES[id].shikiLang,
    );
    expect(new Set(shikiLanguages)).toEqual(
      new Set(bundledLanguagesInfo.map((language) => language.id)),
    );
    expect(LANGUAGE_IDS).toHaveLength(243);
  });

  it("gives every supported language a lazy Shiki loader", () => {
    for (const id of LANGUAGE_IDS) expect(LANGUAGES[id].load).toBeTypeOf("function");
  });

  it("accepts supported ids and rejects unknown ones", () => {
    expect(isLanguageId("ts")).toBe(true);
    expect(isLanguageId("js")).toBe(true);
    expect(isLanguageId("not-a-language")).toBe(false);
  });

  it("keeps aliases searchable without turning them into language ids", () => {
    expect(LANGUAGES.ts.aliases).toContain("typescript");
    expect(LANGUAGES.js.aliases).toContain("javascript");
    expect(isLanguageId("typescript")).toBe(false);
  });
});
