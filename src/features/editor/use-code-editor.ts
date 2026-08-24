import type { CodeEditorProps } from "@/features/editor/code-editor";
import { toast } from "@/components/toast";
import { type ComponentType, useEffect, useState } from "react";

type CodeEditorComponent = ComponentType<CodeEditorProps>;

let pending: Promise<CodeEditorComponent> | undefined;

/**
 * Fetches the editor, once per page.
 *
 * Called as this module is evaluated rather than from the effect below, so the
 * request goes out while the entry chunk is still running — alongside the
 * chrome and the highlighter, and a whole render before React would otherwise
 * have asked for it.
 */
function load(): Promise<CodeEditorComponent> {
  pending ??= import("@/features/editor/code-editor").then((module) => module.CodeEditor);
  return pending;
}

void load().then(undefined, () => {
  // Reported from the hook, which is where there is somebody to report it to.
});

/**
 * The editor, once it has arrived.
 *
 * CodeMirror is half of what the entry chunk used to be — more than React and
 * React DOM together — and the first paint does not need any of it: the frame
 * is measured from the export node, and the same static rendering that node is
 * made of stands in until the editor lands. Splitting it took roughly a third
 * off the time to first contentful paint on a throttled connection, which is
 * the whole time somebody following a shared link spends looking at nothing.
 *
 * @returns `null` until it has, and for good if it never does.
 */
export function useCodeEditor(): CodeEditorComponent | null {
  const [editor, setEditor] = useState<CodeEditorComponent | null>(null);

  useEffect(() => {
    let live = true;
    void load().then(
      // The extra closure is React's: a component is a function, and passing
      // one to a state setter would call it.
      (component) => {
        if (live) setEditor(() => component);
      },
      (error: unknown) => {
        if (!live) return;
        toast.error("The editor could not be loaded.", {
          description: error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return editor;
}
