import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  const rendered = await render(
    <div style={{ height: "100vh" }}>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </div>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("textbox", { name: "Code" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function element(selector: string): HTMLElement {
  const match = document.querySelector(selector);
  if (!(match instanceof HTMLElement)) throw new Error(`${selector} is missing`);
  return match;
}

function largeCode(): string {
  return Array.from({ length: 400 }, (_, index) => {
    const value = index === 399 ? "x".repeat(1_600) : "payload";
    return `const value${index + 1} = "${value}";`;
  }).join("\n");
}

function documentBoundaryKeys(): { start: string; end: string } {
  return navigator.platform.startsWith("Mac")
    ? { start: "{Meta>}{ArrowUp}{/Meta}", end: "{Meta>}{ArrowDown}{/Meta}" }
    : { start: "{Control>}{Home}{/Control}", end: "{Control>}{End}{/Control}" };
}

it("keeps tall and wide code inside the canvas scroll area", async () => {
  const editor = page.getByRole("textbox", { name: "Code" });
  const keys = documentBoundaryKeys();
  await editor.fill(largeCode());

  const canvas = element(".pico-shell-canvas");
  await expect.poll(() => canvas.scrollHeight).toBeGreaterThan(canvas.clientHeight);
  await expect.poll(() => canvas.scrollWidth).toBeGreaterThan(canvas.clientWidth);

  for (const pageRoot of [document.documentElement, document.body]) {
    expect(getComputedStyle(pageRoot).overflowX).toBe("hidden");
    expect(getComputedStyle(pageRoot).overflowY).toBe("hidden");
  }
  expect(getComputedStyle(canvas).overflowX).toBe("auto");
  expect(getComputedStyle(canvas).overflowY).toBe("auto");

  const exportStage = element(".pico-export-stage").getBoundingClientRect();
  expect(exportStage.width).toBe(0);
  expect(exportStage.height).toBe(0);
  expect(exportStage.right).toBeLessThanOrEqual(0);
  expect(exportStage.bottom).toBeLessThanOrEqual(0);

  const liveFrame = element(".pico-shell-canvas .pico-frame").getBoundingClientRect();
  const exportFrame = element(".pico-export-stage .pico-frame").getBoundingClientRect();
  expect(liveFrame.width).toBeCloseTo(exportFrame.width, 1);
  expect(liveFrame.height).toBeCloseTo(exportFrame.height, 1);

  await userEvent.keyboard(keys.start);
  await expect.poll(() => canvas.scrollTop).toBeLessThan(100);
  await expect.poll(() => canvas.scrollLeft).toBeLessThan(100);
  const origin =
    element(".pico-shell-canvas .pico-frame").getBoundingClientRect().left + canvas.scrollLeft;

  await userEvent.keyboard(keys.end);
  await expect.poll(() => canvas.scrollTop).toBeGreaterThan(0);
  await expect.poll(() => canvas.scrollLeft).toBeGreaterThan(0);
  const scrolledFrame = element(".pico-shell-canvas .pico-frame").getBoundingClientRect();
  expect(scrolledFrame.left + canvas.scrollLeft).toBeCloseTo(origin, 1);
  expect(scrolledFrame.width).toBeCloseTo(liveFrame.width, 1);
  expect(scrolledFrame.height).toBeCloseTo(liveFrame.height, 1);
});
