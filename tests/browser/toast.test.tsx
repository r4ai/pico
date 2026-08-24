import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * A toast is glass, the way everything else that floats over the picture is.
 *
 * sonner is asked for no card of its own and styled from the stylesheet
 * instead; what that is worth is that a toast and the dock are the same
 * material at the same corner radius, which is what these hold.
 */

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function surfaceOf(element: Element) {
  const style = getComputedStyle(element);
  return {
    radius: style.borderRadius,
    background: style.backgroundColor,
    backdropFilter: style.backdropFilter,
  };
}

async function raiseToast(): Promise<HTMLElement> {
  // Whether the clipboard write is allowed here decides which toast this is,
  // and not what it is made of.
  await page.getByRole("button", { name: "Link" }).click();
  await expect.poll(() => document.querySelector(".pico-toast")).toBeTruthy();
  const toast = document.querySelector(".pico-toast");
  if (!(toast instanceof HTMLElement)) throw new Error("no toast was raised");
  return toast;
}

it("is made of the same glass as the dock", async () => {
  const dock = document.querySelector(".pico-shell-dock .pico-glass");
  if (!(dock instanceof HTMLElement)) throw new Error("the dock is missing");

  expect(surfaceOf(await raiseToast())).toEqual(surfaceOf(dock));
});

it("says which kind it is in colour as well as in words", async () => {
  const toast = await raiseToast();
  const icon = toast.querySelector(".pico-toast-icon");
  if (!(icon instanceof HTMLElement)) throw new Error("the toast has no icon");

  expect(toast.dataset.type).toBeTruthy();
  // Never the only thing saying so: every toast says which kind it is in its
  // own words, and this only has to be a colour of its own.
  expect(getComputedStyle(icon).color).not.toBe(getComputedStyle(toast).color);
  expect(toast.textContent).toContain("link");
});
