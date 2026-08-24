import { App } from "@/app";
import { fontFaceCss } from "@/features/settings/fonts";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;
let started: number;
/** What the root was carrying at the moment each transition began. */
let reveals: { marked: string | undefined; x: string; y: string; radius: string }[];
let restore: (() => void) | undefined;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  // The sidebar remembers whether it was open, and these tests share a page:
  // left behind, the panel arrives at the next test already open.
  window.localStorage.clear();
  const fonts = document.createElement("style");
  fonts.dataset.testFonts = "";
  fonts.textContent = fontFaceCss();
  document.head.append(fonts);

  started = 0;
  reveals = [];
  const original = document.startViewTransition.bind(document);
  document.startViewTransition = (...args) => {
    started++;
    // Read here rather than after: the marker comes off as the transition
    // finishes, which is well before an assertion could look for it.
    const root = document.documentElement;
    reveals.push({
      marked: root.dataset.picoReveal,
      x: root.style.getPropertyValue("--pico-reveal-x"),
      y: root.style.getPropertyValue("--pico-reveal-y"),
      radius: root.style.getPropertyValue("--pico-reveal-radius"),
    });
    return original(...args);
  };
  restore = () => {
    document.startViewTransition = original;
  };

  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("radiogroup", { name: "Padding" })).toBeInTheDocument();
  // The panel slides in from off the left edge, and a control on a panel still
  // on its way is a control outside the window.
  await expect
    .poll(() => document.querySelector(".pico-sidebar")?.getBoundingClientRect().left ?? -1)
    .toBeGreaterThan(0);
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

it("grows light and dark out of the switch that asked for them", async () => {
  await setAppearance("Light");
  started = 0;
  reveals = [];

  const group = page.getByRole("radiogroup", { name: "Appearance" }).element();
  if (!(group instanceof HTMLElement)) throw new Error("the appearance row is missing");
  const box = group.getBoundingClientRect();

  await setAppearance("Dark");

  // A change somebody pointed at has somewhere to come from, and arriving from
  // under the control that asked for it is a thing that happened rather than a
  // thing that faded.
  expect(started).toBe(1);
  const reveal = reveals[0];
  expect(reveal?.marked).toBe("true");
  expect(Number.parseFloat(reveal?.x ?? "")).toBeCloseTo(box.left + box.width / 2, 0);
  expect(Number.parseFloat(reveal?.y ?? "")).toBeCloseTo(box.top + box.height / 2, 0);

  // Far enough to cover the furthest corner of the window, or the last frame
  // of the reveal is a circle with the old page still around it.
  const corners = [
    Math.hypot(reveal ? Number.parseFloat(reveal.x) : 0, reveal ? Number.parseFloat(reveal.y) : 0),
    Math.hypot(
      window.innerWidth - (reveal ? Number.parseFloat(reveal.x) : 0),
      window.innerHeight - (reveal ? Number.parseFloat(reveal.y) : 0),
    ),
  ];
  expect(Number.parseFloat(reveal?.radius ?? "")).toBeGreaterThanOrEqual(Math.max(...corners) - 1);
});

it("takes the marker off again, so the next dissolve is a dissolve", async () => {
  await setAppearance("Light");
  await expect.poll(() => document.documentElement.dataset.picoReveal).toBeUndefined();
});

it("survives a change that interrupts another", async () => {
  // A change inside a fade skips the one it interrupts, whose `finished` then
  // rejects rather than resolving. What is held here is that the interrupted
  // transition's tidying up does not land on the one that replaced it; see the
  // ticket in `crossFade`, which is what makes that true in the case this
  // cannot reach — a dissolve interrupted by a reveal, where the marker the
  // second one just wrote is the thing at stake.
  const group = page.getByRole("radiogroup", { name: "Appearance" });
  await group.getByRole("radio", { name: "Light" }).click();
  await group.getByRole("radio", { name: "Dark" }).click();

  await expect.poll(() => reveals.length).toBeGreaterThanOrEqual(1);
  expect(reveals.at(-1)?.marked).toBe("true");
  expect(document.documentElement.dataset.picoReveal).toBe("true");

  await expect.poll(() => document.documentElement.dataset.picoReveal).toBeUndefined();
});

/**
 * A theme this test warms itself, so that switching back to Vitesse is a switch
 * between two themes the highlighter already holds. Deliberately not the one
 * the cold-theme test above depends on being cold.
 */
const WARMED_BY_THIS_TEST = "Gruvbox";

/**
 * Picks a theme by typing its name and pressing Enter.
 *
 * Rather than by clicking a row: the list scrolls itself to whatever is
 * selected as it opens, so on the second visit the row a click was aimed at is
 * still moving when the click lands.
 */
async function pickTheme(name: string): Promise<void> {
  const field = page.getByRole("combobox", { name: "Theme" });
  await field.click();
  await field.fill(name);
  await expect
    .poll(() => document.querySelector<HTMLInputElement>('input[aria-label="Theme"]')?.value)
    .toBe(name);
  await userEvent.keyboard("{Enter}");
}

it("dissolves a theme rather than growing it from a list", async () => {
  const before = exportBackground();
  await pickTheme(WARMED_BY_THIS_TEST);
  await settle(before);

  started = 0;
  reveals = [];
  const warm = exportBackground();
  await pickTheme("Vitesse");
  await settle(warm);

  // A name in a list of names has nowhere to grow from, and a circle out of the
  // middle of the window is a transition with an opinion about where you were
  // looking.
  expect(started).toBe(1);
  expect(reveals[0]?.marked).toBeUndefined();
});
