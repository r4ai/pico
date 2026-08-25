import type { LanguageId } from "@/features/editor/language";
import type { ExportFormat, ExportScale } from "@/features/export/export-image";
import type { ExportTask } from "@/features/export/use-export";
import type { Settings } from "@/features/settings/settings";
import type { RevealOrigin } from "@/lib/cross-fade";
import { createContext, use } from "react";

/** What the picture is, and the two ways of changing it. */
export type SettingsControl = {
  readonly settings: Settings;
  /**
   * @param origin where the change was asked for, when that is a place. Light
   * and dark grow out of the switch that asked for them; see {@link crossFade}.
   */
  readonly changeSettings: (patch: Partial<Settings>, origin?: RevealOrigin) => void;
  /** Naming the language by hand, which also stops Pico guessing at it. */
  readonly chooseLanguage: (lang: LanguageId) => void;
  readonly sidebarOpen: boolean;
  readonly setSidebarOpen: (open: boolean) => void;
};

/** The three things you might want to do with the picture, and how they are going. */
export type ExportActions = {
  readonly scale: ExportScale;
  readonly setScale: (scale: ExportScale) => void;
  readonly copy: () => void;
  readonly save: (format: ExportFormat) => void;
  readonly copyLink: () => void;
  /** Which control started the capture that is in flight, if any. */
  readonly running: ExportTask | undefined;
  /** True for a moment after the picture lands on the clipboard. */
  readonly copied: boolean;
  /** True for a moment after the link lands on the clipboard. */
  readonly linkCopied: boolean;
};

/**
 * What the chrome is handed, rather than what it is passed.
 *
 * Everything here belongs to the app and is used two or three components down,
 * and handing it over as props meant every one of them was named three times:
 * once where it is made, once in `Chrome`'s props, and once where it is finally
 * read. A control that wants one of these should be able to reach for it.
 *
 * Two contexts and not one, because they change at different rates. The export
 * actions close over the code and are new on every keystroke; the settings are
 * not, and nothing that only reads them should be re-rendered by typing.
 *
 * They stop at the chrome. The picture takes what it needs as props: it is one
 * component with one caller, and it is the thing on screen that a reader came
 * for — nothing about it should be findable from anywhere.
 */
export const SettingsControlContext = createContext<SettingsControl | null>(null);

export const ExportActionsContext = createContext<ExportActions | null>(null);

export function useSettingsControl(): SettingsControl {
  const control = use(SettingsControlContext);
  if (!control) throw new Error("useSettingsControl was called outside the chrome");
  return control;
}

export function useExportActions(): ExportActions {
  const actions = use(ExportActionsContext);
  if (!actions) throw new Error("useExportActions was called outside the chrome");
  return actions;
}
