import { App } from "@/app";
import { fontFaceCss } from "@/features/settings/fonts";
import "@/global.css";
import { createStore, Provider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;
let started: number;
let restore: (() => void) | undefined;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  const fonts = document.createElement("style");
  fonts.dataset.testFonts = "";
  fonts.textContent = fontFaceCss();
  document.head.append(fonts);

  started = 0;
  const original = document.startViewTransition.bind(document);
  document.startViewTransition = (...args) => {
    started++;
    return original(...args);
  };
  restore = () => {
    document.startViewTransition = original;
  };

  const rendered = await render(
    <Provider store={createStore()}>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </Provider>,
  );
  unmount = rendered.unmount;
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("radiogroup", { name: "Padding" })).toBeInTheDocument();
});

afterEach(async () => {
  restore?.();
  restore = undefined;
  await unmount?.();
  unmount = undefined;
  await cleanup();
  document.querySelector("style[data-test-fonts]")?.remove();
});

function exportBackground(): string {
  const node = document.querySelector(".pico-export-stage .pico-frame");
  if (!node) throw new Error("the export frame is missing");
  return getComputedStyle(node).backgroundColor;
}

it("dissolves a change that is nothing but colour", async () => {
  await page
    .getByRole("radiogroup", { name: "Appearance" })
    .getByRole("radio", { name: "Light" })
    .click();
  await expect.poll(() => started).toBe(1);
  await expect.poll(() => document.documentElement.classList.contains("dark")).toBe(false);
});

it("leaves a change that moves something to its own easing", async () => {
  await page
    .getByRole("radiogroup", { name: "Padding" })
    .getByRole("radio", { name: "XL" })
    .click();
  await expect.poll(() => new URLSearchParams(window.location.search).get("padding")).toBe("xl");
  // A dissolve laid over the geometry transition would be two answers to one
  // action, and the frame is already easing its way to the new size.
  expect(started).toBe(0);
});

it("puts the export node at its new colours before the dissolve starts", async () => {
  const before = exportBackground();
  await page
    .getByRole("radiogroup", { name: "Appearance" })
    .getByRole("radio", { name: "Light" })
    .click();

  // Never a blend of the two: a capture taken mid-dissolve has to be the
  // picture that was asked for.
  await expect.poll(exportBackground).not.toBe(before);
  await expect.poll(exportBackground).toBe("rgb(255, 255, 255)");
});
