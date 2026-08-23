import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * The settings, remembered between visits — at the width where they are a
 * column of their own rather than a drawer over the picture. The drawer's own
 * rule is in `settings-drawer.test.tsx`.
 */

let unmount: (() => Promise<void>) | undefined;

async function arrive(): Promise<void> {
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  // The chrome loads on its own; the panel does not exist until it lands.
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
}

/** Closes the page and opens it again, which is the whole thing under test. */
async function comeBack(): Promise<void> {
  await unmount?.();
  unmount = undefined;
  await cleanup();
  await arrive();
}

function open(): boolean {
  return document.querySelector('.pico-sidebar[data-open="true"]') !== null;
}

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  await arrive();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

it("starts closed for someone who has never opened it", () => {
  expect(open()).toBe(false);
});

it("comes back open when that is how it was left", async () => {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.poll(open).toBe(true);

  await comeBack();
  // Already open on the first frame, rather than opening one frame later:
  // restoring a layout late is the same thing as changing it under someone who
  // has just arrived.
  expect(open()).toBe(true);
});

it("comes back closed once it has been closed again", async () => {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.poll(open).toBe(true);
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect.poll(open).toBe(false);

  await comeBack();
  expect(open()).toBe(false);
});
