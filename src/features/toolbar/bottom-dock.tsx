import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LanguageId } from "@/features/editor/language";
import type { ExportFormat, ExportScale } from "@/features/export/export-image";
import type { ExportTask } from "@/features/export/use-export";
import { DockIcon, DockLabel } from "@/features/toolbar/dock-icon";
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
  /** Which control started the capture that is in flight, if any. */
  running: ExportTask | undefined;
  /** True for a moment after the picture lands on the clipboard. */
  copied: boolean;
  /** True for a moment after the link lands on the clipboard. */
  linkCopied: boolean;
};

/**
 * The only chrome on screen besides the sidebar toggle: what the code is, and
 * the three things you might want to do with it.
 *
 * Each button answers on itself: a spinner while its own capture runs, a tick
 * once it lands. See {@link DockIcon}.
 *
 * On a phone the words drop away and the icons carry the buttons alone; the
 * language is what survives, being the one thing no icon can stand in for.
 * See {@link DockLabel}.
 */
export function BottomDock({
  lang,
  onLangChange,
  scale,
  onScaleChange,
  onCopy,
  onSave,
  onCopyLink,
  running,
  copied,
  linkCopied,
}: BottomDockProps) {
  const busy = running !== undefined;

  return (
    <GlassPanel
      aria-label="Language and export"
      className="flex items-center gap-1 p-1.5"
      role="group"
    >
      <LanguagePicker onChange={onLangChange} value={lang} />
      <DockDivider />
      <Button isDisabled={busy} onPress={onCopy} size="sm" variant="ghost">
        <DockIcon done={copied} pending={running === "copy"}>
          <CopyIcon data-icon="inline-start" />
        </DockIcon>
        <DockLabel>Copy</DockLabel>
      </Button>
      <SaveSplitButton
        disabled={busy}
        onSave={onSave}
        onScaleChange={onScaleChange}
        pending={running === "save"}
        scale={scale}
      />
      <DockDivider />
      <Button onPress={onCopyLink} size="sm" variant="ghost">
        <DockIcon done={linkCopied}>
          <Link2Icon data-icon="inline-start" />
        </DockIcon>
        <DockLabel>Link</DockLabel>
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
