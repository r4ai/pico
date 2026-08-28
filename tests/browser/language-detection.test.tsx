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
/** Every worker built since this test started, by the URL it was built from. */
let workers: string[];
let realWorker: typeof Worker | undefined;

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
  window.history.replaceState(null, "", "?lang=not-a-language");
  window.localStorage.clear();

  // Before the first render, because the detector builds its worker once for
  // the lifetime of the page and every test here shares one.
  workers = [];
  realWorker = window.Worker;
  window.Worker = class extends realWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      workers.push(String(url));
      super(url, options);
    }
  };
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  if (realWorker) window.Worker = realWorker;
  realWorker = undefined;
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

it("guesses the language when an invalid query value was rejected", async () => {
  await paste(PYTHON);
  await expect.poll(language, { timeout: DETECTION_WINDOW_MS }).toBe("python");

  // One test rather than two, because the detector builds its worker on the
  // first guess and keeps it: a second test could only ever watch a worker
  // that already existed.
  //
  // The mechanism rather than the milliseconds. `highlightAuto` scores a
  // document against twenty grammars in one synchronous pass, and on the main
  // thread it was the longest task Pico ever ran — 223ms on a hundred-line
  // snippet, landing 1.1s after the paste, measured on a production build.
  // What a test can hold is that the pass happens off this thread at all: a
  // long-task count says as much about the machine reading it as about the
  // code, and a runner under load reports the paste's own tokenizing as one
  // task or as three. See `docs/development.md`.
  expect(workers.filter((url) => url.includes("detect-language-worker"))).toHaveLength(1);
});
