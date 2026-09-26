import type { ShikiHighlight } from "@/core/highlight/shiki-highlight";
import { tokenStyle } from "@/core/highlight/token-style";
import { tokenize } from "@/core/highlight/tokenize";

export type ShikiCodeProps = {
  code: string;
  /** `null` until the first grammar and theme have loaded. */
  highlight: ShikiHighlight | null;
  showLineNumbers: boolean;
  /**
   * What an empty document says, drawn the way the editor draws its own.
   *
   * Only the live rendering passes one. An export of an empty document is an
   * empty picture, not a picture of an invitation to paste something.
   */
  placeholder?: string;
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
export function ShikiCode({ code, highlight, showLineNumbers, placeholder }: ShikiCodeProps) {
  const tokens = tokenize(code, highlight);
  const empty = code === "";

  return (
    <div className="pico-code">
      <div className="pico-lines">
        {tokens.map((line, lineIndex) => (
          <div className="pico-line" key={`line-${lineIndex + 1}`}>
            {showLineNumbers && <div className="pico-gutter">{lineIndex + 1}</div>}
            <div className="pico-line-content">
              {empty && placeholder !== undefined ? (
                <span className="pico-placeholder">{placeholder}</span>
              ) : (
                // Keyed by position rather than by offset: a token's offset
                // moves with every character typed before it, which would
                // remount every span after the caret on every keystroke.
                line.map((token, tokenIndex) => (
                  <span key={`${lineIndex}-${tokenIndex}`} style={tokenStyle(token)}>
                    {token.content}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
