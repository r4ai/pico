import { App } from "@/app";
import "@/global.css";
import { createStore, Provider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

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
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function popover(): HTMLElement {
  const element = document.querySelector('[data-slot="combobox-content"]');
  if (!(element instanceof HTMLElement)) throw new Error("the list is not open");
  return element;
}

function options(): HTMLElement[] {
  return [...popover().querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];
}

async function openPicker(): Promise<void> {
  await page.getByRole("combobox", { name: "Language" }).click();
  await expect.poll(() => document.querySelector('[data-slot="combobox-content"]')).toBeTruthy();
}

/**
 * Types a query into the open field.
 *
 * `fill` rather than `userEvent.keyboard`, which focuses the element again for
 * every character — and the field selects its own text when focus arrives, so
 * each keystroke would land on top of the last one and only the final letter
 * would survive.
 */
async function search(query: string): Promise<void> {
  await page.getByRole("combobox", { name: "Language" }).fill(query);
  await expect
    .poll(() => document.querySelector<HTMLInputElement>('input[aria-label="Language"]')?.value)
    .toBe(query);
}

function lang(): string | null {
  return new URLSearchParams(window.location.search).get("lang");
}

it("opens as a list rather than a screenful", async () => {
  await openPicker();
  // React Aria writes its own max-height inline, from the room between the
  // field and the edge of the window; unasked, 243 languages filled it.
  await expect.poll(() => Math.round(popover().getBoundingClientRect().height)).toBe(288);
});

it("stays the size it opened at", async () => {
  await openPicker();
  await expect.poll(() => Math.round(popover().getBoundingClientRect().width)).toBe(256);

  // A virtualized list has no intrinsic width — its rows are positioned
  // absolutely — so shrink-to-fit around one ratchets outwards. This picker
  // opened at 376px, passed 950px a moment later, and filled the window.
  const settled = Math.round(popover().getBoundingClientRect().width);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  expect(Math.round(popover().getBoundingClientRect().width)).toBe(settled);
  expect(Math.round(popover().getBoundingClientRect().height)).toBe(288);
});

it("opens at the language it is already showing", async () => {
  await openPicker();

  await expect
    .poll(() => {
      const selected = options().find((option) => option.hasAttribute("data-selected"));
      if (!selected) return false;
      const list = popover().getBoundingClientRect();
      const row = selected.getBoundingClientRect();
      return row.top >= list.top - 1 && row.bottom <= list.bottom + 1;
    })
    .toBe(true);

  const selected = options().find((option) => option.hasAttribute("data-selected"));
  expect(selected?.textContent).toBe("TSX");
});

it("puts the keyboard on the first match as you type, so Enter takes it", async () => {
  await openPicker();
  await search("rust");
  await expect.poll(() => options().map((option) => option.textContent)).toEqual(["Rust"]);

  // The list was already open before the first keystroke, so filtering it
  // never moved the keyboard: Enter used to commit nothing and reset the field.
  await expect.poll(() => options()[0]?.hasAttribute("data-focused")).toBe(true);

  await userEvent.keyboard("{Enter}");
  await expect.poll(lang).toBe("rust");
});

it("leaves the keyboard where the arrow keys put it", async () => {
  await openPicker();
  await search("type");
  await expect.poll(() => options().length).toBeGreaterThan(1);

  const first = options()[0]?.textContent;
  await userEvent.keyboard("{ArrowDown}");
  await expect
    .poll(() => options().find((o) => o.hasAttribute("data-focused"))?.textContent)
    .not.toBe(first);
});
