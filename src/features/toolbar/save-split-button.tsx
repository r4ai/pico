import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EXPORT_SCALES,
  type ExportFormat,
  type ExportScale,
  isExportScale,
} from "@/features/export/export-image";
import { DockButton } from "@/features/toolbar/dock-button";
import { DockIcon, DockLabel } from "@/features/toolbar/dock-icon";
import { ChevronUpIcon, DownloadIcon } from "lucide-react";

export type SaveSplitButtonProps = {
  scale: ExportScale;
  onScaleChange: (scale: ExportScale) => void;
  onSave: (format: ExportFormat) => void;
  /** True while any capture is running. */
  busy: boolean;
  /** True while this button's own capture is running. */
  pending: boolean;
};

/**
 * Save, with the details tucked behind the chevron.
 *
 * The button itself saves a PNG at the current scale, which is what almost
 * everyone wants; the menu is there for the times it is not.
 *
 * The two halves are one control, and what says so is that they touch: the
 * dock sets everything else a gap apart. Nothing else marks them out. Drawn on
 * a tinted surface of their own, as they were, Save was the only button in a
 * row of four with a background — which pointed out, of the four, the one
 * nobody needs pointing out. See `.pico-split`.
 *
 * The chevron stays live while a capture runs. It opens a menu rather than
 * doing anything, the resolution it sets applies to the next capture rather
 * than the one in flight, and the two save commands inside it are refused the
 * same way this button is.
 */
export function SaveSplitButton({
  scale,
  onScaleChange,
  onSave,
  busy,
  pending,
}: SaveSplitButtonProps) {
  return (
    // A group rather than two loose buttons: the chevron belongs to Save, and
    // nothing else in the dock does.
    <div className="pico-split" role="group">
      <DockButton busy={busy} onPress={() => onSave("png")}>
        <DockIcon pending={pending}>
          <DownloadIcon data-icon="inline-start" />
        </DockIcon>
        <DockLabel>Save</DockLabel>
      </DockButton>
      <DropdownMenuTrigger>
        {/* Named for the button it belongs to rather than for the dock, so
            what it opens is obvious from the name alone. */}
        <DockButton aria-label="Save options" className="px-1.5">
          <ChevronUpIcon className="pico-split-chevron opacity-70" />
        </DockButton>
        <DropdownMenu className="w-auto min-w-44" placement="top end">
          <DropdownMenuGroup
            onSelectionChange={(keys) => {
              const next = keys === "all" ? undefined : keys.values().next().value;
              const parsed = Number(next);
              if (isExportScale(parsed)) onScaleChange(parsed);
            }}
            selectedKeys={[String(scale)]}
            selectionMode="single"
          >
            <DropdownMenuLabel>Resolution</DropdownMenuLabel>
            {EXPORT_SCALES.map((option) => (
              <DropdownMenuItem id={String(option)} key={option} textValue={`${option}x`}>
                {option}× {option === 2 && <span className="ml-auto opacity-60">Retina</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onAction={() => onSave("png")}>Save as PNG</DropdownMenuItem>
          <DropdownMenuItem onAction={() => onSave("svg")}>Save as SVG</DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
    </div>
  );
}
