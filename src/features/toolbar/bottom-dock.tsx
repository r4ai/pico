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
    <GlassPanel
      aria-label="Language and export"
      className="flex items-center gap-1 p-1.5"
      role="group"
    >
      <LanguagePicker onChange={onLangChange} value={lang} />
      <DockDivider />
      <Button isDisabled={busy} onPress={onCopy} size="sm" variant="ghost">
        <CopyIcon data-icon="inline-start" />
        Copy
      </Button>
      <SaveSplitButton
        disabled={busy}
        onSave={onSave}
        onScaleChange={onScaleChange}
        scale={scale}
      />
      <DockDivider />
      <Button onPress={onCopyLink} size="sm" variant="ghost">
        <Link2Icon data-icon="inline-start" />
        Link
      </Button>
    </GlassPanel>
  );
}

/**
 * A hairline between two groups of controls.
 *
 * Short and centred rather than the full height of the dock: it is there to
 * group, and a rule running edge to edge would read as a wall.
 */
function DockDivider() {
  return <Separator className="mx-1 h-5 self-center!" orientation="vertical" />;
}
