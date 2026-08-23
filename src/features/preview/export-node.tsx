import type { ShikiHighlight } from "@/features/editor/shiki-highlight";
import { CodeFrame } from "@/features/preview/code-frame";
import type { FrameColors } from "@/features/preview/frame-colors";
import { ShikiCode } from "@/features/preview/shiki-code";
import { SHADOW_ROOM } from "@/features/settings/appearance";
import type { Settings } from "@/features/settings/settings";
import type { CSSProperties, RefObject } from "react";

export type ExportNodeProps = {
  ref: RefObject<HTMLDivElement | null>;
  code: string;
  settings: Settings;
  colors: FrameColors;
  /** `null` until the first grammar and theme have loaded. */
  highlight: ShikiHighlight | null;
};

/**
 * The node the exporter photographs, parked off-screen.
 *
 * It stays mounted rather than being built on demand: re-tokenizing a snippet
 * costs about a millisecond, and always having a laid-out node makes exporting
 * a single synchronous read instead of a render-then-capture dance.
 *
 * The offset lives on the stage and never on the captured node itself. The
 * capture redraws the node's own styles inside an SVG, so a node positioned
 * off-screen paints itself off-screen there too, and the image comes out blank.
 *
 * The host's padding is what keeps the drop shadow inside the picture.
 */
export function ExportNode({ ref, code, settings, colors, highlight }: ExportNodeProps) {
  const style = { "--pico-shadow-room": SHADOW_ROOM[settings.shadow] } as CSSProperties;

  return (
    <div aria-hidden className="pico-export-stage">
      <div className="pico-export-host" ref={ref} style={style}>
        {highlight && (
          <CodeFrame colors={colors} settings={settings}>
            <ShikiCode code={code} highlight={highlight} showLineNumbers={settings.lineNumbers} />
          </CodeFrame>
        )}
      </div>
    </div>
  );
}
