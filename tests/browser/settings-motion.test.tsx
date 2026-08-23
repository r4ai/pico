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

/** Waits for the colours to arrive, which is later than the setting. */
async function settle(before: string): Promise<void> {
  await expect.poll(exportBackground).not.toBe(before);
}

async function setAppearance(name: "Light" | "Dark"): Promise<void> {
  const before = exportBackground();
  await page.getByRole("radiogroup", { name: "Appearance" }).getByRole("radio", { name }).click();
  await settle(before);
}

/**
 * Themes are fetched once per page and the tests here share one, so a theme is
 * only ever cold for whichever test asks for it first. This one is nobody
 * else's, which is what makes the test below deterministic whatever the order.
 */
const NEVER_LOADED_THEME = "Kanagawa";

it("waits for a theme it does not have yet rather than dissolving into the old one", async () => {
  const before = exportBackground();
  await page.getByRole("combobox", { name: "Theme" }).click();
  await page.getByRole("option", { name: NEVER_LOADED_THEME }).click();
  await settle(before);

  // The frame's colours come from the theme the highlighter has loaded, not the
  // one that was asked for. On a first switch they arrive partway through a
  // dissolve — or, on a slow link, just as it ends, which is a snap at the end
  // of a fade and worse than no fade at all.
  expect(started).toBe(0);
});

it("dissolves once the colours can move with it", async () => {
  // Dark is the theme the page started on, so its colours are already here.
  await setAppearance("Light");
  started = 0;
  await setAppearance("Dark");

  expect(started).toBe(1);
  expect(document.documentElement.classList.contains("dark")).toBe(true);
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

it("puts the export node at its new colours, never between two", async () => {
  await setAppearance("Light");
  expect(exportBackground()).toBe("rgb(255, 255, 255)");

  // A capture taken while the page is dissolving has to be the picture that was
  // asked for. The dissolve is a pair of snapshots laid over the top; what the
  // exporter reads is already at its final value.
  started = 0;
  await setAppearance("Dark");
  expect(started).toBe(1);
  expect(exportBackground()).toBe("rgb(18, 18, 18)");
});
