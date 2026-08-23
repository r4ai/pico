import type { Extension } from "@codemirror/state";
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
  const cursor = color(theme, "editorCursor.foreground", foreground);
  const selection = color(theme, "editor.selectionBackground", `${foreground}22`);

  return EditorView.theme(
    {
      "&": {
        "--pico-cursor-color": cursor,
        backgroundColor: "transparent",
        color: foreground,
      },
      "&.cm-focused": { outline: "none" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: selection,
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
        color: "var(--pico-line-number)",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      ".cm-placeholder": { color: `${foreground}66` },
    },
    { dark: theme.type === "dark" },
  );
}
