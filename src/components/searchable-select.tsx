import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { searchTextOf, type SearchableOption } from "@/components/searchable-option";
import { ComboboxFocus } from "@/components/combobox-focus";
import { cn } from "@/lib/utils";
import { useElasticWidth } from "@/components/use-elastic-width";
import { type ComponentProps, type ReactNode, useContext, useMemo, useRef, useState } from "react";
import { ComboBoxStateContext, ListLayout, useFilter, Virtualizer } from "react-aria-components";

export type { SearchableOption } from "@/components/searchable-option";

/**
 * Above this many options the list is virtualized.
 *
 * Every option is a real element in the popover, and the languages number in
 * the hundreds: opening the picker cost a dropped frame that opening the theme
 * or font list — five and three options — never did. Short lists keep the plain
 * rendering, which needs nothing to be told about how tall a row is.
 */
const VIRTUALIZE_FROM = 40;

/** Matches the option's own `py-1 text-sm`; asserted by a browser test. */
const OPTION_HEIGHT = 28;

/** Matches {@link ComboboxList}'s `p-1`, which the virtualizer has to lay out itself. */
const LIST_PADDING = 4;

/**
 * How many options the list shows before it scrolls.
 *
 * React Aria measures the room between the field and the edge of the window
 * and writes the result onto the popover as an inline `max-height`, which beats
 * anything a class can say — so the language picker, being 243 names anchored
 * to a dock at the bottom of the window, opened as a column of text the full
 * height of the screen, over the picture it is there to label. Ten rows is a
 * list; a screenful is a page.
 */
const MAX_VISIBLE_OPTIONS = 10;

const POPOVER_MAX_HEIGHT = MAX_VISIBLE_OPTIONS * OPTION_HEIGHT + LIST_PADDING * 2;

/**
 * How wide a virtualized list is drawn.
 *
 * A definite width, because a virtualized list has none of its own: its rows
 * are positioned absolutely, so they contribute nothing to the intrinsic width
 * their container is asked for. Shrink-to-fit around that ratchets — the
 * language picker measured 376px when it opened, 952px a moment later, and
 * filled the window inside two seconds, which is what it had been doing all
 * along.
 *
 * 16rem clears the longest name Pico lists, "WebAssembly Interface Types", by a
 * few pixels; the cap keeps it inside a phone.
 */
const VIRTUALIZED_WIDTH = "w-64 max-w-[calc(100vw-1.5rem)]";

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
  const popover = useRef<HTMLDivElement>(null);
  const virtualized = options.length > VIRTUALIZE_FROM;
  const { contains } = useFilter({ sensitivity: "base" });
  const defaultFilter = useMemo(() => {
    const searchTextByLabel = new Map(
      options.map((option) => [option.label, searchTextOf(option)]),
    );
    return (textValue: string, inputValue: string) =>
      contains(searchTextByLabel.get(textValue) ?? textValue, inputValue);
  }, [contains, options]);

  const field =
    width === "content" ? (
      <ElasticField
        adornment={adornment}
        className={className}
        placeholder={placeholder}
        selectedLabel={options.find((option) => option.value === value)?.label ?? placeholder}
      />
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

  const list = (
    <ComboboxList
      // A virtualized list lays out its own padding, and the class that draws
      // it for a plain one is a second copy: the virtualizer sizes its content
      // box to the width it was given and then sits inside a padding it does
      // not know about, so the list overflowed by exactly `p-1` either side and
      // 243 languages could be scrolled sideways by eight pixels.
      className={virtualized ? "p-0 data-empty:p-0" : undefined}
      renderEmptyState={() => <ComboboxEmpty>Nothing matches.</ComboboxEmpty>}
    >
      {options.map((option) => (
        <ComboboxItem id={option.value} key={option.value} textValue={option.label}>
          {option.render}
        </ComboboxItem>
      ))}
    </ComboboxList>
  );

  return (
    <Combobox
      allowsEmptyCollection
      aria-label={ariaLabel}
      defaultFilter={defaultFilter}
      menuTrigger="focus"
      onChange={(next) => {
        if (typeof next === "string") onChange(next as T);
      }}
      value={value}
    >
      {field}
      <ComboboxContent
        className={cn("min-w-(--trigger-width)", virtualized ? VIRTUALIZED_WIDTH : "w-auto")}
        maxHeight={POPOVER_MAX_HEIGHT}
        placement={placement}
        ref={popover}
      >
        <ComboboxFocus popover={popover} />
        {virtualized ? (
          <Virtualizer
            layout={ListLayout}
            layoutOptions={{ rowSize: OPTION_HEIGHT, padding: LIST_PADDING }}
          >
            {list}
          </Virtualizer>
        ) : (
          list
        )}
      </ComboboxContent>
    </Combobox>
  );
}

type ElasticFieldProps = {
  adornment?: ReactNode;
  className?: string;
  placeholder: string;
  /** What the current value is called, for the frames before the list has been built. */
  selectedLabel: string;
};

/**
 * A field only as wide as the text it is showing.
 *
 * The dock cannot reserve room for the longest name in the list, so the field
 * follows its own text — which means it grows and shrinks under the reader's
 * typing.
 *
 * Focus decides two things here. What the field falls back to when it holds no
 * text: the placeholder while someone is typing in it, and otherwise the name
 * of the current value, which the combobox does not put in the input until it
 * has built its list and would leave the dock jumping a frame after load. And
 * whether the width is animated at all: sliding is what makes typing feel
 * smooth, but a width that changes on its own — the first measurement, a
 * language the editor detected by itself — drags every control beside the
 * field along for a fifth of a second, and snapping to it is invisible.
 */
function ElasticField({ adornment, className, placeholder, selectedLabel }: ElasticFieldProps) {
  const state = useContext(ComboBoxStateContext);
  const [focused, setFocused] = useState(false);
  const shown = state?.inputValue || (focused ? placeholder : selectedLabel);
  const { sizerRef, fieldRef, width } = useElasticWidth(shown);

  return (
    <ComboboxInput
      className={cn(
        "w-auto [&>input]:max-w-32 [&>input]:flex-none [&>input]:text-ellipsis",
        focused &&
          "[&>input]:transition-[width] [&>input]:duration-200 [&>input]:ease-glass motion-reduce:[&>input]:transition-none",
        className,
      )}
      onBlur={() => setFocused(false)}
      onFocus={(event) => {
        if (!focused) event.target.select();
        setFocused(true);
      }}
      placeholder={placeholder}
      ref={fieldRef}
      style={{ width }}
    >
      {/* Out of flow and invisible, so measuring it costs the layout nothing.
          Its type has to match the input's or the field lands a few px off. */}
      <span
        aria-hidden
        className="invisible absolute whitespace-pre text-base md:text-sm"
        ref={sizerRef}
      >
        {shown}
      </span>
      {adornment && <InputGroupAddon align="inline-start">{adornment}</InputGroupAddon>}
    </ComboboxInput>
  );
}
