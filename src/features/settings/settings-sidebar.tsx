import { GlassPanel } from "@/components/glass-panel";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { COLOR_MODES, THEME_IDS, THEMES } from "@/features/settings/theme";
import { MoonIcon, SunIcon, XIcon } from "lucide-react";
import { useEffect } from "react";

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
 * mount, and is marked `inert` so nothing inside can be tabbed to meanwhile.
 *
 * Where the window is wide enough the panel takes a column of its own and the
 * canvas shifts over to make room; where it is not, it slides over the canvas
 * as a drawer, and the scrim behind it dismisses it.
 */
export function SettingsSidebar({ open, onClose, settings, onChange }: SettingsSidebarProps) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);

  return (
    <>
      {/* Reachable by pointer only: Escape and the close button already cover
          the keyboard, and a second stop for the same action would be noise. */}
      <button
        aria-label="Close settings"
        className="pico-sidebar-scrim"
        data-open={open}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <GlassPanel aria-label="Settings" className="pico-sidebar" data-open={open} inert={!open}>
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <h2 className="font-medium text-sm">Settings</h2>
          <Button aria-label="Close settings" onPress={onClose} size="icon" variant="ghost">
            <XIcon />
          </Button>
        </header>
        <Separator />

        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          <section className="flex flex-col gap-3">
            <SectionTitle>Theme</SectionTitle>
            <SearchableSelect
              adornment={<Swatch color={THEMES[settings.theme].swatch[settings.mode]} />}
              ariaLabel="Theme"
              onChange={(theme) => onChange({ theme })}
              options={THEME_IDS.map((id) => ({
                value: id,
                label: THEMES[id].label,
                render: (
                  <span className="flex items-center gap-2">
                    <Swatch color={THEMES[id].swatch[settings.mode]} />
                    {THEMES[id].label}
                  </span>
                ),
              }))}
              placeholder="Search themes"
              value={settings.theme}
            />

            <PresetToggle
              ariaLabelOf={(mode) => mode}
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
                    <span style={{ fontFamily: FONTS[id].stack }}>{FONTS[id].label}</span>
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

            <SettingRow label="Line numbers">
              <Switch
                aria-label="Line numbers"
                id="line-numbers"
                isSelected={settings.lineNumbers}
                onChange={(lineNumbers) => onChange({ lineNumbers })}
              />
              <Label className="sr-only" htmlFor="line-numbers">
                Line numbers
              </Label>
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
      </GlassPanel>
    </>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="size-3.5 rounded-full border border-border" style={{ background: color }} />
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  );
}
