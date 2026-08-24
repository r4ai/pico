import { detectLanguage } from "@/features/editor/detect-language";
import type { DetectRequest, DetectResponse } from "@/features/editor/detect-language-protocol";

/**
 * Where guessing the language happens.
 *
 * `highlightAuto` scores a document against twenty grammars in one synchronous
 * pass, and on the main thread it was the longest task Pico ever ran: 87ms on
 * a six-kilobyte snippet with the grammars already warm, and about 330ms the
 * first time, when they are being parsed as well. It lands four hundred
 * milliseconds after a paste — which is to say while somebody is still moving,
 * scrolling, or typing the next thing — and every one of those frames was
 * dropped.
 *
 * Nothing about the guess needs the DOM, so none of it needs to be here. Off
 * the main thread the same work costs the page nothing at all, and highlight.js
 * and its twenty grammars leave the page's module graph with it.
 *
 * One message in, one message out, correlated by number: a paste can arrive
 * while the last guess is still running, and the answer to the document that
 * has been replaced is not the answer.
 */
self.addEventListener("message", (event: MessageEvent<DetectRequest>) => {
  const { id, code } = event.data;

  detectLanguage(code).then(
    (lang) => {
      const response: DetectResponse = { id, lang };
      self.postMessage(response);
    },
    (error: unknown) => {
      const response: DetectResponse = {
        id,
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    },
  );
});
