import { GlassPanel } from "@/components/glass-panel";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  FONT_SIZE_IDS,
  FONT_SIZES,
  PADDING_IDS,
  RADIUS_IDS,
  SHADOW_IDS,
} from "@/features/settings/appearance";
import { FONT_IDS, FONTS } from "@/features/settings/fonts";
import { PresetToggle, SettingRow } from "@/features/settings/setting-row";
import type { Settings } from "@/features/settings/settings";
import {
  COLOR_MODES,
  THEME_IDS,
  THEMES,
  themeAccents,
  type ColorMode,
  type ThemeId,
} from "@/features/settings/theme";
import { usePanelFocus } from "@/features/settings/use-panel-focus";
import { useSidebarMode } from "@/features/settings/use-sidebar-mode";
import { MoonIcon, SunIcon, XIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId } from "react";

const SIZE_LABELS = { none: "None", sm: "S", md: "M", lg: "L", xl: "XL" };

export type SettingsSidebarProps = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
};

/**
 * Everything you might want to adjust, and nothing you would not.
 *
 * It stays mounted while closed so opening it is a transform rather than a
 * mount, and everything it holds is marked `inert` so nothing inside can be
 * tabbed to meanwhile. That goes on the box inside the panel rather than on
 * the panel, which React Aria rewrites on its way out of an open popover; see
 * `.pico-sidebar-body`. Because both this and the button that opens it spend
 * half their life out of reach, the keyboard has to be handed between them
 * deliberately; see {@link usePanelFocus}.
 *
 * Where the window is wide enough the panel takes a column of its own and the
 * canvas shifts over to make room; where it is not, it slides over the canvas
 * as a drawer, and the scrim behind it dismisses it. Which of the two it is
 * decides what it is, and not only how it looks: beside the picture it is a
 * second region of the same page, and on top of it, behind a scrim that
 * swallows every click, it is a dialog. See {@link useSidebarMode}.
 */
export function SettingsSidebar({ open, onClose, settings, onChange }: SettingsSidebarProps) {
  const panel = usePanelFocus(open);
  const titleId = useId();
  const drawer = useSidebarMode() === "drawer";

  // An Effect Event, so the listener is bound once per open rather than again
  // on every render of the parent that hands `onClose` down.
  const onEscape = useEffectEvent((event: KeyboardEvent) => {
    // Escape inside the editor is how the keyboard gets out of it, and closing
    // the settings from under someone doing that would be a surprise. See
    // CodeEditor.
    if (event.target instanceof Element && event.target.closest(".pico-editor")) return;
    onClose();
  });

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape(event);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      {/* Reachable by pointer only, and hidden from anything that is not one:
          Escape and the close button already cover the keyboard, and a second
          control called "Close settings" — one of them the whole window — is a
          choice nobody navigating by name should have to make. */}
      <button
        aria-hidden
        className="pico-sidebar-scrim"
        data-open={open}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <GlassPanel
        aria-labelledby={titleId}
        aria-modal={drawer || undefined}
        className="pico-sidebar"
        data-open={open}
        ref={panel}
        role={drawer ? "dialog" : "complementary"}
      >
        <div className="pico-sidebar-body" inert={!open}>
          {/* A div rather than a header: a bare <header> is a page-level
              banner landmark wherever it sits, and there is only supposed to
              be one. */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <h2 className="font-medium text-sm" id={titleId}>
              Settings
            </h2>
            {/* The stock ghost hover is a wash of `--muted`, which on glass
                this tinted is not a tint at all; see `.pico-glass-hover`. */}
            <Button
              aria-label="Close settings"
              className="pico-glass-hover pico-sidebar-close"
              onPress={onClose}
              size="icon"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </div>
          <Separator />

          <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
            <section className="flex flex-col gap-3">
              <SectionTitle>Theme</SectionTitle>
              <SearchableSelect
                adornment={<Swatch mode={settings.mode} theme={settings.theme} />}
                ariaLabel="Theme"
                onChange={(theme) => onChange({ theme })}
                options={THEME_IDS.map((id) => ({
                  value: id,
                  label: THEMES[id].label,
                  render: (
                    <span className="flex items-center gap-2">
                      <Swatch mode={settings.mode} theme={id} />
                      {THEMES[id].label}
                    </span>
                  ),
                }))}
                placeholder="Search themes"
                value={settings.theme}
              />

              <PresetToggle
                ariaLabelOf={(mode) => (mode === "light" ? "Light" : "Dark")}
                label="Appearance"
                labelOf={(mode) =>
                  mode === "light" ? (
                    <SunIcon className="size-3.5" />
                  ) : (
                    <MoonIcon className="size-3.5" />
                  )
                }
                onChange={(mode) => onChange({ mode })}
                options={COLOR_MODES}
                value={settings.mode}
              />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <SectionTitle>Type</SectionTitle>
              <SearchableSelect
                adornment={<span style={{ fontFamily: FONTS[settings.font].stack }}>Aa</span>}
                ariaLabel="Font"
                onChange={(font) => onChange({ font })}
                options={FONT_IDS.map((id) => ({
                  value: id,
                  label: FONTS[id].label,
                  render: (
                    <span className="flex items-center gap-2">
                      <span>{FONTS[id].label}</span>
                      {FONTS[id].note && (
                        <span className="text-muted-foreground text-xs">{FONTS[id].note}</span>
                      )}
                    </span>
                  ),
                }))}
                placeholder="Search fonts"
                value={settings.font}
              />

              <PresetToggle
                label="Size"
                labelOf={(id) => FONT_SIZES[id].replace("px", "")}
                onChange={(fontSize) => onChange({ fontSize })}
                options={FONT_SIZE_IDS}
                value={settings.fontSize}
              />

              {/* Named by aria-label alone, matching the row's own words.
                  The sr-only <label> this used to carry as well made two of
                  them, which is one more than a form field is allowed. */}
              <SettingRow label="Line numbers">
                <Switch
                  aria-label="Line numbers"
                  isSelected={settings.lineNumbers}
                  onChange={(lineNumbers) => onChange({ lineNumbers })}
                />
              </SettingRow>
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <SectionTitle>Frame</SectionTitle>
              <PresetToggle
                label="Padding"
                labelOf={(id) => SIZE_LABELS[id]}
                onChange={(padding) => onChange({ padding })}
                options={PADDING_IDS}
                value={settings.padding}
              />
              <PresetToggle
                label="Corners"
                labelOf={(id) => SIZE_LABELS[id]}
                onChange={(radius) => onChange({ radius })}
                options={RADIUS_IDS}
                value={settings.radius}
              />
              <PresetToggle
                label="Shadow"
                labelOf={(id) => SIZE_LABELS[id]}
                onChange={(shadow) => onChange({ shadow })}
                options={SHADOW_IDS}
                value={settings.shadow}
              />
            </section>
          </div>
        </div>
      </GlassPanel>
    </>
  );
}

/**
 * What a theme looks like, in sixteen pixels.
 *
 * A disc of the background alone was what this used to be, and in dark mode
 * twelve themes are twelve nearly identical near-blacks: the swatch said which
 * theme was selected only by sitting next to its name. Three bars in the
 * colours the theme actually gives keywords, function names and strings is a
 * snippet small enough to fit in the field and still unmistakably Gruvbox or
 * Night Owl.
 *
 * Purely decorative — every one of these sits beside the name it belongs to,
 * and a screen reader reading out three hex values would be noise.
 */
function Swatch({ theme, mode }: { theme: ThemeId; mode: ColorMode }) {
  const accents = themeAccents(theme, mode);
  return (
    <span
      aria-hidden
      className="pico-theme-swatch"
      style={{ background: THEMES[theme].colors[mode].background }}
    >
      <span style={{ background: accents.keyword, width: "55%" }} />
      <span style={{ background: accents.fn, width: "85%" }} />
      <span style={{ background: accents.string, width: "40%" }} />
    </span>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  );
}
