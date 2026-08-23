import { isLanguageId, LANGUAGE_IDS } from "@/features/editor/language";
import { LANGUAGES } from "@/features/editor/language-registry";
import { bundledLanguagesInfo } from "shiki/langs";
import { describe, expect, it } from "vite-plus/test";

describe("language registry", () => {
  // The compiler already rejects a registry that is missing an id or has one
  // too many. What it cannot see is the order, which is the order the picker
  // draws, so that is what this checks.
  it("keeps the id list and the registry in the same order", () => {
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
