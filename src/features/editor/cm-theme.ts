import type { Extension } from "@codemirror/state";
// Nothing reaches this module without waiting for code-editor.tsx, which is
// itself only ever imported dynamically. See useCodeEditor.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { EditorView } from "@codemirror/view";
import type { ThemeRegistrationResolved } from "shiki/core";

function color(theme: ThemeRegistrationResolved, key: string, fallback: string): string {
  return theme.colors?.[key] ?? fallback;
}

/**
 * Dresses CodeMirror in a Shiki theme.
 *
 * Colors only. Everything that decides how much room a line takes — the font,
 * its size, the line height, the padding CodeMirror would otherwise add —
 * lives in the stylesheet instead, because this theme cannot be applied until
 * the highlighter has loaded and metrics arriving that late relayout every
 * line under the reader.
 *
 * The editor itself stays transparent: the surrounding frame paints the
 * background, padding, radius and shadow, so the same frame can wrap the
 * export node and the two render identically.
 *
 * There is deliberately no active-line highlight — the editor doubles as the
 * preview, so anything it shows that the image would not is a lie.
 */
export function createEditorTheme(theme: ThemeRegistrationResolved): Extension {
  const foreground = theme.fg;
  const selection = color(theme, "editor.selectionBackground", `${foreground}22`);

  return EditorView.theme(
    {
      "&": {
        backgroundColor: "transparent",
        color: foreground,
      },
      "&.cm-focused": { outline: "none" },
      ".cm-content": {
        caretColor: color(theme, "editorCursor.foreground", foreground),
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: color(theme, "editorCursor.foreground", foreground),
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: selection,
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
        color: "var(--pico-line-number)",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      // 70% of the foreground rather than CodeMirror's 40%. At 40% the
      // invitation to paste something was between 1.9:1 and 3.2:1 against the
      // ten backgrounds Pico ships, which is not text anybody should have to
      // squint at; at 70% it clears 4.5:1 on seven of them and stays visibly a
      // hint rather than something already typed. The static rendering that
      // stands in before this theme exists uses the same value.
      ".cm-placeholder": { color: `${foreground}b3` },
    },
    { dark: theme.type === "dark" },
  );
}
