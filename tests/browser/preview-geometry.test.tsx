import { App } from "@/app/app";
import { fontFaceCss } from "@/core/settings/fonts";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

const TRANSITION_MIDPOINT_MS = 130;
let unmount: (() => Promise<void>) | undefined;

function frame(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`${selector} is missing`);
  return element;
}

function liveFrame(): HTMLElement {
  return frame(".pico-shell-canvas .pico-frame");
}

function exportFrame(): HTMLElement {
  return frame(".pico-export-stage .pico-frame");
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function setCode(code: string): Promise<void> {
  await page.getByRole("textbox", { name: "Code" }).fill(code);
  await nextFrame();
  await nextFrame();
}

async function resizeFrameTo(
  targetWidth: number,
  pointerType: "mouse" | "touch" = "mouse",
): Promise<void> {
  const handle = frame(".pico-resize-handle");
  const stage = frame(".pico-canvas-stage");
  const canvas = frame(".pico-shell-canvas");
  const padding = Number.parseFloat(getComputedStyle(stage).paddingLeft);
  const viewportWidth =
    canvas.clientWidth - Number.parseFloat(getComputedStyle(canvas).paddingLeft);
  const stageLeft = stage.getBoundingClientRect().left;
  const targetRight =
    targetWidth <= viewportWidth - 2 * padding
      ? stageLeft + viewportWidth / 2 + targetWidth / 2
      : stageLeft + padding + targetWidth;
  const start = handle.getBoundingClientRect();
  const startX = start.left + start.width / 2;
  const pointerId = 42;
  const send = (type: string, clientX: number) =>
    handle.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: start.top + start.height / 2,
        pointerId,
        pointerType,
        isPrimary: true,
      }),
    );

  send("pointerdown", startX);
  send("pointermove", targetRight);
  await expect.poll(() => liveFrame().getBoundingClientRect().width).toBe(targetWidth);
  expect(handle.querySelector(".pico-resize-readout")?.textContent).toBe(`${targetWidth} px`);
  expect(new URLSearchParams(window.location.search).has("width")).toBe(false);
  expect(
    handle.getBoundingClientRect().left + handle.getBoundingClientRect().width / 2,
  ).toBeCloseTo(targetRight, 0);
  send("pointerup", targetRight);
  await expect
    .poll(() => new URLSearchParams(window.location.search).get("width"))
    .toBe(String(targetWidth));
  await expect.poll(() => handle.querySelector(".pico-resize-readout")).toBeNull();
}

function codeWithLineCount(count: number): string {
  return Array.from(
    { length: count },
    (_, index) => `const value${index + 1} = alpha + beta;`,
  ).join("\n");
}

async function finishAnimations(element: HTMLElement): Promise<void> {
  await nextFrame();
  // CodeMirror's focused caret blinks forever; it has no end to finish.
  for (const animation of element.getAnimations({ subtree: true })) {
    if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish();
  }
  await nextFrame();
}

/**
 * Opens the settings, and waits for them to have finished arriving.
 *
 * The panel slides in from off the left edge, and a control on a panel that is
 * still on its way is a control outside the window — which is what Playwright
 * refuses to click, however forced.
 */
async function openSettings(): Promise<void> {
  if (!document.querySelector('.pico-sidebar[data-open="true"]')) {
    await page.getByRole("button", { name: "Open settings" }).click();
  }
  await expect.poll(() => frame(".pico-sidebar").getBoundingClientRect().left).toBeGreaterThan(0);
}

async function pauseAtMidpoint(element: HTMLElement): Promise<void> {
  await nextFrame();
  const animations = element
    .getAnimations({ subtree: true })
    .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime));
  expect(animations.length).toBeGreaterThan(0);
  for (const animation of animations) {
    animation.pause();
    animation.currentTime = TRANSITION_MIDPOINT_MS;
  }
  await nextFrame();
}

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  // The sidebar remembers whether it was open, and these tests share a page:
  // left behind, the panel arrives at the next test already open.
  window.localStorage.clear();
  const fonts = document.createElement("style");
  fonts.dataset.testFonts = "";
  fonts.textContent = fontFaceCss();
  document.head.append(fonts);

  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await openSettings();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
  document.querySelector("style[data-test-fonts]")?.remove();
  await page.viewport(1280, 900);
});

describe("preview geometry", () => {
  it("settles geometry without finishing a blinking caret", async () => {
    const caret = document.createElement("span");
    liveFrame().append(caret);
    const blink = caret.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      iterations: Infinity,
    });
    const transition = liveFrame().animate([{ opacity: 0 }, { opacity: 1 }], 1000);

    await pauseAtMidpoint(liveFrame());
    expect(transition.currentTime).toBe(TRANSITION_MIDPOINT_MS);
    expect(transition.playState).toBe("paused");
    expect(blink.playState).toBe("running");

    await finishAnimations(liveFrame());

    expect(transition.playState).toBe("finished");
    expect(blink.playState).toBe("running");
    blink.cancel();
    caret.remove();
  });

  it("does not animate initial state or ordinary code input", async () => {
    expect(liveFrame().dataset.animateGeometry).toBe("false");

    await setCode("x");
    expect(liveFrame().getBoundingClientRect().width).toBe(448);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );

    await setCode(`const message = "${"x".repeat(180)}";`);

    expect(liveFrame().dataset.animateGeometry).toBe("false");
    expect(liveFrame().getBoundingClientRect().width).toBeGreaterThan(448);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("sets a fixed frame width, wraps long lines with aligned numbers, and returns to auto", async () => {
    await setCode("short\nlast line");
    await page.getByRole("switch", { name: "Line numbers" }).click({ force: true });
    await finishAnimations(liveFrame());

    await resizeFrameTo(240);
    await finishAnimations(liveFrame());
    await setCode(`${"x".repeat(180)}\nlast line`);

    await expect.poll(() => new URLSearchParams(window.location.search).get("width")).toBe("240");
    expect(liveFrame().getBoundingClientRect().width).toBe(240);
    expect(exportFrame().getBoundingClientRect().width).toBe(240);
    const exportLines = exportFrame().querySelectorAll<HTMLElement>(".pico-line");
    const firstContent = exportLines[0]?.querySelector<HTMLElement>(".pico-line-content");
    const secondGutter = exportLines[1]?.querySelector<HTMLElement>(".pico-gutter");
    if (!firstContent || !secondGutter) throw new Error("wrapped lines or gutters are missing");
    expect(firstContent.getBoundingClientRect().height).toBeGreaterThan(40);
    const liveLines = liveFrame().querySelectorAll<HTMLElement>(".cm-line");
    expect(liveLines.length).toBe(2);
    expect(
      secondGutter.getBoundingClientRect().top - exportFrame().getBoundingClientRect().top,
    ).toBeCloseTo(
      liveLines[1]!.getBoundingClientRect().top - liveFrame().getBoundingClientRect().top,
      0,
    );

    await page.getByRole("button", { name: "Reset to auto" }).click();
    await finishAnimations(liveFrame());
    await expect.poll(() => new URLSearchParams(window.location.search).has("width")).toBe(false);
    expect(liveFrame().getBoundingClientRect().width).toBeGreaterThan(240);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("keeps trailing-space wraps aligned between the editor and export", async () => {
    await setCode(`${"x".repeat(13)}${" ".repeat(38)}\nnext`);
    await page.getByRole("switch", { name: "Line numbers" }).click({ force: true });
    frame(".pico-resize-handle").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Home" }),
    );
    await expect.poll(() => new URLSearchParams(window.location.search).get("width")).toBe("240");
    await finishAnimations(liveFrame());

    const liveLine = liveFrame().querySelectorAll<HTMLElement>(".cm-line")[1];
    const exportLine = exportFrame().querySelectorAll<HTMLElement>(".pico-line")[1];
    if (!liveLine || !exportLine) throw new Error("the second line is missing");
    expect(
      exportLine.getBoundingClientRect().top - exportFrame().getBoundingClientRect().top,
    ).toBeCloseTo(
      liveLine.getBoundingClientRect().top - liveFrame().getBoundingClientRect().top,
      0,
    );
  });

  it("resizes on a narrow screen and keeps the handle reachable", async () => {
    await page.viewport(390, 844);
    await page.getByRole("button", { name: "Close settings" }).click();
    await setCode("small frame");

    await resizeFrameTo(315, "touch");
    await finishAnimations(liveFrame());
    expect(exportFrame().getBoundingClientRect().width).toBe(315);
    expect(frame(".pico-resize-handle").getBoundingClientRect().right).toBeLessThan(390);
  });

  it("keeps the dragged edge under the pointer as the frame grows past the canvas", async () => {
    await setCode("wide frame");
    await resizeFrameTo(1200);
    expect(exportFrame().getBoundingClientRect().width).toBe(1200);
    expect(frame(".pico-shell-canvas").scrollWidth).toBeGreaterThan(
      frame(".pico-shell-canvas").clientWidth,
    );
  });

  it("lets a focused handle resize with the keyboard", async () => {
    const handle = page.getByRole("slider", { name: "Frame width" });
    await handle.click();
    await expect.element(handle).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect.poll(() => new URLSearchParams(window.location.search).get("width")).toBe("240");
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => new URLSearchParams(window.location.search).get("width")).toBe("260");
    await userEvent.keyboard("{ArrowRight}".repeat(4));
    await expect.poll(() => new URLSearchParams(window.location.search).get("width")).toBe("340");
    expect(liveFrame().getBoundingClientRect().width).toBe(340);
  });

  it("restores auto width when a drag is canceled", async () => {
    const handle = frame(".pico-resize-handle");
    const start = handle.getBoundingClientRect();
    const startX = start.left + start.width / 2;
    const send = (type: string, clientX: number) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          pointerId: 43,
          pointerType: "touch",
          isPrimary: true,
        }),
      );

    send("pointerdown", startX);
    send("pointermove", startX - 40);
    await expect.poll(() => liveFrame().getBoundingClientRect().width).toBeLessThan(448);
    send("pointercancel", startX - 40);
    await expect.poll(() => liveFrame().getBoundingClientRect().width).toBe(448);
    expect(new URLSearchParams(window.location.search).has("width")).toBe(false);
  });

  it("restores URL geometry directly at its final dimensions", async () => {
    await unmount?.();
    await cleanup();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?padding=xl&fontSize=xl&lineNumbers=true&width=240`,
    );
    const restored = await render(
      <NuqsAdapter>
        <App />
      </NuqsAdapter>,
    );
    unmount = restored.unmount;
    await nextFrame();
    await nextFrame();

    expect(liveFrame().dataset.animateGeometry).toBe("false");
    expect(Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft)).toBe(64);
    expect(Number.parseFloat(getComputedStyle(liveFrame()).fontSize)).toBe(18);
    expect(liveFrame().getBoundingClientRect().width).toBe(240);
    expect(frame(".pico-editor .cm-gutters").getBoundingClientRect().width).toBeGreaterThan(0);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("eases padding while keeping the live and export widths in sync", async () => {
    const padding = page.getByRole("radiogroup", { name: "Padding" });
    await padding.getByRole("radio", { name: "S" }).click();
    await finishAnimations(liveFrame());

    await padding.getByRole("radio", { name: "XL" }).click();
    await pauseAtMidpoint(liveFrame());

    const midpointPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    expect(midpointPadding).toBeGreaterThan(16);
    expect(midpointPadding).toBeLessThan(64);

    await finishAnimations(liveFrame());
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("keeps the line-number gutter mounted and eases its reveal", async () => {
    const gutter = frame(".pico-editor .cm-gutters");
    expect(gutter.getBoundingClientRect().width).toBe(0);
    expect(Number.parseFloat(getComputedStyle(gutter).opacity)).toBe(0);
    expect(gutter.getAttribute("aria-hidden")).toBe("true");

    await page.getByRole("switch", { name: "Line numbers" }).click({ force: true });
    await pauseAtMidpoint(liveFrame());

    const midpointWidth = gutter.getBoundingClientRect().width;
    const midpointOpacity = Number.parseFloat(getComputedStyle(gutter).opacity);
    expect(midpointWidth).toBeGreaterThan(0);
    expect(midpointOpacity).toBeGreaterThan(0);
    expect(midpointOpacity).toBeLessThan(1);
    expect(gutter.getAttribute("aria-hidden")).toBe("false");

    await finishAnimations(liveFrame());
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );

    const exportGutter = frame(".pico-export-stage .pico-gutter");
    const widths: number[] = [];
    for (const count of [9, 10, 99, 100]) {
      await setCode(codeWithLineCount(count));
      widths.push(gutter.getBoundingClientRect().width);
      expect(gutter.getBoundingClientRect().width).toBeCloseTo(
        exportGutter.getBoundingClientRect().width,
        1,
      );
      expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
        exportFrame().getBoundingClientRect().width,
        1,
      );
    }
    expect(widths[1]).toBeGreaterThan(widths[0] ?? Number.POSITIVE_INFINITY);
    expect(widths[2]).toBeCloseTo(widths[1] ?? 0, 1);
    expect(widths[3]).toBeGreaterThan(widths[2] ?? Number.POSITIVE_INFINITY);
  });

  it("scrolls line numbers underneath the open sidebar with their frame", async () => {
    await setCode(`const message = "${"x".repeat(180)}";`);
    await page.getByRole("switch", { name: "Line numbers" }).click({ force: true });
    await finishAnimations(liveFrame());

    const canvas = frame(".pico-shell-canvas");
    const gutter = frame(".pico-editor .cm-gutters");

    canvas.scrollLeft = canvas.scrollWidth;
    await nextFrame();

    expect(canvas.scrollLeft).toBeGreaterThan(0);
    expect(gutter.getBoundingClientRect().right).toBeLessThan(
      frame(".pico-sidebar").getBoundingClientRect().right,
    );
  });

  it("eases font size and follows a discrete font-family change", async () => {
    const fontSize = page.getByRole("radiogroup", { name: "Size" });
    await fontSize.getByRole("radio", { name: "12" }).click();
    await finishAnimations(liveFrame());

    await fontSize.getByRole("radio", { name: "18" }).click();
    await pauseAtMidpoint(liveFrame());
    const midpointSize = Number.parseFloat(getComputedStyle(liveFrame()).fontSize);
    const midpointEditorSize = Number.parseFloat(
      getComputedStyle(frame(".pico-editor .cm-editor")).fontSize,
    );
    expect(midpointSize).toBeGreaterThan(12);
    expect(midpointSize).toBeLessThan(18);
    expect(midpointEditorSize).toBeGreaterThan(12);
    expect(midpointEditorSize).toBeLessThan(18);
    await finishAnimations(liveFrame());

    await setCode(`const message = "${"m".repeat(120)}";`);
    await document.fonts.load('18px "JetBrains Mono"');
    await page.getByRole("combobox", { name: "Font" }).click();
    await page.getByRole("option", { name: /JetBrains Mono/ }).click({ force: true });
    expect(getComputedStyle(liveFrame()).fontFamily).toContain("JetBrains Mono");
    await finishAnimations(liveFrame());
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("shrinks the frame's height in step with its font size", async () => {
    await setCode(codeWithLineCount(40));
    const fontSize = page.getByRole("radiogroup", { name: "Size" });

    await fontSize.getByRole("radio", { name: "18" }).click();
    await finishAnimations(liveFrame());
    const tallest = liveFrame().getBoundingClientRect().height;

    await fontSize.getByRole("radio", { name: "12" }).click();
    await pauseAtMidpoint(liveFrame());
    // CodeMirror measures on the frame after the one that asked it to.
    await nextFrame();

    // The regression this guards: the editor's cached line heights held the
    // frame at its old height for the first third of the transition and then
    // collapsed the rest of the way in a single frame.
    const midpointHeight = liveFrame().getBoundingClientRect().height;
    expect(midpointHeight).toBeLessThan(tallest);

    await finishAnimations(liveFrame());
    const shortest = liveFrame().getBoundingClientRect().height;
    expect(midpointHeight).toBeGreaterThan(shortest);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });

  it("paints the frame only once its font can be", async () => {
    // The face is already in the document's font set by the time this runs, so
    // the frame is never actually held; what is asserted is that it is
    // revealed, that the reveal is a fade, and that holding hides it.
    const shell = frame(".pico-shell");
    expect(shell.dataset.fontPhase).toBe("ready");
    expect(getComputedStyle(liveFrame()).transitionProperty).toContain("opacity");

    await finishAnimations(liveFrame());
    expect(Number.parseFloat(getComputedStyle(liveFrame()).opacity)).toBe(1);

    shell.dataset.fontPhase = "held";
    await finishAnimations(liveFrame());
    expect(Number.parseFloat(getComputedStyle(liveFrame()).opacity)).toBe(0);
  });

  it("retargets rapid geometry changes from the in-flight value", async () => {
    const padding = page.getByRole("radiogroup", { name: "Padding" });
    await padding.getByRole("radio", { name: "S" }).click();
    await finishAnimations(liveFrame());

    await padding.getByRole("radio", { name: "XL" }).click();
    await pauseAtMidpoint(liveFrame());
    const inFlightPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    expect(inFlightPadding).toBeGreaterThan(16);
    expect(inFlightPadding).toBeLessThan(64);

    await padding.getByRole("radio", { name: "L", exact: true }).click();
    await pauseAtMidpoint(liveFrame());
    const retargetedPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    expect(retargetedPadding).toBeLessThan(inFlightPadding);
    expect(retargetedPadding).toBeGreaterThan(44);

    await finishAnimations(liveFrame());
    expect(Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft)).toBeCloseTo(44, 1);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });
});
