// Nothing reaches this module without waiting for code-editor.tsx, which is
// itself only ever imported dynamically. See useCodeEditor.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { tokenStyleCss } from "@/features/editor/token-style";
import { tokenize } from "@/features/editor/tokenize";
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

/** Marks are shared across tokens with the same appearance, of which there are few. */
const markCache = new Map<string, Decoration>();

function markFor(token: ThemedToken): Decoration | null {
  const style = tokenStyleCss(token);
  if (style === "") return null;

  let mark = markCache.get(style);
  if (!mark) {
    mark = Decoration.mark({ attributes: { style } });
    markCache.set(style, mark);
  }
  return mark;
}

function buildDecorations(doc: string, config: ShikiHighlight | null): DecorationSet {
  if (!config) return Decoration.none;

  const tokens = tokenize(doc, config);

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

/**
 * Colors the document from Shiki's tokens, so the editor and the exported image
 * are painted from the same source and cannot drift apart.
 *
 * Retokenizes the whole document on every change, which is well within budget
 * for the snippet-sized inputs this app is built for — and the result is
 * shared with the export node, which needs the same tokens for the same
 * document a moment later.
 *
 * @param initial whatever the highlighter has already loaded by the time the
 * editor is built, or `null` if that is nothing yet. The editor is built long
 * after the page is, so by then there usually is a grammar and a theme — and
 * one that opened uncoloured and was put right by an effect would flash in the
 * frame it took over from a static rendering that already had the colours. See
 * {@link CodeSurface}.
 */
export function shikiHighlighting(initial: ShikiHighlight | null) {
  const highlightConfig = StateField.define<ShikiHighlight | null>({
    create: () => initial,
    update(value, transaction) {
      for (const effect of transaction.effects) {
        if (effect.is(setShikiHighlight)) return effect.value;
      }
      return value;
    },
  });

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

  // Order matters: the decoration field reads the config field during creation.
  return [highlightConfig, shikiDecorations];
}
