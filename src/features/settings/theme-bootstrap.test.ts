import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vite-plus/test";

const indexHtml = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");

function startsDark(search: string): boolean {
  const htmlClass = indexHtml.match(/<html[^>]*class="([^"]*)"/)?.[1];
  const htmlClasses = htmlClass?.split(/\s+/) ?? [];
  const classes = new Set(htmlClasses);
  const bootstrap = indexHtml.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)?.[1];

  if (!bootstrap) throw new Error("An inline theme bootstrap is missing from <head>");
  runInNewContext(bootstrap, {
    URLSearchParams,
    location: { search },
    document: {
      documentElement: {
        classList: {
          remove: (name: string) => classes.delete(name),
        },
      },
    },
  });

  return classes.has("dark");
}

describe("initial color mode", () => {
  it.each([
    ["the default mode", "", true],
    ["an explicit dark mode", "?mode=dark", true],
    ["an explicit light mode", "?mode=light", false],
    ["an invalid mode", "?mode=sepia", true],
  ])("applies %s before the app starts", (_case, search, expected) => {
    expect(startsDark(search)).toBe(expected);
  });
});
