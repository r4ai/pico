import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LanguageId } from "@/features/editor/language";
import type { ExportFormat, ExportScale } from "@/features/export/export-image";
import { LanguagePicker } from "@/features/toolbar/language-picker";
import { SaveSplitButton } from "@/features/toolbar/save-split-button";
import { CopyIcon, Link2Icon } from "lucide-react";

export type BottomDockProps = {
  lang: LanguageId;
  onLangChange: (lang: LanguageId) => void;
  scale: ExportScale;
  onScaleChange: (scale: ExportScale) => void;
  onCopy: () => void;
  onSave: (format: ExportFormat) => void;
  onCopyLink: () => void;
  busy: boolean;
};

/**
 * The only chrome on screen besides the sidebar toggle: what the code is, and
 * the three things you might want to do with it.
 */
export function BottomDock({
  lang,
  onLangChange,
  scale,
  onScaleChange,
  onCopy,
  onSave,
  onCopyLink,
  busy,
}: BottomDockProps) {
  return (
    <GlassPanel className="flex items-center gap-1 p-1.5">
      <LanguagePicker onChange={onLangChange} value={lang} />
      <Separator className="mx-1 !h-5" orientation="vertical" />
      <Button className="gap-1.5 px-2.5" disabled={busy} onClick={onCopy} size="sm" variant="ghost">
        <CopyIcon className="size-4" />
        Copy
      </Button>
      <SaveSplitButton
        disabled={busy}
        onSave={onSave}
        onScaleChange={onScaleChange}
        scale={scale}
      />
      <Button className="gap-1.5 px-2.5" onClick={onCopyLink} size="sm" variant="ghost">
        <Link2Icon className="size-4" />
        Link
      </Button>
    </GlassPanel>
  );
}
