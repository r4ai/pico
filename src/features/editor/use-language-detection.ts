import { detectLanguage } from "@/features/editor/detect-language";
import type { LanguageId } from "@/features/editor/language";
import { useEffect, useRef } from "react";

/** Long enough that the guess is not being recomputed mid-word. */
const SETTLE_MS = 400;

export type UseLanguageDetectionOptions = {
  code: string;
  /** False once the reader has picked a language themselves. */
  enabled: boolean;
  onDetect: (lang: LanguageId) => void;
};

/**
 * Sets the language from the code, so pasting a snippet is the whole setup.
 *
 * It guesses once per document rather than continuously: watching every
 * keystroke would let the language flip around underneath someone who is still
 * typing. Clearing the editor arms it again for the next paste.
 */
export function useLanguageDetection({ code, enabled, onDetect }: UseLanguageDetectionOptions) {
  const armed = useRef(true);
  const latestOnDetect = useRef(onDetect);

  useEffect(() => {
    latestOnDetect.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (code.trim() === "") {
      armed.current = true;
      return;
    }
    if (!enabled || !armed.current) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      detectLanguage(code).then(
        (lang) => {
          if (cancelled || !lang) return;
          armed.current = false;
          latestOnDetect.current(lang);
        },
        // Detection is a convenience. If the detector cannot load, leaving the
        // language alone is the right outcome, and there is nothing to tell
        // anyone: the picker in the dock still works.
        () => {},
      );
    }, SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, enabled]);
}
