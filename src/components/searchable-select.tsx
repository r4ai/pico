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
import {
  type ComponentProps,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ComboBoxStateContext } from "react-aria-components";

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
  /** Framing for the field. */
  className?: string;
  /** Which way the list opens. Defaults to below the field. */
  placement?: ComponentProps<typeof ComboboxContent>["placement"];
  /**
   * `fill` takes the width of its column; `content` shrinks to whatever the
   * field is currently showing. Defaults to `fill`.
   */
  width?: "fill" | "content";
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
  width = "fill",
}: SearchableSelectProps<T>) {
  const field =
    width === "content" ? (
      <ElasticField adornment={adornment} className={className} placeholder={placeholder} />
    ) : (
      /* Selecting the current value on focus keeps this a picker: the list is
         already open, and typing filters it instead of editing a name. */
      <ComboboxInput
        className={cn("w-full", className)}
        onFocus={(event) => event.target.select()}
        placeholder={placeholder}
      >
        {adornment && <InputGroupAddon align="inline-start">{adornment}</InputGroupAddon>}
      </ComboboxInput>
    );

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
      {field}
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

type ElasticFieldProps = {
  adornment?: ReactNode;
  className?: string;
  placeholder: string;
};

/**
 * A field only as wide as the text it is showing.
 *
 * The dock cannot reserve room for the longest name in the list, so a hidden
 * copy of the current text is measured and the input animates to that width —
 * which means the field also grows and shrinks under the reader's typing.
 */
function ElasticField({ adornment, className, placeholder }: ElasticFieldProps) {
  const state = useContext(ComboBoxStateContext);
  const shown = state?.inputValue || placeholder;
  const sizer = useRef<HTMLSpanElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const text = sizer.current;
    const input = field.current;
    if (!text || !input) return;
    // The span measures the glyphs; the width we set is a border box, so the
    // input's own padding and border have to be added back or it clips.
    const style = getComputedStyle(input);
    const frame =
      parseFloat(style.paddingInlineStart) +
      parseFloat(style.paddingInlineEnd) +
      parseFloat(style.borderInlineStartWidth) +
      parseFloat(style.borderInlineEndWidth);
    setWidth(Math.ceil(text.getBoundingClientRect().width + frame));
  }, [shown]);

  return (
    <ComboboxInput
      className={cn(
        "w-auto [&>input]:flex-none [&>input]:transition-[width] [&>input]:duration-200 [&>input]:ease-glass motion-reduce:[&>input]:transition-none",
        className,
      )}
      onFocus={(event) => event.target.select()}
      placeholder={placeholder}
      ref={field}
      style={{ width }}
    >
      {/* Out of flow and invisible, so measuring it costs the layout nothing.
          Its type has to match the input's or the field lands a few px off. */}
      <span
        aria-hidden
        className="invisible absolute whitespace-pre text-base md:text-sm"
        ref={sizer}
      >
        {shown}
      </span>
      {adornment && <InputGroupAddon align="inline-start">{adornment}</InputGroupAddon>}
    </ComboboxInput>
  );
}
