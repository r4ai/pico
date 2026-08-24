import type { DetectRequest, DetectResponse } from "@/features/editor/detect-language-protocol";
import type { LanguageId } from "@/features/editor/language";

type Pending = {
  resolve: (lang: LanguageId | undefined) => void;
  reject: (error: Error) => void;
};

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

/** Fails everything in flight and puts the worker back, so the next guess can try again. */
function abandon(reason: string) {
  worker?.terminate();
  worker = undefined;
  const failed = [...pending.values()];
  pending.clear();
  for (const request of failed) request.reject(new Error(reason));
}

/**
 * The detector, started on the first guess rather than on load.
 *
 * Later than the first paint by construction: nothing asks for a guess until
 * there is a document to guess about, and starting a worker costs a thread and
 * a module graph that the first screen has no use for.
 */
function getWorker(): Worker {
  if (worker) return worker;

  const started = new Worker(new URL("./detect-language-worker.ts", import.meta.url), {
    type: "module",
    name: "pico-language-detector",
  });

  started.addEventListener("message", (event: MessageEvent<DetectResponse>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);

    if ("error" in response) request.reject(new Error(response.error));
    else request.resolve(response.lang);
  });

  // A worker that has fallen over answers nothing, and a promise nobody settles
  // is a caller waiting forever. Everything in flight is failed and the worker
  // is dropped; the next document builds a new one. Guessing happens once per
  // document, so a detector that cannot start costs one attempt per paste
  // rather than one per keystroke.
  started.addEventListener("error", () => abandon("The language detector stopped."));
  started.addEventListener("messageerror", () => abandon("The language detector stopped."));

  worker = started;
  return started;
}

/**
 * Guesses which of Pico's languages a snippet is, off the main thread.
 *
 * The guess itself is {@link detectLanguage}, which runs in
 * `detect-language-worker.ts`. It is a synchronous pass over twenty grammars
 * and was the longest task on the page — around 87ms on a six-kilobyte
 * snippet, and about 330ms the first time — landing while somebody is still
 * typing. Nothing about it touches the DOM, so nothing about it belongs on the
 * thread that draws.
 *
 * Only this module reaches for the worker, so highlight.js and its grammars
 * are reachable from nowhere the page itself loads.
 *
 * @returns `undefined` when nothing scored well enough to be worth acting on.
 * Rejects if the detector could not be started or fell over — detection is a
 * convenience, and the picker in the dock is the answer either way.
 */
export function detectLanguageOffThread(code: string): Promise<LanguageId | undefined> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });

    try {
      const request: DetectRequest = { id, code };
      getWorker().postMessage(request);
    } catch (error) {
      pending.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
