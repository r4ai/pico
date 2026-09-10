import { Input } from "@/components/ui/input";
import { parseHexColor, type Background } from "@/features/settings/background";
import { PresetToggle } from "@/features/settings/setting-row";
import type { Settings } from "@/features/settings/settings";
import { THEMES } from "@/features/settings/theme";
import { useId, useState } from "react";

const PRESET_THEMES = ["github", "catppuccin", "rose-pine", "everforest"] as const;

export function BackgroundSetting({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const errorId = useId();
  const themeColor = THEMES[settings.theme].colors[settings.mode].background;
  const customColor = parseHexColor(settings.background);
  const color = customColor ?? parseHexColor(themeColor)!;
  const invalid = draft !== null && parseHexColor(draft) === null;
  const presets = [
    { label: "Transparent", color: "transparent" as const },
    ...PRESET_THEMES.map((theme) => ({
      label: THEMES[theme].label,
      color: parseHexColor(THEMES[theme].colors[settings.mode].background)!,
    })),
  ];

  function select(background: Background) {
    setDraft(null);
    onChange({ background });
  }

  function commit() {
    if (draft === null) return;
    const parsed = parseHexColor(draft);
    if (parsed) select(parsed);
  }

  return (
    <div className="flex flex-col gap-3">
      <PresetToggle
        label="Background"
        options={["theme", "custom"] as const}
        labelOf={(value) => (value === "theme" ? "Theme" : "Custom")}
        ariaLabelOf={(value) => (value === "theme" ? "Use theme background" : "Custom background")}
        value={settings.background === "theme" ? "theme" : "custom"}
        onChange={(value) => select(value === "theme" ? "theme" : color)}
      />
      {settings.background !== "theme" && (
        <>
          <PresetToggle
            label="Presets"
            options={presets.map((preset) => preset.color)}
            labelOf={(value) => (
              <span
                aria-hidden
                title={presets.find((preset) => preset.color === value)?.label}
                className="size-4 rounded-full border border-border"
                style={{
                  backgroundColor: value,
                  backgroundImage:
                    value === "transparent"
                      ? "conic-gradient(var(--muted-foreground) 25%, transparent 0 50%, var(--muted-foreground) 0 75%, transparent 0)"
                      : undefined,
                  backgroundSize: "8px 8px",
                }}
              />
            )}
            ariaLabelOf={(value) =>
              `${presets.find((preset) => preset.color === value)?.label ?? value} background`
            }
            value={settings.background}
            onChange={select}
          />
          <fieldset className="flex min-w-0 flex-col gap-2" data-invalid={invalid || undefined}>
            <legend className="mb-2 text-muted-foreground text-xs">Custom color</legend>
            <div className="flex items-center gap-2">
              <input
                aria-label="Background color picker"
                className="size-8 shrink-0 cursor-pointer rounded border border-input bg-transparent focus-visible:outline-2 focus-visible:outline-ring"
                type="color"
                value={color}
                onChange={(event) => select(event.currentTarget.value as Background)}
              />
              <Input
                aria-label="Background HEX"
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder="Transparent"
                value={draft ?? customColor ?? ""}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit();
                  }
                }}
              />
            </div>
            {invalid && (
              <p id={errorId} className="text-destructive text-xs">
                Enter a 3- or 6-digit HEX color.
              </p>
            )}
          </fieldset>
        </>
      )}
    </div>
  );
}
