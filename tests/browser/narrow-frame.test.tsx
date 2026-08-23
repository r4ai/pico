import { App } from "@/app";
import "@/global.css";
import { createStore, Provider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/** The frame on a window narrower than the 28rem it would rather be. */

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  const rendered = await render(
    <Provider store={createStore()}>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </Provider>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("textbox", { name: "Code" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function frame(selector: string): DOMRect {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`${selector} is missing`);
  return element.getBoundingClientRect();
}

it("fits an empty picture inside the window", async () => {
  const live = frame(".pico-shell-canvas .pico-frame");
  expect(live.width).toBeLessThan(window.innerWidth);
  // Both edges on screen, so the corners and the shadow are part of the
  // picture rather than something you have to scroll to find.
  expect(live.left).toBeGreaterThan(0);
  expect(live.right).toBeLessThan(window.innerWidth);
});

it("gives the export node exactly the same width", () => {
  expect(frame(".pico-export-stage .pico-frame").width).toBeCloseTo(
    frame(".pico-shell-canvas .pico-frame").width,
    1,
  );
});

it("still lets a picture wider than the window be scrolled to", async () => {
  await page.getByRole("textbox", { name: "Code" }).fill(`const x = "${"y".repeat(120)}";`);
  await expect
    .poll(() => frame(".pico-shell-canvas .pico-frame").width)
    .toBeGreaterThan(window.innerWidth);

  const canvas = document.querySelector(".pico-shell-canvas");
  expect(canvas?.scrollWidth).toBeGreaterThan(window.innerWidth);
  expect(canvas?.getAttribute("tabindex")).toBe("0");
});
