import { useBriefFlag } from "@/components/use-brief-flag";
import {
  type ExportFormat,
  type ExportScale,
  imageFileName,
  renderImage,
} from "@/features/export/export-image";
import type { Settings } from "@/features/settings/settings";
import { type RefObject, useCallback, useState } from "react";
import { toast } from "sonner";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
      try {
        download(
          await renderImage({ node: target, settings, format, scale }),
          imageFileName(format),
        );
      } catch (error) {
        toast.error("Could not save the image.", { description: describe(error) });
      } finally {
        setRunning(undefined);
      }
    },
    [running, node, scale, settings],
  );

  const copy = useCallback(async () => {
    const target = node.current;
    if (!target || running) return;
    setRunning("copy");
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("This browser cannot put images on the clipboard");
      }
      // Safari only honours a clipboard write that starts inside the click that
      // triggered it, so the promise goes in unresolved rather than awaited.
      const image = renderImage({ node: target, settings, format: "png", scale });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      copied.raise();
      toast.success("Copied the image.");
    } catch (error) {
      toast.error("Could not copy the image.", {
        description: `${describe(error)} Saving it instead usually works.`,
      });
    } finally {
      setRunning(undefined);
    }
  }, [running, copied, node, scale, settings]);

  return { running, copied: copied.on, copy, save };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
