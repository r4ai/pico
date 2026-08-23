import { App } from "@/app";
import { fontFaceCss } from "@/features/settings/fonts";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
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

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function setCode(code: string): Promise<void> {
  await page.getByRole("textbox", { name: "Code" }).fill(code);
  await nextFrame();
  await nextFrame();
}

function codeWithLineCount(count: number): string {
  return Array.from(
    { length: count },
    (_, index) => `const value${index + 1} = alpha + beta;`,
  ).join("\n");
}

async function finishAnimations(element: HTMLElement): Promise<void> {
  await nextFrame();
  for (const animation of element.getAnimations({ subtree: true })) animation.finish();
  await nextFrame();
}

async function pauseAtMidpoint(element: HTMLElement): Promise<void> {
  await nextFrame();
  const animations = element.getAnimations({ subtree: true });
  expect(animations.length).toBeGreaterThan(0);
  for (const animation of animations) {
    animation.pause();
    animation.currentTime = TRANSITION_MIDPOINT_MS;
  }
  await nextFrame();
}

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
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
  if (!document.querySelector('.pico-sidebar[data-open="true"]')) {
    await page.getByRole("button", { name: "Open settings" }).click();
  }
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
  document.querySelector("style[data-test-fonts]")?.remove();
});

describe("preview geometry", () => {
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

  it("restores URL geometry directly at its final dimensions", async () => {
    await unmount?.();
    await cleanup();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?padding=xl&fontSize=xl&lineNumbers=true`,
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
    await wait(40);
    const inFlightPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    expect(inFlightPadding).toBeGreaterThan(16);
    expect(inFlightPadding).toBeLessThan(64);

    await padding.getByRole("radio", { name: "L", exact: true }).click();
    await nextFrame();
    const firstRetargetedPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    await nextFrame();
    const secondRetargetedPadding = Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft);
    expect(firstRetargetedPadding).toBeGreaterThan(44);
    expect(secondRetargetedPadding).toBeLessThan(firstRetargetedPadding);
    expect(secondRetargetedPadding).toBeGreaterThan(44);

    await finishAnimations(liveFrame());
    expect(Number.parseFloat(getComputedStyle(liveFrame()).paddingLeft)).toBeCloseTo(44, 1);
    expect(liveFrame().getBoundingClientRect().width).toBeCloseTo(
      exportFrame().getBoundingClientRect().width,
      1,
    );
  });
});
