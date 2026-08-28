import { App } from "@/app";
import "@/global.css";
import { SIDEBAR_INSET_QUERY } from "@/features/settings/use-sidebar-mode";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * The drawer can be pushed off the side with a finger.
 *
 * This instance runs narrow enough for the settings to be a drawer at all; see
 * `vite.browser.config.ts`. Beside the picture there is nothing to push the
 * panel off, and the gesture is not bound.
 */

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  expect(window.matchMedia(SIDEBAR_INSET_QUERY).matches).toBe(false);
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

function panel(): HTMLElement {
  const element = document.querySelector(".pico-sidebar");
  if (!(element instanceof HTMLElement)) throw new Error("the panel is missing");
  return element;
}

async function openSettings(): Promise<void> {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();
  // It slides in from off the left edge, and a panel still on its way is not
  // one anybody is dragging yet.
  await expect.poll(() => panel().getBoundingClientRect().left).toBeGreaterThan(0);
}

let nextPointer = 1;

type Drag = {
  /** How far, and which way. Negative is towards the edge it leaves by. */
  dx: number;
  /** Milliseconds the drag takes. A short one is a flick. */
  over?: number;
  /**
   * How many moves it is made of.
   *
   * Release velocity starts at the penultimate point, so this decides how much
   * distance that sample spans without hiding a pause before pointerup.
   */
  steps?: number;
  /** Milliseconds the finger stays still after its last move. */
  releaseAfter?: number;
  dy?: number;
  /** Left mid-drag rather than let go of, the way a browser cancels one. */
  cancel?: boolean;
};

/**
 * Drags the panel, as a finger.
 *
 * Synthetic pointer events, because a browser test can drive a real one only
 * as a tap. What the gesture is made of — where it starts, which way it
 * commits, and how fast it was going when it was let go — is all in the event
 * stream, and all of it is here.
 */
async function drag({
  dx,
  over = 200,
  steps = 8,
  releaseAfter = 0,
  dy = 0,
  cancel = false,
}: Drag): Promise<void> {
  const element = panel();
  const box = element.getBoundingClientRect();
  const startX = box.left + box.width / 2;
  const startY = box.top + box.height / 2;
  const pointerId = nextPointer++;
  const send = (type: string, x: number, y: number) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId,
        pointerType: "touch",
        isPrimary: true,
      }),
    );

  send("pointerdown", startX, startY);
  for (let step = 1; step <= steps; step++) {
    send("pointermove", startX + (dx * step) / steps, startY + (dy * step) / steps);
    await new Promise((resolve) => setTimeout(resolve, over / steps));
  }
  await new Promise((resolve) => setTimeout(resolve, releaseAfter));
  if (cancel) send("pointercancel", startX + dx, startY + dy);
  else send("pointerup", startX + dx, startY + dy);
}

function offset(): string {
  return panel().style.getPropertyValue("--pico-drawer-offset");
}

it("follows the finger", async () => {
  await openSettings();
  const element = panel();
  const box = element.getBoundingClientRect();

  const pointerId = nextPointer++;
  const send = (type: string, x: number) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: box.top + 40,
        pointerId,
        pointerType: "touch",
        isPrimary: true,
      }),
    );

  const startX = box.left + box.width / 2;
  send("pointerdown", startX);
  send("pointermove", startX - 60);

  // Written straight to the panel rather than transitioned to: under a finger
  // it is a sheet being pushed, not a box being sent somewhere.
  expect(element.dataset.dragging).toBe("true");
  expect(offset()).toBe("-60px");
  expect(getComputedStyle(element).transitionProperty).toBe("none");

  // And what is behind it comes back as it goes, rather than all at once.
  const scrim = document.querySelector(".pico-sidebar-scrim");
  if (!(scrim instanceof HTMLElement)) throw new Error("the scrim is missing");
  expect(Number(scrim.style.getPropertyValue("--pico-drawer-progress"))).toBeCloseTo(
    1 - 60 / box.width,
    2,
  );

  send("pointerup", startX - 60);
});

it("lets go when it has been pushed far enough", async () => {
  await openSettings();
  await drag({ dx: -Math.round(panel().getBoundingClientRect().width * 0.6) });

  await expect.poll(() => panel().dataset.open).toBe("false");
  await expect.element(page.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
});

it("lets go for a flick that never travelled far", async () => {
  await openSettings();
  // Well short of the four tenths of its width that would let go on distance
  // alone, and fast: two moves of thirty pixels about ten milliseconds apart.
  // Written as few large steps rather than many small ones so the final sample
  // keeps enough distance to remain a flick on a loaded machine.
  await drag({ dx: -60, over: 20, steps: 2 });

  await expect.poll(() => panel().dataset.open).toBe("false");
});

it("springs back when a short flick stops before release", async () => {
  await openSettings();
  await drag({ dx: -60, over: 20, steps: 2, releaseAfter: 500 });

  expect(panel().dataset.open).toBe("true");
  expect(offset()).toBe("0px");
  expect(panel().dataset.dragging).toBeUndefined();
});

it("springs back from a push that stopped short", async () => {
  await openSettings();
  // Slowly, so it is a push that changed its mind rather than a flick.
  await drag({ dx: -30, over: 600 });

  expect(panel().dataset.open).toBe("true");
  expect(offset()).toBe("0px");
  expect(panel().dataset.dragging).toBeUndefined();
});

it("gives back most of a push the wrong way", async () => {
  await openSettings();
  const element = panel();
  const box = element.getBoundingClientRect();
  const pointerId = nextPointer++;
  const send = (type: string, x: number) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: box.top + 40,
        pointerId,
        pointerType: "touch",
        isPrimary: true,
      }),
    );

  const startX = box.left + box.width / 2;
  send("pointerdown", startX);
  send("pointermove", startX + 100);

  // An edge that does not move at all reads as a panel that has stopped
  // responding; one that moves the whole way reads as an edge that is not one.
  expect(Number.parseFloat(offset())).toBeGreaterThan(0);
  expect(Number.parseFloat(offset())).toBeLessThan(30);

  send("pointerup", startX + 100);
  expect(panel().dataset.open).toBe("true");
});

it("leaves a scroll alone", async () => {
  await openSettings();
  await drag({ dx: -12, dy: -80 });

  // The settings are a column that scrolls, and a drag has to be committed to
  // sideways before it takes the panel with it.
  expect(panel().dataset.open).toBe("true");
  expect(panel().dataset.dragging).toBeUndefined();
  expect(offset()).toBe("");
});

it("puts the panel back when the browser takes the gesture away", async () => {
  await openSettings();
  await drag({ dx: -70, cancel: true });

  expect(panel().dataset.open).toBe("true");
  expect(offset()).toBe("0px");
  expect(panel().dataset.dragging).toBeUndefined();
});

it("leaves no offset behind for the arrangement that follows", async () => {
  await openSettings();
  await drag({ dx: -Math.round(panel().getBoundingClientRect().width * 0.6) });
  await expect.poll(() => panel().dataset.open).toBe("false");

  // A dismissal ends with the panel written to where the closed state puts it,
  // and that offset has to go before anything opens again — including when
  // what opens is not a drawer. Widen the window past the breakpoint after a
  // swipe and the gesture is not bound any more, so an offset left here is one
  // nothing will clear: the inset panel comes up translated off the side of
  // the window, unreachable and no longer swipeable.
  await expect.poll(offset).toBe("");
});

it("opens again where it started", async () => {
  await openSettings();
  await drag({ dx: -Math.round(panel().getBoundingClientRect().width * 0.6) });
  await expect.poll(() => panel().dataset.open).toBe("false");

  // The dismissal leaves the panel written off-screen, and an open that
  // inherited that offset would be a panel that never came back.
  await openSettings();
  expect(offset()).toBe("");
  expect(Math.round(panel().getBoundingClientRect().left)).toBeGreaterThan(0);
});
