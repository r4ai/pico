import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;

function frame(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`${selector} is missing`);
  return element;
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  if (!document.querySelector('.pico-sidebar[data-open="true"]')) {
    await page.getByRole("button", { name: "Open settings" }).click();
  }
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

it("applies geometry immediately when reduced motion is requested", async () => {
  const liveFrame = frame(".pico-shell-canvas .pico-frame");
  const exportFrame = frame(".pico-export-stage .pico-frame");
  const padding = page.getByRole("radiogroup", { name: "Padding" });

  await padding.getByRole("radio", { name: "S" }).click();
  await nextFrame();
  const xlPadding = padding.getByRole("radio", { name: "XL" });
  await xlPadding.click();
  await expect.element(xlPadding).toBeChecked();
  await nextFrame();
  await nextFrame();

  const hasLongTransition = liveFrame
    .getAnimations()
    .some((animation) => Number(animation.effect?.getTiming().duration) > 1);
  expect(hasLongTransition).toBe(false);
  expect(Number.parseFloat(getComputedStyle(liveFrame).paddingLeft)).toBe(64);
  expect(liveFrame.getBoundingClientRect().width).toBeCloseTo(
    exportFrame.getBoundingClientRect().width,
    1,
  );
});
