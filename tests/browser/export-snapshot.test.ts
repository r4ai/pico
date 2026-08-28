import { renderImage } from "@/features/export/export-image";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { afterEach, expect, it } from "vite-plus/test";

const BEFORE = "BEFORE_EXPORT";
const AFTER = "AFTER_EXPORT";

let target: HTMLElement | undefined;
let originalFetch: typeof fetch | undefined;

afterEach(() => {
  target?.parentElement?.remove();
  target = undefined;
  if (originalFetch) window.fetch = originalFetch;
  originalFetch = undefined;
});

function mountTarget(): HTMLElement {
  const stage = document.createElement("div");
  stage.className = "pico-export-stage";
  target = document.createElement("div");
  target.className = "pico-export-host";
  target.style.cssText = "width: 12rem; background: rgb(1, 2, 3); color: white";
  target.textContent = BEFORE;
  stage.append(target);
  document.body.append(stage);
  return target;
}

it("captures the content and appearance from when rendering starts", async () => {
  const source = mountTarget();
  const fetchOriginal = window.fetch;
  originalFetch = fetchOriginal;
  let releaseFonts: (() => void) | undefined;
  const fontsReleased = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith(".woff2")) {
      await fontsReleased;
      return new Response(new Uint8Array([0]));
    }
    return await fetchOriginal(input, init);
  };

  const rendering = renderImage({
    format: "svg",
    node: source,
    scale: 1,
    settings: DEFAULT_SETTINGS,
  });
  source.textContent = AFTER;
  source.style.background = "rgb(4, 5, 6)";
  releaseFonts?.();

  const svg = await (await rendering).text();
  expect(svg).toContain(BEFORE);
  expect(svg).toContain("rgb(1, 2, 3)");
  expect(svg).not.toContain(AFTER);
  expect(svg).not.toContain("rgb(4, 5, 6)");
  expect(source.parentElement?.childElementCount).toBe(1);
});

it("removes the snapshot when rendering fails", async () => {
  const source = mountTarget();
  originalFetch = window.fetch;
  window.fetch = async () => new Response(null, { status: 503 });

  const rendering = renderImage({
    format: "svg",
    node: source,
    scale: 1,
    settings: { ...DEFAULT_SETTINGS, font: "fira-code" },
  });

  await expect(rendering).rejects.toThrow("Could not read the font");
  expect(source.parentElement?.childElementCount).toBe(1);
});
