import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import type { ThemedToken } from "shiki/core";

let remembered: { key: string; tokens: ThemedToken[][] } | undefined;

/**
 * One uncolored token per line, for the moment before the highlighter arrives.
 *
 * Shiki splits a document into exactly as many lines as `split("\n")` does, so
 * this renders at the same size the highlighted version will — which is what
 * lets the frame be measured before any grammar has loaded.
 */
function plainTokens(code: string): ThemedToken[][] {
  let offset = 0;
  return code.split("\n").map((line) => {
    const token: ThemedToken = { content: line, offset };
    offset += line.length + 1;
    return [token];
  });
}

/**
 * The Shiki tokens for a document, computed at most once per document.
 *
 * The editor and the export node need the same tokens for the same document —
 * one to decorate CodeMirror's ranges, the other to render a span per token —
 * but they are reached from a CodeMirror state field and a React render
 * respectively, with nowhere to hand the answer between them. Tokenizing a
 * snippet costs about as much as a whole frame's budget, so it is worth not
 * doing twice for every keystroke.
 *
 * One result is enough to remember. Both readings happen in the same task: the
 * editor tokenizes inside its transaction, and the render that transaction
 * triggers is what asks again.
 *
 * @param highlight `null` until the first grammar and theme have loaded, in
 * which case the document comes back unhighlighted rather than empty.
 */
export function tokenize(code: string, highlight: ShikiHighlight | null): ThemedToken[][] {
  if (!highlight) return plainTokens(code);

  const key = `${highlight.theme} ${highlight.lang} ${code}`;
  if (remembered?.key === key) return remembered.tokens;

  const { tokens } = highlight.highlighter.codeToTokens(code, {
    lang: highlight.lang,
    theme: highlight.theme,
  });
  remembered = { key, tokens };
  return tokens;
}
