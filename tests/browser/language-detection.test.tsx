import { App } from "@/app";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * Guessing the language is a synchronous pass over twenty grammars, and it
 * lands four hundred milliseconds after a paste — which is to say while
 * somebody is still moving. On the main thread it was the longest task Pico
 * ever ran. What these hold is that it still answers, and that answering costs
 * the thread that draws nothing.
 */

let unmount: (() => Promise<void>) | undefined;

/** Long enough to cover the settle, the worker starting, and the guess itself. */
const DETECTION_WINDOW_MS = 4000;

/** Unmistakably Python, and nothing Pico defaults to. */
const PYTHON = `import math


def area(radius: float) -> float:
    if radius < 0:
        raise ValueError("negative radius")
    return math.pi * radius**2


class Circle:
    def __init__(self, radius: float) -> None:
        self.radius = radius

    def area(self) -> float:
        return area(self.radius)
`;

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

async function paste(code: string): Promise<void> {
  const editor = document.querySelector(".cm-content");
  if (!(editor instanceof HTMLElement)) throw new Error("the editor has not arrived");
  const transfer = new DataTransfer();
  transfer.setData("text/plain", code);
  editor.focus();
  editor.dispatchEvent(
    new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }),
  );
}

function language(): string | null {
  return new URLSearchParams(window.location.search).get("lang");
}

it("guesses the language from a pasted snippet", async () => {
  await paste(PYTHON);
  await expect.poll(language, { timeout: DETECTION_WINDOW_MS }).toBe("python");
});

it("blocks nothing on the thread that draws while it guesses", async () => {
  const tasks: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) tasks.push(Math.round(entry.startTime));
  });
  observer.observe({ type: "longtask" });

  const pastedAt = performance.now();
  await paste(PYTHON);
  await expect.poll(language, { timeout: DETECTION_WINDOW_MS }).toBe("python");
  observer.disconnect();

  // The paste itself is a long task and always was: a hundred lines are
  // tokenized and rendered under it. The guess is the one that used to follow
  // it, alone, a beat later, with nothing else happening — 223ms of it here
  // before this moved off the thread.
  const settleWindow = 250;
  const afterTheSettle = tasks.filter((startedAt) => startedAt > pastedAt + settleWindow);
  expect(afterTheSettle).toEqual([]);
});
