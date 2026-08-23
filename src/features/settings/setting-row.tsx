import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ReactNode } from "react";

export type SettingRowProps = {
  label: string;
  children: ReactNode;
};

export function SettingRow({ label, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}

export type PresetToggleProps<T extends string> = {
  label: string;
  options: readonly T[];
  /** Shown on the button; falls back to the option itself. */
  labelOf?: (option: T) => ReactNode;
  /** Needed when {@link labelOf} renders an icon rather than words. */
  ariaLabelOf?: (option: T) => string;
  value: T;
  onChange: (value: T) => void;
};

/**
 * A row of mutually exclusive presets.
 *
 * Presets rather than a slider throughout the sidebar: every stop is a value
 * somebody chose on purpose, and picking one is a single click instead of a
 * drag and a second-guess.
 */
export function PresetToggle<T extends string>({
  label,
  options,
  labelOf,
  ariaLabelOf,
  value,
  onChange,
}: PresetToggleProps<T>) {
  return (
    <SettingRow label={label}>
      <ToggleGroup
        disallowEmptySelection
        onSelectionChange={(keys) => {
          const next = keys.values().next().value;
          if (typeof next === "string") onChange(next as T);
        }}
        selectedKeys={[value]}
        size="sm"
        spacing={0}
        variant="outline"
      >
        {options.map((option) => (
          <ToggleGroupItem
            aria-label={ariaLabelOf?.(option)}
            className="pico-preset-item min-w-9 px-2 text-xs"
            id={option}
            key={option}
          >
            {labelOf?.(option) ?? option}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </SettingRow>
  );
}
