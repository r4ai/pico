import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type SearchableOption<T extends string> = {
  readonly value: T;
  /** Matched against what the reader types, and shown once chosen. */
  readonly label: string;
  /** How the option is drawn in the list. */
  readonly render: ReactNode;
};

export type SearchableSelectProps<T extends string> = {
  ariaLabel: string;
  placeholder: string;
  options: readonly SearchableOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** A small preview of the current value, drawn inside the field. */
  adornment?: ReactNode;
  /** Sizing and framing for the field. Defaults to filling its column. */
  className?: string;
  /** Which way the list opens. Defaults to below the field. */
  placement?: ComponentProps<typeof ComboboxContent>["placement"];
};

/**
 * A picker that stays usable as the list grows.
 *
 * Themes, fonts, and languages are the settings whose lists are open-ended,
 * and a row of buttons stops working somewhere past a dozen. The field is the
 * search box, so filtering is just typing where the value already is.
 */
export function SearchableSelect<T extends string>({
  ariaLabel,
  placeholder,
  options,
  value,
  onChange,
  adornment,
  className,
  placement,
}: SearchableSelectProps<T>) {
  return (
    <Combobox
      allowsEmptyCollection
      aria-label={ariaLabel}
      menuTrigger="focus"
      onChange={(next) => {
        if (typeof next === "string") onChange(next as T);
      }}
      value={value}
    >
      {/* Selecting the current value on focus keeps this a picker: the list is
          already open, and typing filters it instead of editing a name. */}
      <ComboboxInput
        className={cn("w-full", className)}
        onFocus={(event) => event.target.select()}
        placeholder={placeholder}
      >
        {adornment && <InputGroupAddon align="inline-start">{adornment}</InputGroupAddon>}
      </ComboboxInput>
      <ComboboxContent className="w-auto min-w-(--trigger-width)" placement={placement}>
        <ComboboxList renderEmptyState={() => <ComboboxEmpty>Nothing matches.</ComboboxEmpty>}>
          {options.map((option) => (
            <ComboboxItem id={option.value} key={option.value} textValue={option.label}>
              {option.render}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
