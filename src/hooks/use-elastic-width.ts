import { type RefObject, useLayoutEffect, useRef, useState } from "react";

export type ElasticWidth = {
  /** Goes on an out-of-flow copy of the text being measured. */
  readonly sizerRef: RefObject<HTMLSpanElement | null>;
  /** Goes on the field being sized. */
  readonly fieldRef: RefObject<HTMLInputElement | null>;
  /** The border-box width to set on the field. `undefined` before the first measurement. */
  readonly width: number | undefined;
};

/**
 * Makes a field as wide as the text it is showing.
 *
 * There is no CSS that sizes an input to its own value, so the text is laid
 * out a second time in a hidden copy and read back. Keeping that in one hook
 * keeps the measurement — and the two things that are easy to get wrong about
 * it — out of the components that use it.
 *
 * The measurement runs in a layout effect so the field is never painted at the
 * wrong width, and the number it produces is a border box, so the field's own
 * padding and border are added to what the glyphs actually take.
 */
export function useElasticWidth(text: string): ElasticWidth {
  const sizerRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState<number>();

  useLayoutEffect(() => {
    const sizer = sizerRef.current;
    const field = fieldRef.current;
    if (!sizer || !field) return;
    const style = getComputedStyle(field);
    const frame =
      parseFloat(style.paddingInlineStart) +
      parseFloat(style.paddingInlineEnd) +
      parseFloat(style.borderInlineStartWidth) +
      parseFloat(style.borderInlineEndWidth);
    setWidth(Math.ceil(sizer.getBoundingClientRect().width + frame));
  }, [text]);

  return { sizerRef, fieldRef, width };
}
