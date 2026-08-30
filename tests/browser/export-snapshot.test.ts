import { renderImage } from "@/features/export/export-image";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { afterEach, expect, it, vi } from "vite-plus/test";

const BEFORE = "BEFORE_EXPORT";
const AFTER = "AFTER_EXPORT";

let target: HTMLElement | undefined;
let originalFetch: typeof fetch | undefined;

afterEach(() => {
  vi.useRealTimers();
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

function mockFontFetch(
  respond: (signal: AbortSignal | null | undefined) => Response | Promise<Response>,
): void {
  const fetchOriginal = window.fetch;
  originalFetch = fetchOriginal;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return url.endsWith(".woff2") ? await respond(init?.signal) : await fetchOriginal(input, init);
  };
}

it("captures the content and appearance from when rendering starts", async () => {
  const source = mountTarget();
  let releaseFonts: (() => void) | undefined;
  const fontsReleased = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });
  mockFontFetch(async () => {
    await fontsReleased;
    return new Response(new Uint8Array([0]));
  });

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

it("removes failed snapshots and retries the font on the next capture", async () => {
  const source = mountTarget();
  let fontAvailable = false;
  mockFontFetch(() =>
    fontAvailable ? new Response(new Uint8Array([0])) : new Response(null, { status: 503 }),
  );

  const request = {
    format: "svg",
    node: source,
    scale: 1,
    settings: { ...DEFAULT_SETTINGS, font: "fira-code" },
  } as const;

  await expect(renderImage(request)).rejects.toThrow("Could not read the font");
  expect(source.parentElement?.childElementCount).toBe(1);

  fontAvailable = true;
  await expect(renderImage(request)).resolves.toBeInstanceOf(Blob);
  expect(source.parentElement?.childElementCount).toBe(1);
});

it("times out while a font request is stalled", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const source = mountTarget();
  let fontAvailable = false;
  mockFontFetch(async (signal) => {
    if (fontAvailable) return new Response(new Uint8Array([0]));
    return await new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });

  const request = {
    format: "png",
    node: source,
    scale: 1,
    settings: { ...DEFAULT_SETTINGS, font: "inconsolata" },
  } as const;
  const timedOut = expect(renderImage(request)).rejects.toThrow("The capture did not finish");

  await vi.advanceTimersByTimeAsync(20_000);

  await timedOut;
  expect(source.parentElement?.childElementCount).toBe(1);

  vi.useRealTimers();
  fontAvailable = true;
  await expect(renderImage(request)).resolves.toBeInstanceOf(Blob);
});
