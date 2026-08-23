import type { LanguageId } from "@/features/editor/language";
import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import type { ShikiThemeName } from "@/features/settings/theme";
import { ensureHighlighter } from "@/lib/shiki";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Loads the grammar and theme, then hands back the three of them as one value.
 *
 * Bundling them prevents the editor from ever being told to use a grammar the
 * highlighter has not loaded yet. While a new pair loads the previous one stays
 * in place, so switching language or theme never flashes unstyled code.
 *
 * @returns `null` only until the very first grammar and theme have loaded.
 */
export function useShikiHighlight(lang: LanguageId, theme: ShikiThemeName): ShikiHighlight | null {
  const [highlight, setHighlight] = useState<ShikiHighlight | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureHighlighter(lang, theme).then(
      ({ highlighter, shikiLang }) => {
        if (!cancelled) setHighlight({ highlighter, lang: shikiLang, theme });
      },
      (error: unknown) => {
        const description = error instanceof Error ? error.message : String(error);
        if (!cancelled) toast.error(`Could not load ${lang} in ${theme}.`, { description });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [lang, theme]);

  return highlight;
}
