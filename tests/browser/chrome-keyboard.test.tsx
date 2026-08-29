import { App } from "@/app";
import "@/global.css";
import { SIDEBAR_INSET_QUERY } from "@/features/settings/use-sidebar-mode";
import { BottomDock } from "@/features/toolbar/bottom-dock";
import type { ExportTask } from "@/features/export/use-export";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

async function renderDock(running: ExportTask | undefined): Promise<void> {
  const rendered = await render(
    <BottomDock
      copied={false}
      lang="tsx"
      linkCopied={false}
      onCopy={() => {}}
      onCopyLink={() => {}}
      onLangChange={() => {}}
      onSave={() => {}}
      onScaleChange={() => {}}
      running={running}
      scale={2}
    />,
  );
  unmount = rendered.unmount;
}

async function renderApp(): Promise<void> {
  window.history.replaceState(null, "", window.location.pathname);
  // The sidebar remembers whether it was open, and these tests share a page:
  // left behind, the panel arrives at the next test already open.
  window.localStorage.clear();
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  // The chrome is loaded on its own; there is nothing to reach until it lands.
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
}

it("keeps the keyboard on a dock button that is busy", async () => {
  await renderDock("copy");

  const copy = document.querySelector<HTMLButtonElement>('button[aria-disabled="true"]');
  expect(copy).not.toBeNull();
  // `disabled` is what loses the keyboard: a browser will not keep focus on an
  // element it no longer considers focusable, so pressing Copy used to drop
  // you at the top of the document for as long as the capture ran.
  expect(copy?.hasAttribute("disabled")).toBe(false);

  copy?.focus();
  expect(document.activeElement).toBe(copy);
});

it("says out loud what the spinner is doing", async () => {
  await renderDock("save");
  expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain("Saving");
});

it("goes quiet again once the capture is over", async () => {
  await renderDock(undefined);
  expect(document.querySelector('button[aria-disabled="true"]')).toBeNull();
  expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe("");
});

it("is a region beside the picture at this width, not a dialog over it", async () => {
  expect(window.matchMedia(SIDEBAR_INSET_QUERY).matches).toBe(true);
  await renderApp();

  const panel = document.querySelector(".pico-sidebar");
  expect(panel?.getAttribute("role")).toBe("complementary");
  expect(panel?.getAttribute("aria-modal")).toBeNull();
  expect(panel?.getAttribute("aria-labelledby")).toBeTruthy();
});

it("leaves the picture editable while the settings are beside it", async () => {
  await renderApp();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();

  expect(document.querySelector(".pico-shell-canvas > div[inert]")).toBeNull();
  expect(document.querySelector(".pico-shell-canvas")?.getAttribute("tabindex")).toBe("0");
});

it("takes the button that opens the settings out of the tab order", async () => {
  await renderApp();
  const toggle = document.querySelector(".pico-sidebar-toggle");
  if (!(toggle instanceof HTMLElement)) throw new Error("the settings toggle is missing");
  expect(getComputedStyle(toggle).visibility).toBe("visible");

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();

  // visibility, not `inert`: React Aria writes `inert` onto the top of the page
  // while a popover is open and restores what it found there when it closes,
  // which would hand this button back to the keyboard behind React's back.
  // It waits for the fade, so that the fade can be seen at all.
  await expect.poll(() => getComputedStyle(toggle).visibility).toBe("hidden");
});

it("gives the keyboard back to the button that opened the settings", async () => {
  await renderApp();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();

  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Open settings");
});

it("keeps the closed settings out of the tab order once a popover has been open", async () => {
  await renderApp();

  // React Aria hides everything outside an open popover and puts back what it
  // found on close — and what it puts back is not what React last rendered, so
  // an `inert` written to the panel itself would come off here. It lives one
  // level in, on the box the panel holds, which React Aria never reaches.
  await page.getByRole("combobox", { name: "Language" }).click();
  await expect.poll(() => document.querySelector('[data-slot="combobox-content"]')).toBeTruthy();
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => document.querySelector('[data-slot="combobox-content"]')).toBeNull();

  expect(document.querySelector(".pico-sidebar")?.hasAttribute("inert")).toBe(false);
  expect(document.querySelector(".pico-sidebar-body")?.hasAttribute("inert")).toBe(true);

  for (let step = 0; step < 12; step++) {
    await userEvent.keyboard("{Tab}");
    // A close button, a theme field and every preset, all off the left edge of
    // the window.
    expect(document.activeElement?.closest(".pico-sidebar")).toBeNull();
  }
});
