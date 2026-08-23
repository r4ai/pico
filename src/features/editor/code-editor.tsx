import { createEditorTheme } from "@/features/editor/cm-theme";
import {
  setShikiHighlight,
  type ShikiHighlight,
  shikiHighlighting,
} from "@/features/editor/shiki-highlight";
import { useLiveMetrics } from "@/features/editor/use-live-metrics";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
import { useEffect, useId, useLayoutEffect, useRef } from "react";

/** Long enough to reach for Tab after Escape, short enough not to linger. */
const TAB_FOCUS_GRACE_MS = 4000;

export type CodeEditorProps = {
  value: string;
  /** What the editor is called, for anyone who cannot see the frame around it. */
  label: string;
  onChange: (value: string) => void;
  /** `null` until the first grammar and theme have loaded. */
  highlight: ShikiHighlight | null;
  showLineNumbers: boolean;
  placeholderText: string;
  /** True while the frame's geometry is easing between two settings. */
  animatingGeometry: boolean;
};

/**
 * The editor that doubles as the preview.
 *
 * Colors come from Shiki rather than a CodeMirror language mode, so this and
 * the exported image are painted from one source.
 */
export function CodeEditor({
  value,
  label,
  onChange,
  highlight,
  showLineNumbers,
  placeholderText,
  animatingGeometry,
}: CodeEditorProps) {
  const hintId = useId();
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latestOnChange = useRef(onChange);
  const compartments = useRef({
    theme: new Compartment(),
    placeholder: new Compartment(),
  });
  // The initial document; later values are synced by their own effect.
  const initialValue = useRef(value);
  // Announced once, when focus first lands in the editor. Neither changes, so
  // they do not need a compartment of their own.
  const initialLabel = useRef(label);
  const initialHintId = useRef(hintId);

  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);

  useLayoutEffect(() => {
    const parent = container.current;
    if (!parent) return;

    const { theme, placeholder: placeholderCompartment } = compartments.current;
    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          history(),
          drawSelection(),
          EditorView.contentAttributes.of({
            "aria-label": initialLabel.current,
            "aria-describedby": initialHintId.current,
            // Code is not prose: red underlines under every identifier are
            // noise, and a phone correcting one into a word is worse.
            spellcheck: "false",
            autocorrect: "off",
            autocapitalize: "off",
          }),
          // Tab indents, which without a way out is a keyboard trap: the
          // editor is the first thing the page puts focus in and there would
          // be no reaching the dock from it. Escape hands Tab back to the
          // browser for long enough to leave, and CodeMirror cancels the mode
          // again on the next ordinary keypress. Ordered before the default
          // keymap, whose own Escape only simplifies the selection.
          keymap.of([
            {
              key: "Escape",
              run: (target) => {
                target.setTabFocusMode(TAB_FOCUS_GRACE_MS);
                return true;
              },
            },
          ]),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          shikiHighlighting(),
          theme.of([]),
          lineNumbers(),
          placeholderCompartment.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latestOnChange.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  // Below the effect above, which is what puts a view in the ref to measure.
  useLiveMetrics(view, animatingGeometry);

  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || !highlight) return;
    editor.dispatch({
      effects: [
        setShikiHighlight.of(highlight),
        compartments.current.theme.reconfigure(
          createEditorTheme(highlight.highlighter.getTheme(highlight.theme)),
        ),
      ],
    });
  }, [highlight]);

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.placeholder.reconfigure(placeholder(placeholderText)),
    });
  }, [placeholderText]);

  useEffect(() => {
    view.current?.dom
      .querySelector(".cm-gutters")
      ?.setAttribute("aria-hidden", String(!showLineNumbers));
  }, [showLineNumbers]);

  return (
    <>
      <div ref={container} className="pico-editor" data-line-numbers={showLineNumbers} />
      <p className="sr-only" id={hintId}>
        Tab indents. Press Escape and then Tab to move on.
      </p>
    </>
  );
}
