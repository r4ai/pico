import { ButtonGroup } from "@/components/ui/button-group";
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
 * The two halves are drawn as one control — a single tinted surface under
 * both, a hairline where they meet, and hover lighting only the half the
 * pointer is over. Among the dock's ghost buttons the chevron used to read as
 * a fourth action floating beside a word, belonging to nothing in particular.
 * See `.pico-split`.
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
    <ButtonGroup className="pico-split">
      <DockButton busy={busy} onPress={() => onSave("png")}>
        <DockIcon pending={pending}>
          <DownloadIcon data-icon="inline-start" />
        </DockIcon>
        <DockLabel>Save</DockLabel>
      </DockButton>
      {/* Decorative, and deliberately not a `separator` role: the two halves
          are one control, and announcing a divider inside it would suggest
          they are two. */}
      <span aria-hidden className="pico-split-seam" />
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
    </ButtonGroup>
  );
}
