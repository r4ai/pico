import { CodeSurface } from "@/features/editor/code-surface";
import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import { CodeFrame } from "@/features/preview/code-frame";
import type { FrameColors } from "@/features/preview/frame-colors";
import type { Settings } from "@/features/settings/settings";

const PLACEHOLDER = "Paste your code here";

export type CanvasProps = {
  code: string;
  onCodeChange: (code: string) => void;
  settings: Settings;
  colors: FrameColors;
  highlight: ShikiHighlight | null;
  /** True while the frame's geometry is easing between two settings. */
  animateGeometry: boolean;
  lineNumberDigits: number;
  /** What the export node measured, or nothing until it has. */
  width: number | undefined;
  /**
   * True while the settings lie over the picture behind a scrim, when nothing
   * in here should be reachable.
   */
  blocked: boolean;
};

/**
 * The picture, and the room it hangs in.
 *
 * Everything a reader came for. The counterpart of {@link Chrome}, and unlike
 * it this is in the entry chunk and painted first: a shared link is a picture,
 * and the controls for changing it can arrive afterwards.
 */
export function Canvas({
  code,
  onCodeChange,
  settings,
  colors,
  highlight,
  animateGeometry,
  lineNumberDigits,
  width,
  blocked,
}: CanvasProps) {
  return (
    /* tabIndex, because the canvas scrolls: a scrollable box that cannot be
       focused cannot be scrolled from the keyboard, and a picture wider than
       the window would be unreachable without a pointer. It gives that up
       while the settings are a drawer over it, when there is nothing worth
       scrolling to. */
    <main className="pico-shell-canvas flex-1 overflow-auto" tabIndex={blocked ? -1 : 0}>
      {/* The only heading on a page whose entire content is one editor. It
          is what a screen reader announces on arrival, and what the document
          outline would otherwise be missing. */}
      <h1 className="sr-only">Pico — turn code into a picture</h1>

      {/* inert lives here rather than on <main>, which React Aria writes to
          itself: it marks everything outside an open popover inert and puts
          it back on close, and "back" is whatever it found there — so the
          first combobox in the settings would hand the canvas to the keyboard
          again as it closed. It never walks this far down. */}
      <div
        className="pico-canvas-stage flex min-h-full w-full min-w-max items-center justify-center"
        inert={blocked}
      >
        <CodeFrame
          animateGeometry={animateGeometry}
          colors={colors}
          lineNumberDigits={lineNumberDigits}
          settings={settings}
          width={width}
        >
          <CodeSurface
            animatingGeometry={animateGeometry}
            highlight={highlight}
            label="Code"
            onChange={onCodeChange}
            placeholderText={PLACEHOLDER}
            showLineNumbers={settings.lineNumbers}
            value={code}
          />
        </CodeFrame>
      </div>
    </main>
  );
}
