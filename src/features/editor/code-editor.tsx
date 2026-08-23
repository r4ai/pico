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
  /** What the editor is called, for anyone who cannot see the frame around it. */
  label: string;
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
  label,
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
    placeholder: new Compartment(),
  });
  // The initial document; later values are synced by their own effect.
  const initialValue = useRef(value);
  // Announced once, when focus first lands in the editor. It never changes, so
  // it does not need a compartment of its own.
  const initialLabel = useRef(label);

  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);

  useEffect(() => {
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
            // Code is not prose: red underlines under every identifier are
            // noise, and a phone correcting one into a word is worse.
            spellcheck: "false",
            autocorrect: "off",
            autocapitalize: "off",
          }),
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

  return <div ref={container} className="pico-editor" data-line-numbers={showLineNumbers} />;
}
