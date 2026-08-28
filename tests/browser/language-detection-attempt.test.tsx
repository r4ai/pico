import type { LanguageId } from "@/features/editor/language";
import { useLanguageDetection } from "@/features/editor/use-language-detection";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { cleanup, renderHook } from "vitest-browser-react/pure";

const { detect } = vi.hoisted(() => ({
  detect: vi.fn<(code: string) => Promise<LanguageId | undefined>>(),
}));

vi.mock("@/features/editor/language-detector", () => ({
  detectLanguageOffThread: detect,
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(async () => {
  vi.useRealTimers();
  detect.mockReset();
  await cleanup();
});

it("tries an inconclusive document only once, then rearms after it is cleared", async () => {
  detect.mockResolvedValue(undefined);
  const onDetect = vi.fn();
  const rendered = await renderHook(
    (props) => useLanguageDetection({ code: props!.code, enabled: true, onDetect }),
    { initialProps: { code: "an inconclusive document" } },
  );

  await vi.advanceTimersByTimeAsync(400);
  expect(detect).toHaveBeenCalledTimes(1);
  await rendered.rerender({ code: "an inconclusive document with another edit" });
  await vi.advanceTimersByTimeAsync(400);
  expect(detect).toHaveBeenCalledTimes(1);

  await rendered.rerender({ code: "" });
  await rendered.rerender({ code: "a new document" });
  await vi.advanceTimersByTimeAsync(400);
  expect(detect).toHaveBeenCalledTimes(2);
  expect(onDetect).not.toHaveBeenCalled();
});
