import { App } from "@/app";
import { CODE_PARAM } from "@/features/settings/search-params";
import { fontFaceCss } from "@/features/settings/fonts";
import { encodeCode } from "@/lib/url-codec";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * Nothing on this page moves that was not asked to move.
 *
 * Every geometry change Pico makes is a transition somebody started, and a
 * transition is not a layout shift: the browser only counts an element that was
 * in one place in one frame and another place in the next without an animation
 * saying so. What these watch for is the other kind — a frame arriving at the
 * wrong size and springing back, a control that resizes as its text lands, a
 * panel that pushes the picture as it opens.
 */

/** A snippet long enough that the frame has a shape to get wrong. */
const SNIPPET = Array.from(
  { length: 12 },
  (_line, index) => `export const handler${index} = (input: Request) => new Response("${index}");`,
).join("\n");

let unmount: (() => Promise<void>) | undefined;
let shifts: { value: number; sources: string[] }[];
let observer: PerformanceObserver | undefined;

/**
 * Below this a shift is a rounding difference rather than something moving:
 * Chrome scores by fraction of the viewport, and 0.001 of a 1280x900 window is
 * a strip about a pixel tall.
 */
const NOISE = 0.001;

/**
 * The part of a `layout-shift` entry this file reads.
 *
 * Declared here because the DOM lib does not: the entry is standard in Chrome
 * and nowhere in TypeScript's `PerformanceEntry` union.
 */
type LayoutShiftEntry = PerformanceEntry & {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly sources: readonly { readonly node: Node | null }[];
};

function describe(entry: LayoutShiftEntry): string[] {
  return entry.sources.map((source) => {
    const node = source.node;
    if (!(node instanceof Element)) return "detached";
    const className = node.getAttribute("class") ?? "";
    return `${node.tagName.toLowerCase()}.${className.split(/\s+/).slice(0, 2).join(".")}`;
  });
}

/**
 * Whether a shift is nothing but a popover keeping itself on screen.
 *
 * An open list is `position: absolute` over the page and gets shorter as it is
 * filtered, so React Aria moves it to keep it against the field it belongs to.
 * The browser scores that as a shift because the box did move, and it is the
 * one kind that moves nothing else: what these tests are about is whether the
 * page underneath it moved, which is a different question.
 */
function isPopoverKeepingUp(entry: LayoutShiftEntry): boolean {
  const nodes = entry.sources.map((source) => source.node);
  return (
    nodes.length > 0 &&
    nodes.every((node) => node instanceof Element && node.closest('[data-slot="combobox-content"]'))
  );
}

/** What moved, for a failure that has to be actionable. */
function report(): string {
  return shifts.map((shift) => `${shift.value.toFixed(4)} ${shift.sources.join(", ")}`).join("\n");
}

beforeEach(async () => {
  // Arriving at a link with code in it, which is the load worth watching: the
  // frame has a shape from the first frame, and everything that lands after it
  // — the chrome, the editor, the font, the colours — has the chance to be a
  // different shape. Typed in instead, the frame growing under the typing is a
  // shift Chrome counts and a reader asked for.
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${CODE_PARAM}=${encodeCode(SNIPPET)}`,
  );
  window.localStorage.clear();
  const fonts = document.createElement("style");
  fonts.dataset.testFonts = "";
  fonts.textContent = fontFaceCss();
  document.head.append(fonts);

  shifts = [];
  observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as LayoutShiftEntry[]) {
      if (entry.hadRecentInput || entry.value < NOISE) continue;
      if (isPopoverKeepingUp(entry)) continue;
      shifts.push({ value: entry.value, sources: describe(entry) });
    }
  });
  observer.observe({ type: "layout-shift", buffered: true });

  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  observer?.disconnect();
  observer = undefined;
  await unmount?.();
  unmount = undefined;
  await cleanup();
  document.querySelector("style[data-test-fonts]")?.remove();
});

/**
 * Everything that arrives after the first paint: the chrome, the editor, the
 * font, and the colours. Each of them is a chance for something already on
 * screen to be a different size a frame later.
 */
async function everythingArrives(): Promise<void> {
  await expect.element(page.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  await expect.element(page.getByRole("textbox", { name: "Code" })).toBeInTheDocument();
  // Coloured, which is the last thing to land and the one that rebuilds every
  // line in the document.
  await expect
    .poll(() => document.querySelector(".pico-lines span")?.getAttribute("style"))
    .toBeTruthy();
  await new Promise((resolve) => setTimeout(resolve, 700));
}

it("arrives without moving anything", async () => {
  await everythingArrives();

  // The chrome is `position: fixed`, so arriving late moves nothing; the frame
  // is held back until it can be painted in its own font, and the editor is
  // swapped in under the reader at the size the static rendering already had.
  // Anything at all, named: a layout shift here is a bug with an address.
  expect(report()).toBe("");
});

it("stops moving when the settings action is over", async () => {
  await everythingArrives();

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("radiogroup", { name: "Padding" })).toBeInTheDocument();

  for (const [group, option] of [
    ["Padding", "XL"],
    ["Size", "18"],
    ["Corners", "L"],
    ["Shadow", "L"],
    ["Appearance", "Light"],
  ] as const) {
    await page
      .getByRole("radiogroup", { name: group })
      .getByRole("radio", { name: option })
      .click();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Through the label, which is what a pointer lands on: the input itself is
  // underneath it, and Playwright refuses a click it can see being intercepted.
  const lineNumbers = document.querySelector('[data-slot="switch"]');
  if (!(lineNumbers instanceof HTMLElement)) throw new Error("the line numbers switch is missing");
  await userEvent.click(lineNumbers);
  await expect
    .poll(() => new URLSearchParams(window.location.search).get("lineNumbers"))
    .toBe("true");
  await new Promise((resolve) => setTimeout(resolve, 700));

  // Every one of those is a transition somebody started, and the picture
  // easing to a new size is the point of them. What must not happen is one
  // more move after the easing is over — the frame holding a stale height and
  // then collapsing into the right one in a single frame, which is what a
  // CodeMirror left unmeasured used to do on the way down.
  shifts = [];
  await new Promise((resolve) => setTimeout(resolve, 1200));

  expect(report()).toBe("");
});

it("does not move the dock while a language is picked", async () => {
  await everythingArrives();
  shifts = [];

  const field = page.getByRole("combobox", { name: "Language" });
  await field.click();
  await field.fill("rust");
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => new URLSearchParams(window.location.search).get("lang")).toBe("rust");
  await new Promise((resolve) => setTimeout(resolve, 500));

  // The dock itself does re-centre: the language field is as wide as the text
  // it shows, "Rust" is not "TSX", and the dock is centred on the canvas. That
  // is the design, it is `position: fixed`, and it moves nothing else — which
  // is what this is watching for.
  expect(report()).toBe("");
});
