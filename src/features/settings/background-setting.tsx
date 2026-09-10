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
  const color = parseHexColor(settings.background) ?? parseHexColor(themeColor)!;
  const invalid = draft !== null && parseHexColor(draft) === null;
  const presets = PRESET_THEMES.map((theme) => ({
    label: THEMES[theme].label,
    color: parseHexColor(THEMES[theme].colors[settings.mode].background)!,
  }));

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
        options={["theme", "transparent"] as const}
        labelOf={(value) => (value === "theme" ? "Theme" : "Transparent")}
        ariaLabelOf={(value) =>
          value === "theme" ? "Use theme background" : "Transparent background"
        }
        value={settings.background}
        onChange={select}
      />
      <PresetToggle
        label="Presets"
        options={presets.map((preset) => preset.color)}
        labelOf={(value) => (
          <span
            aria-hidden
            className="size-4 rounded-full border border-border"
            style={{ backgroundColor: value }}
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
            value={draft ?? color}
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
      <p className="text-muted-foreground text-xs">
        Theme follows the syntax theme. Custom colors stay until you choose Theme.
      </p>
    </div>
  );
}
