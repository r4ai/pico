import { CodeSurface } from "@/features/editor/components/code-surface";
import type { ShikiHighlight } from "@/core/highlight/shiki-highlight";
import { CodeFrame } from "@/features/preview/components/code-frame";
import type { FrameColors } from "@/core/theme/frame-colors";
import type { Settings } from "@/core/settings/settings";
import { MAX_FRAME_WIDTH, MIN_FRAME_WIDTH } from "@/core/settings/appearance";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";

const KEYBOARD_STEP = 20;

type ResizeGesture = {
  pointerId: number;
  startX: number;
  startWidth: number;
  holdScrollRoom: boolean;
  pointerOffset: number;
  stageLeft: number;
  viewportWidth: number;
  padding: number;
};

function clampWidth(width: number): number {
  return Math.max(MIN_FRAME_WIDTH, Math.min(MAX_FRAME_WIDTH, Math.round(width)));
}

const PLACEHOLDER = "Paste your code here";

export type CanvasProps = {
  code: string;
  onCodeChange: (code: string) => void;
  onWidthCommit: (width: Settings["width"]) => Promise<unknown>;
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
  onWidthCommit,
  settings,
  colors,
  highlight,
  animateGeometry,
  lineNumberDigits,
  width,
  blocked,
}: CanvasProps) {
  const canvasRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<ResizeGesture | null>(null);
  const commitId = useRef(0);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const shownWidth = draftWidth ?? (settings.width === "auto" ? width : settings.width);
  const frameSettings = draftWidth === null ? settings : { ...settings, width: draftWidth };
  const releaseScrollRoom = () => stageRef.current?.style.removeProperty("padding-right");

  const widthForPointer = (event: PointerEvent<HTMLDivElement>): number => {
    const active = gesture.current;
    if (!active) return MIN_FRAME_WIDTH;
    const right = event.clientX - active.pointerOffset;
    const boundary = active.stageLeft + active.viewportWidth - active.padding;
    const width = active.holdScrollRoom
      ? right - active.stageLeft - active.padding
      : right <= boundary
        ? 2 * (right - active.stageLeft - active.viewportWidth / 2)
        : right - active.stageLeft - active.padding;
    return clampWidth(width);
  };

  const finishResize = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const moved = Math.abs(event.clientX - active.startX) >= 2;
    const next = widthForPointer(event);
    gesture.current = null;
    if (!moved) {
      releaseScrollRoom();
      setDraftWidth(null);
      return;
    }
    setDraftWidth(next);
    const id = ++commitId.current;
    const settle = () => {
      if (id !== commitId.current) return;
      releaseScrollRoom();
      setDraftWidth(null);
    };
    void onWidthCommit(next).then(settle, settle);
  };

  const cancelResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== gesture.current?.pointerId) return;
    gesture.current = null;
    releaseScrollRoom();
    setDraftWidth(null);
  };

  const keyboardResize = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = shownWidth ?? MIN_FRAME_WIDTH;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = current - KEYBOARD_STEP;
        break;
      case "ArrowRight":
        next = current + KEYBOARD_STEP;
        break;
      case "Home":
        next = MIN_FRAME_WIDTH;
        break;
      case "End":
        next = MAX_FRAME_WIDTH;
        break;
      case "Enter":
        event.preventDefault();
        void onWidthCommit("auto");
        return;
      default:
        return;
    }
    event.preventDefault();
    void onWidthCommit(clampWidth(next));
  };

  return (
    /* tabIndex, because the canvas scrolls: a scrollable box that cannot be
       focused cannot be scrolled from the keyboard, and a picture wider than
       the window would be unreachable without a pointer. It gives that up
       while the settings are a drawer over it, when there is nothing worth
       scrolling to. */
    <main
      className="pico-shell-canvas flex-1 overflow-auto"
      ref={canvasRef}
      tabIndex={blocked ? -1 : 0}
    >
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
        ref={stageRef}
      >
        <div className="pico-resize-target">
          <CodeFrame
            animateGeometry={animateGeometry && draftWidth === null}
            colors={colors}
            lineNumberDigits={lineNumberDigits}
            ref={frameRef}
            settings={frameSettings}
            width={width}
          >
            <CodeSurface
              animatingGeometry={animateGeometry}
              wrapLines={frameSettings.width !== "auto"}
              highlight={highlight}
              label="Code"
              onChange={onCodeChange}
              placeholderText={PLACEHOLDER}
              showLineNumbers={settings.lineNumbers}
              value={code}
            />
          </CodeFrame>
          <div
            aria-label="Frame width"
            aria-description="Drag the frame edge to resize. Double-click or press Enter for auto width."
            aria-valuemax={MAX_FRAME_WIDTH}
            aria-valuemin={MIN_FRAME_WIDTH}
            aria-valuenow={clampWidth(shownWidth ?? MIN_FRAME_WIDTH)}
            aria-valuetext={
              draftWidth === null && settings.width === "auto"
                ? `Auto, ${Math.round(shownWidth ?? MIN_FRAME_WIDTH)} pixels`
                : `${Math.round(shownWidth ?? MIN_FRAME_WIDTH)} pixels`
            }
            className="pico-resize-handle"
            onDoubleClick={() => void onWidthCommit("auto")}
            onKeyDown={keyboardResize}
            onLostPointerCapture={cancelResize}
            onPointerCancel={cancelResize}
            onPointerDown={(event) => {
              if (gesture.current || (event.pointerType === "mouse" && event.button !== 0)) return;
              const frame = frameRef.current;
              const stage = stageRef.current;
              const canvas = canvasRef.current;
              if (!frame || !stage || !canvas) return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              ++commitId.current;
              const padding = Number.parseFloat(getComputedStyle(stage).paddingLeft);
              gesture.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startWidth: frame.getBoundingClientRect().width,
                holdScrollRoom: canvas.scrollLeft > 0,
                pointerOffset: event.clientX - frame.getBoundingClientRect().right,
                stageLeft: stage.getBoundingClientRect().left,
                viewportWidth:
                  canvas.clientWidth - Number.parseFloat(getComputedStyle(canvas).paddingLeft),
                padding,
              };
              setDraftWidth(Math.round(frame.getBoundingClientRect().width));
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Synthetic browser tests have no active pointer to capture.
              }
            }}
            onPointerMove={(event) => {
              const active = gesture.current;
              if (event.pointerId !== active?.pointerId) return;
              const next = widthForPointer(event);
              // Keep the stage's original scroll width while a wide frame is
              // shrinking. Otherwise the browser clamps scrollLeft and pins
              // the right edge to the viewport instead of the pointer.
              if (active.holdScrollRoom) {
                stageRef.current?.style.setProperty(
                  "padding-right",
                  `${active.padding + Math.max(0, active.startWidth - next)}px`,
                );
              }
              setDraftWidth(next);
            }}
            onPointerUp={finishResize}
            role="slider"
            tabIndex={blocked ? -1 : 0}
            title="Drag edge to resize · Double-click for auto width"
          >
            <span aria-hidden className="pico-resize-grip" />
          </div>
        </div>
      </div>
    </main>
  );
}
