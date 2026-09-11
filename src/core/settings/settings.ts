import type { Background } from "@/core/settings/background";
import type { LanguageId } from "@/core/language/language";
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
} from "@/core/settings/appearance";
import { DEFAULT_FONT, type FontId } from "@/core/settings/fonts";
import { type ColorMode, DEFAULT_MODE, DEFAULT_THEME, type ThemeId } from "@/core/theme/theme";
import { DEFAULT_LANGUAGE } from "@/core/language/language";

/** Everything that shapes the image, and therefore everything a shared link carries. */
export type Settings = {
  readonly lang: LanguageId;
  readonly theme: ThemeId;
  readonly background: Background;
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
  background: "theme",
  mode: DEFAULT_MODE,
  padding: DEFAULT_PADDING,
  radius: DEFAULT_RADIUS,
  shadow: DEFAULT_SHADOW,
  fontSize: DEFAULT_FONT_SIZE,
  font: DEFAULT_FONT,
  lineNumbers: DEFAULT_LINE_NUMBERS,
};
