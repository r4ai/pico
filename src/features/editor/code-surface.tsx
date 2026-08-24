import type { CodeEditorProps } from "@/features/editor/code-editor";
import { useCodeEditor } from "@/features/editor/use-code-editor";
import { ShikiCode } from "@/features/preview/shiki-code";
import { useState } from "react";

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
 *
 * A click, and not a tap. Focus taken after an `import()` has resolved is
 * focus taken outside the gesture that asked for it, and no phone raises its
 * keyboard for that — so a remembered tap would leave a caret blinking in an
 * editor with nothing to type on, which is a worse place to be than the one
 * the tap started from. There, the second tap is the one that works, and it
 * works whether or not this remembered the first.
 */
export function CodeSurface(props: CodeSurfaceProps) {
  const Editor = useCodeEditor();
  // State rather than a ref, because it is read while rendering: what the
  // press means is which editor gets built, not something to check later.
  const [pressed, setPressed] = useState(false);

  if (Editor) return <Editor {...props} focusOnMount={pressed} />;

  return (
    // Not a `textbox`, and deliberately not focusable: a text field that
    // silently drops what is typed into it is worse than one that is visibly
    // not ready yet.
    <div
      className="pico-code-standin"
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") setPressed(true);
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
