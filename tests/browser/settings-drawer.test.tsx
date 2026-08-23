import { App } from "@/app";
import "@/global.css";
import { SIDEBAR_INSET_QUERY } from "@/features/settings/use-sidebar-mode";
import { createStore, Provider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * The settings where the window is too narrow to give them a column: they lie
 * over the picture behind a scrim, which makes them modal, and this instance
 * runs narrow enough for that to be true. See `vite.browser.config.ts`.
 */

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  expect(window.matchMedia(SIDEBAR_INSET_QUERY).matches).toBe(false);
  window.history.replaceState(null, "", window.location.pathname);
  // A store per test: the sidebar's open state is a module-level atom, and
  // left shared it arrives at the next test already open.
  const rendered = await render(
    <Provider store={createStore()}>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </Provider>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function canvas(): HTMLElement {
  const element = document.querySelector(".pico-shell-canvas > div");
  if (!(element instanceof HTMLElement)) throw new Error("the canvas is missing");
  return element;
}

async function openSettings(): Promise<void> {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();
  // The dock and the toggle leave the tab order with the fade that takes them
  // off the screen, rather than a beat before it.
  await expect.poll(() => getComputedStyle(dock()).visibility).toBe("hidden");
}

function dock(): HTMLElement {
  const element = document.querySelector(".pico-shell-dock");
  if (!(element instanceof HTMLElement)) throw new Error("the dock is missing");
  return element;
}

it("is a dialog while it covers the picture", async () => {
  const panel = document.querySelector(".pico-sidebar");
  expect(panel?.getAttribute("role")).toBe("dialog");
  expect(panel?.getAttribute("aria-modal")).toBe("true");
  expect(panel?.getAttribute("aria-labelledby")).toBeTruthy();
});

it("takes the canvas out of the keyboard's reach, and gives it back", async () => {
  expect(canvas().hasAttribute("inert")).toBe(false);

  await openSettings();
  // The scrim already swallows every click on the picture. Without this the
  // keyboard walked straight past it into an editor nobody can see.
  expect(canvas().hasAttribute("inert")).toBe(true);
  expect(document.querySelector(".pico-shell-canvas")?.getAttribute("tabindex")).toBe("-1");

  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  expect(canvas().hasAttribute("inert")).toBe(false);
});

it("keeps Tab out of everything it covers", async () => {
  await openSettings();

  const visited: string[] = [];
  for (let step = 0; step < 14; step++) {
    await userEvent.keyboard("{Tab}");
    const landed = document.activeElement;
    // Tab passes through <body> on its way round the document; what matters is
    // that it never comes down anywhere behind the scrim.
    if (landed instanceof HTMLElement && landed !== document.body) {
      visited.push(landed.getAttribute("aria-label") ?? landed.tagName);
      expect(landed.closest(".pico-shell-canvas, .pico-shell-dock")).toBeNull();
    }
  }
  // And that it does come down somewhere: a run that focused nothing would
  // pass the check above without proving anything.
  expect(visited.length).toBeGreaterThan(0);
});

it("offers the scrim to the pointer only", async () => {
  await openSettings();
  const scrim = document.querySelector(".pico-sidebar-scrim");
  expect(scrim?.getAttribute("aria-hidden")).toBe("true");
  expect(scrim?.getAttribute("tabindex")).toBe("-1");
});

it("does not render every font-picker label in its webfont", async () => {
  await openSettings();
  await page.getByRole("combobox", { name: "Font" }).click();
  await expect.element(page.getByRole("option", { name: "Geist Mono" })).toBeInTheDocument();

  expect(document.querySelectorAll('[role="option"] [style*="font-family"]').length).toBe(0);
});
