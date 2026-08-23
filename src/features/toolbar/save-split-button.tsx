import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EXPORT_SCALES,
  type ExportFormat,
  type ExportScale,
  isExportScale,
} from "@/features/export/export-image";
import { ChevronUpIcon, DownloadIcon } from "lucide-react";

export type SaveSplitButtonProps = {
  scale: ExportScale;
  onScaleChange: (scale: ExportScale) => void;
  onSave: (format: ExportFormat) => void;
  disabled: boolean;
};

/**
 * Save, with the details tucked behind the chevron.
 *
 * The button itself saves a PNG at the current scale, which is what almost
 * everyone wants; the menu is there for the times it is not.
 */
export function SaveSplitButton({ scale, onScaleChange, onSave, disabled }: SaveSplitButtonProps) {
  return (
    <div className="flex items-center">
      <Button
        className="gap-1.5 rounded-r-none pr-2.5"
        disabled={disabled}
        onClick={() => onSave("png")}
        size="sm"
        variant="ghost"
      >
        <DownloadIcon className="size-4" />
        Save
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Export options"
            className="rounded-l-none px-1.5"
            disabled={disabled}
            size="sm"
            variant="ghost"
          >
            <ChevronUpIcon className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44" side="top">
          <DropdownMenuLabel>Resolution</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => {
              const parsed = Number(next);
              if (isExportScale(parsed)) onScaleChange(parsed);
            }}
            value={String(scale)}
          >
            {EXPORT_SCALES.map((option) => (
              <DropdownMenuRadioItem key={option} value={String(option)}>
                {option}× {option === 2 && <span className="ml-auto opacity-60">Retina</span>}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSave("png")}>Save as PNG</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onSave("svg")}>Save as SVG</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
