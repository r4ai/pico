import type { LanguageId } from "@/features/editor/language";
import { useLanguageDetection } from "@/features/editor/use-language-detection";
import { hasExplicitLanguage } from "@/features/settings/search-params";
import { useCallback, useState } from "react";

export type UseLanguageChoiceOptions = {
  code: string;
  /** Sets the language, however it came to be chosen. */
  setLanguage: (lang: LanguageId) => void;
};

/**
 * Who decides what the language is.
 *
 * Pico guesses, until somebody says otherwise. A reader who arrived at a link
 * that names a language has already had it decided for them, and one who picks
 * from the dock has just decided it themselves — after either, guessing again
 * would only fight them.
 *
 * @returns what the picker calls when a language is chosen by hand.
 */
export function useLanguageChoice({ code, setLanguage }: UseLanguageChoiceOptions) {
  // Once someone picks a language themselves, guessing would only fight them.
  const [chosen, setChosen] = useState(() => hasExplicitLanguage(window.location.search));

  const chooseLanguage = useCallback(
    (lang: LanguageId) => {
      setChosen(true);
      setLanguage(lang);
    },
    [setLanguage],
  );

  useLanguageDetection({ code, enabled: !chosen, onDetect: setLanguage });

  return chooseLanguage;
}
