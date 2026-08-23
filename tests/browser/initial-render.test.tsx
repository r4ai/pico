import { CodeEditor } from "@/features/editor/code-editor";
import { CodeFrame } from "@/features/preview/code-frame";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { frameColorsOfTheme, type ColorMode } from "@/features/settings/theme";
import "@/global.css";
import { type RefObject, useLayoutEffect, useRef } from "react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react/pure";

type FirstLayout = {
  readonly editorPresent: boolean;
  readonly editorBackground: string | undefined;
  readonly gutterBackground: string | undefined;
  readonly gutterBorderWidth: string | undefined;
  readonly gutterColor: string | undefined;
  readonly expectedGutterColor: string | undefined;
};

function firstLayoutOf(host: RefObject<HTMLDivElement | null>): FirstLayout {
  const frame = host.current?.querySelector<HTMLElement>(".pico-frame") ?? null;
  const editor = host.current?.querySelector<HTMLElement>(".cm-editor") ?? null;
  const gutter = host.current?.querySelector<HTMLElement>(".cm-gutters") ?? null;
  const editorStyle = editor ? getComputedStyle(editor) : undefined;
  const gutterStyle = gutter ? getComputedStyle(gutter) : undefined;
  const colorProbe = document.createElement("span");
  colorProbe.style.color = frame
    ? getComputedStyle(frame).getPropertyValue("--pico-line-number")
    : "";
  document.body.append(colorProbe);
  const expectedGutterColor = frame ? getComputedStyle(colorProbe).color : undefined;
  colorProbe.remove();

  return {
    editorPresent: editor !== null,
    editorBackground: editorStyle?.backgroundColor,
    gutterBackground: gutterStyle?.backgroundColor,
    gutterBorderWidth: gutterStyle?.borderRightWidth,
    gutterColor: gutterStyle?.color,
    expectedGutterColor,
  };
}

function LayoutReporter({
  host,
  report,
}: {
  host: RefObject<HTMLDivElement | null>;
  report: (layout: FirstLayout) => void;
}) {
  useLayoutEffect(() => {
    // React runs every layout effect in this commit before the microtask. A
    // passive effect runs later, after the browser has had a chance to paint.
    queueMicrotask(() => report(firstLayoutOf(host)));
  }, [host, report]);
  return null;
}

function FirstLayoutProbe({
  mode,
  report,
}: {
  mode: ColorMode;
  report: (layout: FirstLayout) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const settings = { ...DEFAULT_SETTINGS, mode, lineNumbers: true };
  const colors = frameColorsOfTheme(settings.theme, mode);

  return (
    <div ref={host}>
      <CodeFrame colors={colors} settings={settings}>
        <CodeEditor
          animatingGeometry={false}
          highlight={null}
          label="Code"
          onChange={() => {}}
          placeholderText="Paste your code here"
          showLineNumbers
          value="const answer = 42;"
        />
        <LayoutReporter host={host} report={report} />
      </CodeFrame>
    </div>
  );
}

async function advanceFrames(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  await cleanup();
});

describe("initial editor render", () => {
  it.each(["light", "dark"] as const)(
    "has complete geometry and theme colors in the initial %s render",
    async (mode) => {
      let firstLayout: FirstLayout | undefined;
      const report = (layout: FirstLayout) => {
        firstLayout ??= layout;
      };

      await render(<FirstLayoutProbe mode={mode} report={report} />);

      expect(firstLayout?.editorPresent).toBe(true);
      expect(firstLayout?.editorBackground).toBe("rgba(0, 0, 0, 0)");
      expect(firstLayout?.gutterBackground).toBe("rgba(0, 0, 0, 0)");
      expect(firstLayout?.gutterBorderWidth).toBe("0px");
      expect(firstLayout?.gutterColor).toBe(firstLayout?.expectedGutterColor);
    },
  );
});
