import type { ThemeRegistrationResolved } from "shiki/core";

export type FrameColors = {
  readonly background: string;
  readonly foreground: string;
  readonly lineNumber: string;
};

/** The handful of theme colors the frame paints with, outside of the tokens themselves. */
export function frameColorsOf(theme: ThemeRegistrationResolved): FrameColors {
  return {
    background: theme.bg,
    foreground: theme.fg,
    lineNumber: theme.colors?.["editorLineNumber.foreground"] ?? `${theme.fg}66`,
  };
}
