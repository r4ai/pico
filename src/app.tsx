import { useBriefFlag } from "@/components/use-brief-flag";
import { Toaster } from "@/components/toaster";
import { CodeSurface } from "@/features/editor/code-surface";
import type { LanguageId } from "@/features/editor/language";
import { useLanguageDetection } from "@/features/editor/use-language-detection";
import { useShikiHighlight } from "@/features/editor/use-shiki-highlight";
import { type ExportScale, DEFAULT_SCALE } from "@/features/export/export-image";
import { useExport } from "@/features/export/use-export";
import { CodeFrame } from "@/features/preview/code-frame";
import { frameColorsOf } from "@/features/preview/frame-colors";
import { ExportNode } from "@/features/preview/export-node";
import {
  buildShareUrl,
  hasBrokenCodeParam,
  hasExplicitLanguage,
  useCode,
  useSettings,
} from "@/features/settings/search-params";
import { FONTS } from "@/features/settings/fonts";
import { frameColorsOfTheme, shikiThemeOf } from "@/features/settings/theme";
import { useFontReady } from "@/features/settings/use-font-ready";
import { useSidebarMode } from "@/features/settings/use-sidebar-mode";
import { useSidebarOpen } from "@/features/settings/use-sidebar-open";
import {
  PREVIEW_GEOMETRY_DURATION_MS,
  PREVIEW_GEOMETRY_GRACE_MS,
} from "@/features/settings/appearance";
import type { Settings } from "@/features/settings/settings";
import { crossFade, type RevealOrigin } from "@/lib/cross-fade";
import { isThemeLoaded } from "@/lib/shiki";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/toast";

const Chrome = lazy(() => import("@/features/chrome"));

const PLACEHOLDER = "Paste your code here";

/** Settings that change how much room the picture takes. */
const GEOMETRY_SETTINGS = new Set<keyof Settings>(["padding", "font", "fontSize", "lineNumbers"]);

/** Settings that change nothing but color, and so can simply be dissolved into. */
const COLOR_SETTINGS = new Set<keyof Settings>(["theme", "mode"]);

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

  const highlight = useShikiHighlight(settings.lang, shikiThemeOf(settings.theme, settings.mode));
  // highlight.theme, not the requested one: while a new theme loads the
  // highlighter still only knows the previous one, and asking it for a theme it
  // has not loaded throws. Until the very first one arrives the registry's own
  // copy of the colors stands in, so the frame is never unpainted.
  const colors = highlight
    ? frameColorsOf(highlight.highlighter.getTheme(highlight.theme))
    : frameColorsOfTheme(settings.theme, settings.mode);

  const { running, copied, copy, save } = useExport({ node: exportNode, settings, scale });
  const linkCopied = useBriefFlag();
  const {
    on: animateGeometry,
    raise: animatePreviewGeometry,
    lower: stopPreviewGeometry,
  } = useBriefFlag(PREVIEW_GEOMETRY_DURATION_MS + PREVIEW_GEOMETRY_GRACE_MS);
  const lineNumberDigits = String(code.split("\n").length).length;

  const fontPhase = useFontReady(FONTS[settings.font]);
  const shownPhase = useRef(fontPhase);
  useEffect(() => {
    // The frame was on screen in a stand-in font and is about to be remeasured
    // in the real one. Everything about its size is about to change, so it
    // changes the way a settings action does rather than in one frame.
    if (shownPhase.current === "fallback" && fontPhase === "ready") animatePreviewGeometry();
    shownPhase.current = fontPhase;
  }, [animatePreviewGeometry, fontPhase]);

  const changeSettings = useCallback(
    (patch: Partial<Settings>, origin?: RevealOrigin) => {
      const keys = Object.keys(patch) as (keyof Settings)[];
      if (keys.some((key) => GEOMETRY_SETTINGS.has(key))) animatePreviewGeometry();

      // Only when the whole patch is color, and only when those colors can be
      // on screen in the same frame as the rest of the change.
      //
      // A patch that also moves something has geometry of its own to ease, and
      // a dissolve laid over that would be two answers to the same action. And
      // the frame's colors come from the theme the highlighter has actually
      // loaded, not the one that was asked for — so on the first switch to a
      // theme the snapshot would be taken with the old picture still in it, and
      // the new one would arrive partway through the dissolve or, on a slow
      // link, just as it ended: a snap at the end of a fade, which is worse
      // than either alone. Once the theme is warm — every switch after the
      // first, which is when anyone is going back and forth — everything moves
      // together — and the counterpart of a pair is warmed the moment the
      // settings are opened, so "the first switch" is usually not one anybody
      // reaches. See `warmTheme`.
      const next = { ...settings, ...patch };
      if (
        keys.every((key) => COLOR_SETTINGS.has(key)) &&
        isThemeLoaded(shikiThemeOf(next.theme, next.mode))
      ) {
        crossFade(() => void setSettings(patch), origin);
        return;
      }
      void setSettings(patch);
    },
    [animatePreviewGeometry, setSettings, settings],
  );

  const changeCode = useCallback(
    (nextCode: string) => {
      stopPreviewGeometry();
      void setCode(nextCode);
    },
    [setCode, stopPreviewGeometry],
  );

  // The export node is deliberately not deferred. Rendering it at a low
  // priority would take a tokenization and a span per token off the path a
  // keystroke travels, but nothing orders that background commit against a
  // capture: once the exporter module and the fonts are warm, everything the
  // capture awaits settles in microtasks, and the picture would come out
  // missing the last keystrokes. The saving was single digit percentages of
  // one keystroke; the failure is the wrong image, silently.

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
      linkCopied.raise();
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
  }, [code, linkCopied, settings]);

  return (
    <div
      className="pico-shell relative flex h-full flex-col"
      data-font-phase={fontPhase}
      data-sidebar-open={sidebarOpen}
    >
      {/* The hidden export frame lays out every line, so its measured width is
          stable even while CodeMirror virtualises lines during scrolling.

          tabIndex, because the canvas scrolls: a scrollable box that cannot be
          focused cannot be scrolled from the keyboard, and a picture wider than
          the window would be unreachable without a pointer. It gives that up
          while the settings are a drawer over it, when there is nothing worth
          scrolling to. */}
      <main className="pico-shell-canvas flex-1 overflow-auto" tabIndex={canvasBlocked ? -1 : 0}>
        {/* The only heading on a page whose entire content is one editor. It
            is what a screen reader announces on arrival, and what the document
            outline would otherwise be missing. */}
        <h1 className="sr-only">Pico — turn code into a picture</h1>

        {/* inert lives here rather than on <main>, which React Aria writes to
            itself: it marks everything outside an open popover inert and puts
            it back on close, and "back" is whatever it found there — so the
            first combobox in the settings would hand the canvas to the keyboard
            again as it closed. It never walks this far down. */}
        <div
          className="pico-canvas-stage flex min-h-full w-full min-w-max items-center justify-center"
          inert={canvasBlocked}
        >
          <CodeFrame
            animateGeometry={animateGeometry}
            colors={colors}
            lineNumberDigits={lineNumberDigits}
            settings={settings}
            width={frameWidth}
          >
            <CodeSurface
              animatingGeometry={animateGeometry}
              highlight={highlight}
              label="Code"
              onChange={changeCode}
              placeholderText={PLACEHOLDER}
              showLineNumbers={settings.lineNumbers}
              value={code}
            />
          </CodeFrame>
        </div>
      </main>

      {/* No fallback: the chrome has no placeholder worth drawing, and the
          editor underneath is already usable without it. */}
      <Suspense fallback={null}>
        <Chrome
          copied={copied}
          linkCopied={linkCopied.on}
          onCopy={copy}
          onCopyLink={copyLink}
          onLangChange={chooseLanguage}
          onSave={save}
          onScaleChange={setScale}
          onSettingsChange={changeSettings}
          onSidebarOpenChange={setSidebarOpen}
          running={running}
          scale={scale}
          settings={settings}
          sidebarOpen={sidebarOpen}
        />
      </Suspense>

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
