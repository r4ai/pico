import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

export type SearchableOption<T extends string> = {
  readonly value: T;
  /** Matched against what the reader types. */
  readonly label: string;
  /** How the option is drawn, in the list and on the trigger. */
  readonly render: ReactNode;
};

export type SearchableSelectProps<T extends string> = {
  ariaLabel: string;
  placeholder: string;
  options: readonly SearchableOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A picker that stays usable as the list grows.
 *
 * Themes and fonts are the two settings whose options are open-ended, and a
 * grid of buttons stops working somewhere past a dozen. Typing to filter keeps
 * the control the same size no matter how many there are.
 */
export function SearchableSelect<T extends string>({
  ariaLabel,
  placeholder,
  options,
  value,
  onChange,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label={ariaLabel}
          className="w-full justify-between px-2.5 font-normal"
          role="combobox"
          size="sm"
          variant="outline"
        >
          {selected?.render ?? placeholder}
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command>
          <CommandInput className="h-9" placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  keywords={[option.label]}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  value={option.value}
                >
                  {option.render}
                  <CheckIcon
                    className={
                      option.value === value ? "ml-auto size-4" : "ml-auto size-4 opacity-0"
                    }
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
