import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import type { HighlighterCore, ThemedToken } from "shiki/core";

/**
 * Everything the highlighter needs, kept as one value so the grammar and theme
 * can never be swapped in before the highlighter has actually loaded them.
 */
export type ShikiHighlight = {
  readonly highlighter: HighlighterCore;
  /** Shiki grammar name, not a Pico language id. */
  readonly lang: string;
  readonly theme: string;
};

export const setShikiHighlight = StateEffect.define<ShikiHighlight | null>();

const highlightConfig = StateField.define<ShikiHighlight | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setShikiHighlight)) return effect.value;
    }
    return value;
  },
});

/** Shiki's FontStyle flags. */
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

/** Marks are shared across tokens with the same appearance, of which there are few. */
const markCache = new Map<string, Decoration>();

function markFor(token: ThemedToken): Decoration | null {
  const fontStyle = token.fontStyle ?? 0;
  if (!token.color && fontStyle === 0) return null;

  const declarations = [
    token.color ? `color:${token.color}` : "",
    fontStyle & ITALIC ? "font-style:italic" : "",
    fontStyle & BOLD ? "font-weight:bold" : "",
    fontStyle & UNDERLINE ? "text-decoration:underline" : "",
  ]
    .filter(Boolean)
    .join(";");

  let mark = markCache.get(declarations);
  if (!mark) {
    mark = Decoration.mark({ attributes: { style: declarations } });
    markCache.set(declarations, mark);
  }
  return mark;
}

function buildDecorations(doc: string, config: ShikiHighlight | null): DecorationSet {
  if (!config) return Decoration.none;

  const { tokens } = config.highlighter.codeToTokens(doc, {
    lang: config.lang,
    theme: config.theme,
  });

  const builder = new RangeSetBuilder<Decoration>();
  let position = 0;
  for (const line of tokens) {
    for (const token of line) {
      const end = position + token.content.length;
      const mark = markFor(token);
      if (mark && end > position) builder.add(position, end, mark);
      position = end;
    }
    // Shiki splits on newlines, which are therefore absent from the tokens.
    position += 1;
  }
  return builder.finish();
}

const shikiDecorations = StateField.define<DecorationSet>({
  create: (state) => buildDecorations(state.doc.toString(), state.field(highlightConfig)),
  update(decorations, transaction) {
    const configChanged = transaction.effects.some((effect) => effect.is(setShikiHighlight));
    if (!transaction.docChanged && !configChanged) return decorations;
    return buildDecorations(
      transaction.state.doc.toString(),
      transaction.state.field(highlightConfig),
    );
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Colors the document from Shiki's tokens, so the editor and the exported image
 * are painted from the same source and cannot drift apart.
 *
 * Retokenizes the whole document on every change, which is well within budget
 * for the snippet-sized inputs this app is built for.
 */
export function shikiHighlighting() {
  // Order matters: the decoration field reads the config field during creation.
  return [highlightConfig, shikiDecorations];
}
