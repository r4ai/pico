import { useExportActions, useSettingsControl } from "@/features/chrome-context";
import { SettingsSidebar } from "@/features/settings/settings-sidebar";
import { SidebarToggle } from "@/features/settings/sidebar-toggle";
import { BottomDock } from "@/features/toolbar/bottom-dock";
import { I18nProvider } from "react-aria-components";

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
 *
 * What it needs comes from context rather than from props; see
 * {@link SettingsControlContext}. This component takes none, which is what
 * makes it the seam it is: everything below is reached from here, and nothing
 * above has to name what any of it wants.
 */
export default function Chrome() {
  const { settings, changeSettings, chooseLanguage, sidebarOpen, setSidebarOpen } =
    useSettingsControl();
  const { scale, setScale, copy, save, copyLink, running, copied, linkCopied } = useExportActions();

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
          onCopy={copy}
          onCopyLink={copyLink}
          onLangChange={chooseLanguage}
          onSave={save}
          onScaleChange={setScale}
          running={running}
          scale={scale}
        />
      </div>

      <SidebarToggle hidden={sidebarOpen} onOpen={() => setSidebarOpen(true)} />
      <SettingsSidebar
        onChange={changeSettings}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        settings={settings}
      />
    </I18nProvider>
  );
}
