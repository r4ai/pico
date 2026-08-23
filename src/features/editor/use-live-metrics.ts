import type { EditorView } from "@codemirror/view";
import { type RefObject, useEffect } from "react";

/**
 * Keeps CodeMirror's cached geometry honest while the frame around it animates.
 *
 * CodeMirror measures line heights once and then trusts the numbers until
 * something tells it not to — including the height it writes onto the gutter
 * element as a `min-height`. A CSS transition on the frame's font size changes
 * every line under it without a single DOM mutation, so nothing tells it. The
 * stale gutter then props the editor open at the old height for about six
 * frames, and the frame collapses the rest of the way in one: the transition
 * animates, and the box it lives in jumps.
 *
 * Growing hides the bug — the taller lines exceed the stale minimum on their
 * own — so it is only ever visible on the way down.
 *
 * A measure per frame is what the animation costs anyway: CodeMirror only
 * measures the lines in view, and asking for it is how the library expects
 * geometry it cannot observe to be reported. The final measure on cleanup is
 * what lands the editor exactly on the settled values.
 *
 * Call this below the effect that creates the view: there is exactly one view
 * per editor, and taking it once means taking the one that exists by the time
 * the first animation starts.
 */
export function useLiveMetrics(view: RefObject<EditorView | null>, animating: boolean) {
  useEffect(() => {
    const editor = view.current;
    if (!animating || !editor) return;

    let frame = requestAnimationFrame(function measure() {
      editor.requestMeasure();
      frame = requestAnimationFrame(measure);
    });

    return () => {
      cancelAnimationFrame(frame);
      // A no-op if the editor has since been torn down: CodeMirror drops the
      // measure it schedules once the view is destroyed.
      editor.requestMeasure();
    };
  }, [animating, view]);
}
