import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import { tokenStyle } from "@/features/editor/token-style";

export type ShikiCodeProps = {
  code: string;
  highlight: ShikiHighlight;
  showLineNumbers: boolean;
};

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
  const { tokens } = highlight.highlighter.codeToTokens(code, {
    lang: highlight.lang,
    theme: highlight.theme,
  });

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
