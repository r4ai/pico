import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * A button on glass has to answer the pointer.
 *
 * The stock ghost hover is a wash of `--muted`, which at the tint the panels
 * carry composites to within a percent of the surface underneath it — in dark
 * mode it is a shade darker than the panel, so hovering made the button very
 * slightly harder to see. What is held here is that the hover is a change the
 * eye can find, not which colour it happens to be.
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

/** How far apart two composited colours are, in straight channel distance. */
function distance(a: string, b: string): number {
  const channels = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
  const [ar = 0, ag = 0, ab = 0, aa = 1] = channels(a);
  const [br = 0, bg = 0, bb = 0, ba = 1] = channels(b);
  return Math.abs(ar * aa - br * ba) + Math.abs(ag * aa - bg * ba) + Math.abs(ab * aa - bb * ba);
}

it("lights the settings close button under the pointer", async () => {
  await page.getByRole("button", { name: "Open settings" }).click();
  const close = document.querySelector(".pico-sidebar-close");
  if (!(close instanceof HTMLElement)) throw new Error("the close button is missing");

  const title = document.querySelector(".pico-sidebar h2");
  if (!(title instanceof HTMLElement)) throw new Error("the panel has no title");
  // Somewhere on the panel that is not the button, so what is measured next is
  // the button at rest rather than the button the pointer happens to be on.
  await userEvent.hover(title);
  await expect.poll(() => close.getAttribute("data-hovered")).toBe(null);
  const rest = getComputedStyle(close).backgroundColor;

  await userEvent.hover(close);
  await expect.poll(() => close.getAttribute("data-hovered")).toBe("true");

  // The wash it used to wear was within a percent of the panel it sits on.
  await expect
    .poll(() => {
      for (const animation of close.getAnimations()) animation.finish();
      return distance(getComputedStyle(close).backgroundColor, rest);
    })
    .toBeGreaterThan(0.02);

  // And the cross turns under the pointer, which is the part that is felt
  // before it is seen.
  const cross = close.querySelector("svg");
  if (!cross) throw new Error("the close button has no cross");
  await expect
    .poll(() => {
      for (const animation of cross.getAnimations()) animation.finish();
      return getComputedStyle(cross).rotate;
    })
    .toBe("90deg");
});

it("lights a dock button under the pointer", async () => {
  const copy = page.getByRole("button", { name: "Copy" });
  const element = copy.element();
  if (!(element instanceof HTMLElement)) throw new Error("the copy button is missing");

  const rest = getComputedStyle(element).backgroundColor;
  await userEvent.hover(element);
  await expect.poll(() => element.getAttribute("data-hovered")).toBe("true");

  await expect
    .poll(() => {
      // The wash eases in, and a headless browser does not always advance a
      // transition on its own; the value under test is where it lands.
      for (const animation of element.getAnimations()) animation.finish();
      return distance(getComputedStyle(element).backgroundColor, rest);
    })
    .toBeGreaterThan(0.02);
});
