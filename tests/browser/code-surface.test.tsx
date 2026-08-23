import { CodeEditor } from "@/features/editor/code-editor";
import { CodeFrame } from "@/features/preview/code-frame";
import { ShikiCode } from "@/features/preview/shiki-code";
import { frameColorsOfTheme } from "@/features/settings/theme";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import "@/global.css";
import { afterEach, expect, it } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react/pure";

/**
 * The static rendering that holds the frame while CodeMirror downloads. It is
 * the same component the export node is made of, so it already lays out to the
 * pixel the way the editor does — except for the placeholder, which only the
 * live one draws, and which is the thing that could make the swap visible.
 */

const PLACEHOLDER = "Paste your code here";
const colors = frameColorsOfTheme(DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.mode);

let unmount: (() => Promise<void>) | undefined;

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

function frames(): DOMRect[] {
  return [...document.querySelectorAll(".pico-frame")].map((frame) =>
    frame.getBoundingClientRect(),
  );
}

it("holds an empty frame at exactly the height the editor will", async () => {
  const rendered = await render(
    <>
      <CodeFrame colors={colors} settings={DEFAULT_SETTINGS}>
        <div className="pico-code-standin">
          <ShikiCode code="" highlight={null} placeholder={PLACEHOLDER} showLineNumbers={false} />
        </div>
      </CodeFrame>
      <CodeFrame colors={colors} settings={DEFAULT_SETTINGS}>
        <CodeEditor
          animatingGeometry={false}
          highlight={null}
          label="Code"
          onChange={() => {}}
          placeholderText={PLACEHOLDER}
          showLineNumbers={false}
          value=""
        />
      </CodeFrame>
    </>,
  );
  unmount = rendered.unmount;

  const [standIn, editor] = frames();
  expect(standIn).toBeDefined();
  expect(editor).toBeDefined();
  expect(standIn?.height).toBeCloseTo(editor?.height ?? 0, 1);
});

it("says the same thing the editor's own placeholder does", async () => {
  const rendered = await render(
    <CodeFrame colors={colors} settings={DEFAULT_SETTINGS}>
      <div className="pico-code-standin">
        <ShikiCode code="" highlight={null} placeholder={PLACEHOLDER} showLineNumbers={false} />
      </div>
    </CodeFrame>,
  );
  unmount = rendered.unmount;

  expect(document.querySelector(".pico-placeholder")?.textContent).toBe(PLACEHOLDER);
});

it("draws nothing in place of an empty export", async () => {
  // The export node passes no placeholder: an empty document is an empty
  // picture, not a picture of an invitation to paste something.
  const rendered = await render(<ShikiCode code="" highlight={null} showLineNumbers={false} />);
  unmount = rendered.unmount;

  expect(document.querySelector(".pico-placeholder")).toBeNull();
  expect(document.querySelectorAll(".pico-line").length).toBe(1);
});
