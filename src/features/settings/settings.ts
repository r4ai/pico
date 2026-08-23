import type { LanguageId } from "@/features/editor/language";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_NUMBERS,
  DEFAULT_PADDING,
  DEFAULT_RADIUS,
  DEFAULT_SHADOW,
  type FontSizeId,
  type PaddingId,
  type RadiusId,
  type ShadowId,
} from "@/features/settings/appearance";
import { DEFAULT_FONT, type FontId } from "@/features/settings/fonts";
import {
  type ColorMode,
  DEFAULT_MODE,
  DEFAULT_THEME,
  type ThemeId,
} from "@/features/settings/theme";
import { DEFAULT_LANGUAGE } from "@/features/editor/language";

/** Everything that shapes the image, and therefore everything a shared link carries. */
export type Settings = {
  readonly lang: LanguageId;
  readonly theme: ThemeId;
  readonly mode: ColorMode;
  readonly padding: PaddingId;
  readonly radius: RadiusId;
  readonly shadow: ShadowId;
  readonly fontSize: FontSizeId;
  readonly font: FontId;
  readonly lineNumbers: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  lang: DEFAULT_LANGUAGE,
  theme: DEFAULT_THEME,
  mode: DEFAULT_MODE,
  padding: DEFAULT_PADDING,
  radius: DEFAULT_RADIUS,
  shadow: DEFAULT_SHADOW,
  fontSize: DEFAULT_FONT_SIZE,
  font: DEFAULT_FONT,
  lineNumbers: DEFAULT_LINE_NUMBERS,
};
