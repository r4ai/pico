import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import { tokenStyle } from "@/features/editor/token-style";
import type { ThemedToken } from "shiki/core";

export type ShikiCodeProps = {
  code: string;
  /** `null` until the first grammar and theme have loaded. */
  highlight: ShikiHighlight | null;
  showLineNumbers: boolean;
};

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
 * A static, non-editable rendering of the code — the thing that actually gets
 * turned into an image.
 *
 * It exists separately from the editor because CodeMirror's DOM carries a
 * cursor layer, a selection layer, and viewport virtualization for long
 * documents, none of which belong in a picture. Rendering the same Shiki
 * tokens into plain markup makes the capture deterministic.
 */
export function ShikiCode({ code, highlight, showLineNumbers }: ShikiCodeProps) {
  const tokens = highlight
    ? highlight.highlighter.codeToTokens(code, {
        lang: highlight.lang,
        theme: highlight.theme,
      }).tokens
    : plainTokens(code);

  return (
    <div className="pico-code">
      {showLineNumbers && (
        <div className="pico-gutter">
          {tokens.map((_line, index) => (
            <div key={`line-number-${index + 1}`}>{index + 1}</div>
          ))}
        </div>
      )}
      <div className="pico-lines">
        {tokens.map((line, lineIndex) => (
          <div className="pico-line" key={`line-${lineIndex + 1}`}>
            {line.map((token, tokenIndex) => (
              <span key={`${lineIndex}-${tokenIndex}-${token.offset}`} style={tokenStyle(token)}>
                {token.content}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
