import { useBriefFlag } from "@/components/use-brief-flag";
import {
  type ExportFormat,
  type ExportScale,
  imageFileName,
  renderImage,
} from "@/features/export/export-image";
import type { Settings } from "@/features/settings/settings";
import { type RefObject, useCallback, useState } from "react";
import { toast } from "@/components/toast";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Runs a capture and says how it went instead of throwing.
 *
 * A plain function rather than part of the hook below, and the reason the two
 * commands there have no `try` of their own: React Compiler lowers neither a
 * `throw` inside a `try` nor a `finally`, and between them they left the whole
 * of `useExport` unoptimized — a hook the app re-runs on every keystroke.
 *
 * @returns what went wrong, or `undefined` if nothing did.
 */
async function attempt(work: () => Promise<void>): Promise<string | undefined> {
  try {
    await work();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Puts the picture on the clipboard.
 */
async function copyImage(node: HTMLElement, settings: Settings, scale: ExportScale): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("This browser cannot put images on the clipboard");
  }
  // Safari only honours a clipboard write that starts inside the click that
  // triggered it, so the promise goes in unresolved rather than awaited.
  const image = renderImage({ node, settings, format: "png", scale });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
}

/** Which control is waiting on a capture, so only that one shows it. */
export type ExportTask = "copy" | "save";

export type UseExportOptions = {
  node: RefObject<HTMLDivElement | null>;
  settings: Settings;
  scale: ExportScale;
};

/**
 * Copying and saving the picture.
 *
 * @returns `running` while a capture is in flight, naming the control that
 * started it so the dock can show progress in the right place and refuse to
 * queue a second one; and `copied` for the moment after one lands.
 */
export function useExport({ node, settings, scale }: UseExportOptions) {
  const [running, setRunning] = useState<ExportTask>();
  const copied = useBriefFlag();

  const save = useCallback(
    async (format: ExportFormat) => {
      const target = node.current;
      if (!target || running) return;
      setRunning("save");
      const failure = await attempt(async () => {
        const image = await renderImage({ node: target, settings, format, scale });
        download(image, imageFileName(format));
      });
      setRunning(undefined);
      if (failure) toast.error("Could not save the image.", { description: failure });
    },
    [running, node, scale, settings],
  );

  const copy = useCallback(async () => {
    const target = node.current;
    if (!target || running) return;
    setRunning("copy");
    const failure = await attempt(() => copyImage(target, settings, scale));
    setRunning(undefined);
    if (failure) {
      toast.error("Could not copy the image.", {
        description: `${failure} Saving it instead usually works.`,
      });
      return;
    }
    copied.raise();
    toast.success("Copied the image.");
  }, [running, copied, node, scale, settings]);

  return { running, copied: copied.on, copy, save };
}
