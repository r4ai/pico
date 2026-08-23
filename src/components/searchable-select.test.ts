import { searchTextOf, type SearchableOption } from "@/components/searchable-option";
import { describe, expect, it } from "vite-plus/test";

describe("searchable select", () => {
  it("searches optional terms without changing the displayed label", () => {
    const option: SearchableOption<"csharp"> = {
      value: "csharp",
      label: "C#",
      render: "C#",
      searchTerms: ["cs", "csharp"],
    };

    expect(searchTextOf(option)).toBe("C# cs csharp");
    expect(option.label).toBe("C#");
  });

  it("uses only the label when no extra search terms are supplied", () => {
    const option: SearchableOption<"dark"> = {
      value: "dark",
      label: "Dark",
      render: "Dark",
    };

    expect(searchTextOf(option)).toBe("Dark");
  });
});
