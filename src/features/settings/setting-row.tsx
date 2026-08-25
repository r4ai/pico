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
   * @param origin the point that was pressed, for a change that looks better
   * arriving from where it was asked for than from nowhere. See
   * {@link crossFade}. Chosen from the keyboard there is no such point, and
   * the middle of the row stands in — the row is the thing the keyboard is on,
   * and it is nine millimetres across.
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
  // Where the last press in this row landed, because React Aria reports which
  // option was chosen and not what was pressed to choose it.
  //
  // Not every press chooses something — one dragged off the button before it
  // lands chooses nothing at all — so spending this on the next change and
  // putting it back is not enough on its own. A key clears it as well, and
  // between them a change made from the keyboard can never be cut in from the
  // last place a mouse happened to be.
  const pressed = useRef<RevealOrigin | null>(null);

  return (
    <SettingRow label={label}>
      {/* Watched from here rather than from the group, which is a React Aria
          component and forwards some DOM events and not others — and in the
          capture phase, because the button under the pointer stops both from
          getting any further than itself. */}
      <div
        onKeyDownCapture={() => {
          pressed.current = null;
        }}
        onPointerDownCapture={(event) => {
          pressed.current = { x: event.clientX, y: event.clientY };
        }}
      >
        <ToggleGroup
          aria-label={label}
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const next = keys.values().next().value;
            if (typeof next !== "string") return;
            const origin = pressed.current ?? middleOf(row.current);
            pressed.current = null;
            onChange(next as T, origin);
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
      </div>
    </SettingRow>
  );
}

/** The middle of the row of options, for a change nobody pointed at. */
function middleOf(row: HTMLElement | null): RevealOrigin | undefined {
  const box = row?.getBoundingClientRect();
  return box && { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
