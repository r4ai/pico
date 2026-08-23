import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { ThemeRegistrationResolved } from "shiki/core";

function color(theme: ThemeRegistrationResolved, key: string, fallback: string): string {
  return theme.colors?.[key] ?? fallback;
}

/**
 * Dresses CodeMirror in a Shiki theme.
 *
 * The editor itself stays transparent: the surrounding frame paints the
 * background, padding, radius and shadow, so the same frame can wrap the
 * export node and the two render identically. Typography comes from the
 * frame's CSS custom properties for the same reason.
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
        fontFamily: "var(--pico-font-family)",
        fontSize: "var(--pico-font-size)",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        overflow: "visible",
        fontFamily: "inherit",
        lineHeight: "var(--pico-line-height)",
      },
      ".cm-content": {
        padding: "0",
        caretColor: color(theme, "editorCursor.foreground", foreground),
      },
      ".cm-line": { padding: "0" },
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
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 var(--pico-gutter-gap) 0 0",
        minWidth: "var(--pico-gutter-min-width)",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      ".cm-placeholder": { color: `${foreground}66` },
    },
    { dark: theme.type === "dark" },
  );
}
