import type { LanguageId } from "@/features/editor/language";
import type { ExportFormat, ExportScale } from "@/features/export/export-image";
import type { ExportTask } from "@/features/export/use-export";
import { SettingsSidebar } from "@/features/settings/settings-sidebar";
import type { Settings } from "@/features/settings/settings";
import type { RevealOrigin } from "@/lib/cross-fade";
import { SidebarToggle } from "@/features/settings/sidebar-toggle";
import { BottomDock } from "@/features/toolbar/bottom-dock";
import { I18nProvider } from "react-aria-components";

export type ChromeProps = {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>, origin?: RevealOrigin) => void;
  onLangChange: (lang: LanguageId) => void;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  scale: ExportScale;
  onScaleChange: (scale: ExportScale) => void;
  onCopy: () => void;
  onSave: (format: ExportFormat) => void;
  onCopyLink: () => void;
  running: ExportTask | undefined;
  copied: boolean;
  linkCopied: boolean;
};

/**
 * Everything on screen that is not the picture.
 *
 * Split out of the entry chunk and loaded on its own. The dock and the sidebar
 * are the whole of Pico's use of React Aria, which is the largest thing in the
 * bundle after CodeMirror and React itself — and none of it is needed to lay
 * out and paint the one thing somebody came for. The editor arrives first and
 * the chrome rises into place behind it, which is the entrance it was already
 * animating anyway.
 *
 * Both surfaces are `position: fixed`, so arriving late moves nothing.
 */
export default function Chrome({
  settings,
  onSettingsChange,
  onLangChange,
  sidebarOpen,
  onSidebarOpenChange,
  scale,
  onScaleChange,
  onCopy,
  onSave,
  onCopyLink,
  running,
  copied,
  linkCopied,
}: ChromeProps) {
  return (
    /* React Aria names its own controls — the button that opens a picker, what
       a list of options is called — and it names them in the browser's
       language, not the document's. Pico is written in English and says so in
       `<html lang="en">`, so on a Japanese browser a screen reader was being
       handed Japanese words to read with English pronunciation. One language,
       and it is the one the page declares; the day Pico is translated, both
       move together. */
    <I18nProvider locale="en-US">
      <div className="pico-shell-dock">
        <BottomDock
          copied={copied}
          lang={settings.lang}
          linkCopied={linkCopied}
          onCopy={onCopy}
          onCopyLink={onCopyLink}
          onLangChange={onLangChange}
          onSave={onSave}
          onScaleChange={onScaleChange}
          running={running}
          scale={scale}
        />
      </div>

      <SidebarToggle hidden={sidebarOpen} onOpen={() => onSidebarOpenChange(true)} />
      <SettingsSidebar
        onChange={onSettingsChange}
        onClose={() => onSidebarOpenChange(false)}
        open={sidebarOpen}
        settings={settings}
      />
    </I18nProvider>
  );
}
