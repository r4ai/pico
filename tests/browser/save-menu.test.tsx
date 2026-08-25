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

  // Touching, which is the whole of what says so: the dock sets everything
  // else a gap apart.
  const [save, chevron] = [...group.querySelectorAll("button")].map((button) =>
    button.getBoundingClientRect(),
  );
  if (!save || !chevron) throw new Error("the split button has lost a half");
  expect(chevron.left - save.right).toBeLessThan(1);
});

it("is dressed as one of the dock's buttons and not as its own thing", async () => {
  const group = document.querySelector(".pico-split");
  if (!(group instanceof HTMLElement)) throw new Error("the split button is missing");

  // Save is the one action nobody needs pointing out, and a surface of its own
  // in a row of transparent buttons is what pointing it out looks like.
  const style = getComputedStyle(group);
  expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(style.boxShadow).toBe("none");

  // Down to the corners: a radius the dock does not use anywhere else is the
  // same difference drawn more quietly.
  const copy = page.getByRole("button", { name: "Copy" }).element();
  const save = group.querySelector("button");
  if (!(copy instanceof HTMLElement) || !save) throw new Error("the dock is missing a button");
  expect(getComputedStyle(save).borderRadius).toBe(getComputedStyle(copy).borderRadius);
});
