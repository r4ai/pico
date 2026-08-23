import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import type { ReactNode } from "react";

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
};

/**
 * A picker that stays usable as the list grows.
 *
 * Themes and fonts are the two settings whose options are open-ended, and a
 * grid of buttons stops working somewhere past a dozen. The field is the
 * search box, so filtering is just typing where the value already is.
 */
export function SearchableSelect<T extends string>({
  ariaLabel,
  placeholder,
  options,
  value,
  onChange,
  adornment,
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
      <ComboboxInput onFocus={(event) => event.target.select()} placeholder={placeholder}>
        {adornment && <InputGroupAddon align="inline-start">{adornment}</InputGroupAddon>}
      </ComboboxInput>
      <ComboboxContent>
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
