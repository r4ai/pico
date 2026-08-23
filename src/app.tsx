import { Toaster } from "@/components/ui/sonner";
import { CodeEditor } from "@/features/editor/code-editor";
import type { LanguageId } from "@/features/editor/language";
import { useLanguageDetection } from "@/features/editor/use-language-detection";
import { useShikiHighlight } from "@/features/editor/use-shiki-highlight";
import { type ExportScale, DEFAULT_SCALE } from "@/features/export/export-image";
import { useExport } from "@/features/export/use-export";
import { CodeFrame } from "@/features/preview/code-frame";
import { frameColorsOf, TRANSPARENT_FRAME } from "@/features/preview/frame-colors";
import { ExportNode } from "@/features/preview/export-node";
import {
  buildShareUrl,
  hasBrokenCodeParam,
  hasExplicitLanguage,
  useCode,
  useSettings,
} from "@/features/settings/search-params";
import { SettingsSidebar } from "@/features/settings/settings-sidebar";
import { sidebarOpenAtom } from "@/features/settings/sidebar-state";
import { SidebarToggle } from "@/features/settings/sidebar-toggle";
import { shikiThemeOf } from "@/features/settings/theme";
import { BottomDock } from "@/features/toolbar/bottom-dock";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PLACEHOLDER = "Paste your code here";

export function App() {
  const [settings, setSettings] = useSettings();
  const [code, setCode] = useCode();
  const [scale, setScale] = useState<ExportScale>(DEFAULT_SCALE);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  // Once someone picks a language themselves, guessing would only fight them.
  const [languageChosen, setLanguageChosen] = useState(() =>
    hasExplicitLanguage(window.location.search),
  );

  const chooseLanguage = useCallback(
    (lang: LanguageId) => {
      setLanguageChosen(true);
      void setSettings({ lang });
    },
    [setSettings],
  );
  const exportNode = useRef<HTMLDivElement>(null);

  const themeName = shikiThemeOf(settings.theme, settings.mode);
  const highlight = useShikiHighlight(settings.lang, themeName);
  const colors = highlight
    ? frameColorsOf(highlight.highlighter.getTheme(themeName))
    : TRANSPARENT_FRAME;

  const { busy, copy, save } = useExport({ node: exportNode, settings, scale });

  useLanguageDetection({
    code,
    enabled: !languageChosen,
    onDetect: (lang) => void setSettings({ lang }),
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.mode === "dark");
  }, [settings.mode]);

  useEffect(() => {
    if (hasBrokenCodeParam(window.location.search)) {
      toast.error("That link's code could not be read.", {
        description: "It looks truncated or altered, so the editor started empty.",
      });
    }
  }, []);

  const copyLink = useCallback(async () => {
    const { url, tooLong } = buildShareUrl(
      settings,
      code,
      `${window.location.origin}${window.location.pathname}`,
    );
    try {
      await navigator.clipboard.writeText(url);
      if (tooLong) {
        toast.warning("Copied, but this link is very long.", {
          description: "Some apps and browsers cut off links this size.",
        });
      } else {
        toast.success("Copied the link.");
      }
    } catch {
      toast.error("Could not copy the link.");
    }
  }, [code, settings]);

  return (
    <div className="relative flex h-full flex-col">
      {/* The frame grows to fit long lines and this scrolls, rather than the
          frame being squeezed — the editor has to show the picture's real
          width or it is not a preview. */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full w-full min-w-max items-center justify-center p-10 pb-32">
          <CodeFrame colors={colors} settings={settings}>
            <CodeEditor
              highlight={highlight}
              onChange={setCode}
              placeholderText={PLACEHOLDER}
              showLineNumbers={settings.lineNumbers}
              value={code}
            />
          </CodeFrame>
        </div>
      </div>

      <div className="-translate-x-1/2 fixed bottom-6 left-1/2 z-20">
        <BottomDock
          busy={busy}
          lang={settings.lang}
          onCopy={copy}
          onCopyLink={copyLink}
          onLangChange={chooseLanguage}
          onSave={save}
          onScaleChange={setScale}
          scale={scale}
        />
      </div>

      <SidebarToggle hidden={sidebarOpen} onOpen={() => setSidebarOpen(true)} />
      <SettingsSidebar
        onChange={setSettings}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        settings={settings}
      />

      <ExportNode
        code={code}
        colors={colors}
        highlight={highlight}
        ref={exportNode}
        settings={settings}
      />
      <Toaster position="top-center" theme={settings.mode} />
    </div>
  );
}
