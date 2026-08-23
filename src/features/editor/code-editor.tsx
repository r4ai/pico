import { createEditorTheme } from "@/features/editor/cm-theme";
import {
  setShikiHighlight,
  type ShikiHighlight,
  shikiHighlighting,
} from "@/features/editor/shiki-highlight";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
import { useEffect, useRef } from "react";

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /** `null` until the first grammar and theme have loaded. */
  highlight: ShikiHighlight | null;
  showLineNumbers: boolean;
  placeholderText: string;
};

/**
 * The editor that doubles as the preview.
 *
 * Colors come from Shiki rather than a CodeMirror language mode, so this and
 * the exported image are painted from one source.
 */
export function CodeEditor({
  value,
  onChange,
  highlight,
  showLineNumbers,
  placeholderText,
}: CodeEditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latestOnChange = useRef(onChange);
  const compartments = useRef({
    theme: new Compartment(),
    lineNumbers: new Compartment(),
    placeholder: new Compartment(),
  });
  // The initial document; later values are synced by their own effect.
  const initialValue = useRef(value);

  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const parent = container.current;
    if (!parent) return;

    const {
      theme,
      lineNumbers: lineNumbersCompartment,
      placeholder: placeholderCompartment,
    } = compartments.current;
    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          history(),
          drawSelection(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          shikiHighlighting(),
          theme.of([]),
          lineNumbersCompartment.of([]),
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
      effects: compartments.current.lineNumbers.reconfigure(showLineNumbers ? lineNumbers() : []),
    });
  }, [showLineNumbers]);

  useEffect(() => {
    view.current?.dispatch({
      effects: compartments.current.placeholder.reconfigure(placeholder(placeholderText)),
    });
  }, [placeholderText]);

  return <div ref={container} className="pico-editor" />;
}
