import { BackgroundColorPicker } from "@/features/settings/background-color-picker";
import { Input } from "@/components/ui/input";
import { parseHexColor, type Background } from "@/features/settings/background";
import { PresetToggle } from "@/features/settings/setting-row";
import type { Settings } from "@/features/settings/settings";
import { THEMES } from "@/features/settings/theme";
import { useId, useState } from "react";

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
  const customColor =
    settings.background === "transparent" ? "#00000000" : parseHexColor(settings.background);
  const color = customColor ?? parseHexColor(themeColor)!;
  const invalid = draft !== null && parseHexColor(draft) === null;

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
        <fieldset className="flex min-w-0 flex-col gap-2" data-invalid={invalid || undefined}>
          <legend className="sr-only">Custom color</legend>
          <div className="flex items-center gap-2">
            <BackgroundColorPicker value={color} onChange={select} />
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
              Enter a 3-, 4-, 6-, or 8-digit HEX color.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
