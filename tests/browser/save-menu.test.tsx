import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

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

/** An `Element`, not an `HTMLElement`: the chevron is an `<svg>`. */
function chevron(): Element {
  const element = document.querySelector(".pico-split-chevron");
  if (!element) throw new Error("the chevron is missing");
  return element;
}

it("says the menu is open while it is, and turns the chevron over", async () => {
  const trigger = page.getByRole("button", { name: "Save options" });
  await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
  expect(getComputedStyle(chevron()).rotate).toBe("none");

  await trigger.click();
  await expect.element(page.getByRole("menu")).toBeInTheDocument();
  await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
  // The menu opens upwards, and a chevron still pointing up while the list is
  // above it is pointing at nothing.
  await expect.poll(() => getComputedStyle(chevron()).rotate).toBe("180deg");
});

it("is one control rather than two buttons that happen to touch", async () => {
  const group = document.querySelector(".pico-split");
  if (!(group instanceof HTMLElement)) throw new Error("the split button is missing");
  expect(group.getAttribute("role")).toBe("group");

  // The seam is decoration: a `separator` announced inside one control would
  // say it is two.
  const seam = group.querySelector(".pico-split-seam");
  expect(seam?.getAttribute("aria-hidden")).toBe("true");
  expect(seam?.getAttribute("role")).toBeNull();
});
