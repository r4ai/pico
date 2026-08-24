import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RevealOrigin } from "@/lib/cross-fade";
import { type ReactNode, useRef } from "react";

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
  /**
   * @param origin the middle of the row that was pressed, for a change that
   * looks better arriving from where it was asked for than from nowhere. See
   * {@link crossFade}. The row rather than the button inside it: React Aria
   * reports which option was chosen and not what was pressed to choose it, and
   * at nine millimetres across the difference is not one anybody could point
   * at.
   */
  onChange: (value: T, origin: RevealOrigin | undefined) => void;
};

/**
 * A row of mutually exclusive presets.
 *
 * Presets rather than a slider throughout the sidebar: every stop is a value
 * somebody chose on purpose, and picking one is a single click instead of a
 * drag and a second-guess.
 *
 * The row's visible label names the group as well, or the choices would be
 * announced as a bare "S, M, L" with nothing saying what they size.
 */
export function PresetToggle<T extends string>({
  label,
  options,
  labelOf,
  ariaLabelOf,
  value,
  onChange,
}: PresetToggleProps<T>) {
  const row = useRef<HTMLDivElement>(null);

  return (
    <SettingRow label={label}>
      <ToggleGroup
        aria-label={label}
        disallowEmptySelection
        onSelectionChange={(keys) => {
          const next = keys.values().next().value;
          if (typeof next !== "string") return;
          const box = row.current?.getBoundingClientRect();
          onChange(next as T, box && { x: box.left + box.width / 2, y: box.top + box.height / 2 });
        }}
        ref={row}
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
