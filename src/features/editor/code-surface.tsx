import type { CodeEditorProps } from "@/features/editor/code-editor";
import { useCodeEditor } from "@/features/editor/use-code-editor";
import { ShikiCode } from "@/features/preview/shiki-code";
import { useRef } from "react";

export type CodeSurfaceProps = CodeEditorProps;

/**
 * What is inside the frame: the code, and the editor once it arrives.
 *
 * The two are the same picture. The static rendering here is the one the
 * export node is made of, and the invariant that keeps a capture honest — that
 * it lays out to the pixel the way the editor does — is what lets the editor
 * be swapped in underneath somebody without anything moving. See
 * {@link useCodeEditor} for why it is not simply there from the start.
 *
 * The gap is a few hundred milliseconds on a slow connection and nothing at
 * all on a warm cache, and for most of it there is nothing to type into yet
 * anyway. A click that lands in it is not lost, though: it is remembered, and
 * the editor takes the keyboard as it mounts.
 */
export function CodeSurface(props: CodeSurfaceProps) {
  const Editor = useCodeEditor();
  const wanted = useRef(false);

  if (Editor) return <Editor {...props} focusOnMount={wanted.current} />;

  return (
    // Not a `textbox`, and deliberately not focusable: a text field that
    // silently drops what is typed into it is worse than one that is visibly
    // not ready yet.
    <div
      className="pico-code-standin"
      onPointerDown={() => {
        wanted.current = true;
      }}
    >
      <ShikiCode
        code={props.value}
        highlight={props.highlight}
        placeholder={props.placeholderText}
        showLineNumbers={props.showLineNumbers}
      />
    </div>
  );
}
