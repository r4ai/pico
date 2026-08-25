import { Toaster } from "@/components/toaster";
import { Canvas } from "@/features/canvas";
import { ExportActionsContext, SettingsControlContext } from "@/features/chrome-context";
import type { LanguageId } from "@/features/editor/language";
import { useLanguageChoice } from "@/features/editor/use-language-choice";
import { DEFAULT_SCALE, type ExportScale } from "@/features/export/export-image";
import { useExport } from "@/features/export/use-export";
import { ExportNode } from "@/features/preview/export-node";
import { useFrameColors } from "@/features/preview/use-frame-colors";
import { FONTS } from "@/features/settings/fonts";
import { useCode, useSettings } from "@/features/settings/search-params";
import { useColorModeClass } from "@/features/settings/use-color-mode-class";
import { useFontReady } from "@/features/settings/use-font-ready";
import { useSettingsTransition } from "@/features/settings/use-settings-transition";
import { useBrokenLinkNotice, useShareLink } from "@/features/settings/use-share-link";
import { useSidebarMode } from "@/features/settings/use-sidebar-mode";
import { useSidebarOpen } from "@/features/settings/use-sidebar-open";
import { lazy, Suspense, useCallback, useRef, useState } from "react";

const Chrome = lazy(() => import("@/features/chrome"));

/**
 * Where the picture, the chrome, and the copy of the picture that gets saved
 * are wired to each other.
 *
 * Nothing is decided here. Every rule Pico has about what happens when
 * something changes lives in the hook that owns it — how a settings change
 * reaches the screen, who decides the language, what the frame is painted
 * with — and this is the file that says which of them are on.
 */
export function App() {
  const [settings, setSettings] = useSettings();
  const [code, setCode] = useCode();
  const [scale, setScale] = useState<ExportScale>(DEFAULT_SCALE);
  const [frameWidth, setFrameWidth] = useState<number>();
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  // As a drawer the settings lie on top of the canvas behind a scrim, so the
  // canvas has to be out of the keyboard's reach for as long as they do.
  // Inset, the two sit side by side and the picture stays editable.
  const sidebarMode = useSidebarMode();
  const canvasBlocked = sidebarOpen && sidebarMode === "drawer";

  const exportNode = useRef<HTMLDivElement>(null);
  const fontPhase = useFontReady(FONTS[settings.font]);
  const { highlight, colors } = useFrameColors(settings);

  const setLanguage = useCallback((lang: LanguageId) => void setSettings({ lang }), [setSettings]);
  const chooseLanguage = useLanguageChoice({ code, setLanguage });

  const { animateGeometry, changeSettings, stopGeometryAnimation } = useSettingsTransition({
    apply: setSettings,
    fontPhase,
    settings,
  });

  const changeCode = useCallback(
    (nextCode: string) => {
      stopGeometryAnimation();
      void setCode(nextCode);
    },
    [setCode, stopGeometryAnimation],
  );

  const { running, copied, copy, save } = useExport({ node: exportNode, settings, scale });
  const { copyLink, linkCopied } = useShareLink({ code, settings });

  useColorModeClass(settings.mode);
  useBrokenLinkNotice();

  // The export node is deliberately not deferred. Rendering it at a low
  // priority would take a tokenization and a span per token off the path a
  // keystroke travels, but nothing orders that background commit against a
  // capture: once the exporter module and the fonts are warm, everything the
  // capture awaits settles in microtasks, and the picture would come out
  // missing the last keystrokes. The saving was single digit percentages of
  // one keystroke; the failure is the wrong image, silently.

  const lineNumberDigits = String(code.split("\n").length).length;

  return (
    <div
      className="pico-shell relative flex h-full flex-col"
      data-font-phase={fontPhase}
      data-sidebar-open={sidebarOpen}
    >
      <Canvas
        animateGeometry={animateGeometry}
        blocked={canvasBlocked}
        code={code}
        colors={colors}
        highlight={highlight}
        lineNumberDigits={lineNumberDigits}
        onCodeChange={changeCode}
        settings={settings}
        width={frameWidth}
      />

      <SettingsControlContext
        value={{ changeSettings, chooseLanguage, setSidebarOpen, settings, sidebarOpen }}
      >
        <ExportActionsContext
          value={{ copied, copy, copyLink, linkCopied, running, save, scale, setScale }}
        >
          {/* No fallback: the chrome has no placeholder worth drawing, and the
              editor underneath is already usable without it. */}
          <Suspense fallback={null}>
            <Chrome />
          </Suspense>
        </ExportActionsContext>
      </SettingsControlContext>

      {/* The hidden export frame lays out every line, so its measured width is
          stable even while CodeMirror virtualises lines during scrolling. */}
      <ExportNode
        code={code}
        colors={colors}
        highlight={highlight}
        lineNumberDigits={lineNumberDigits}
        onFrameWidthChange={setFrameWidth}
        ref={exportNode}
        settings={settings}
      />
      <Toaster theme={settings.mode} />
    </div>
  );
}
