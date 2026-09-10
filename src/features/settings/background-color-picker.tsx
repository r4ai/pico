import { Button } from "@/components/ui/button";
import { parseHexColor } from "@/features/settings/background";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorThumb,
  Dialog,
  DialogTrigger,
  Heading,
  Label,
  Popover,
  SliderOutput,
  SliderTrack,
  parseColor,
} from "react-aria-components";

const THUMB =
  "size-4 rounded-full border-2 border-white shadow-sm outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring data-focus-visible:ring-offset-2";

export function BackgroundColorPicker({
  value,
  onChange,
}: {
  value: `#${string}`;
  onChange: (value: `#${string}`) => void;
}) {
  // Keep HSB while editing: RGB alone loses the chosen hue at zero saturation
  // or brightness. External HEX/URL changes replace it only when RGB(A) differs.
  const [color, setColor] = useState(() => parseColor(value).toFormat("hsb"));
  if (parseHexColor(color.toString("hexa")) !== value) {
    setColor(parseColor(value).toFormat("hsb"));
  }

  return (
    <DialogTrigger>
      <Button aria-label="Background color picker" size="icon" variant="outline">
        <span className="pico-color-checker overflow-hidden rounded-sm">
          <ColorSwatch color={value} className="size-5" />
        </span>
      </Button>
      <Popover
        data-settings-popover
        placement="bottom start"
        offset={8}
        className="w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg"
      >
        <Dialog className="flex flex-col gap-3 outline-none">
          <Heading slot="title" className="text-sm font-medium">
            Background color
          </Heading>
          <ColorPicker
            value={color}
            onChange={(next) => {
              setColor(next);
              onChange(parseHexColor(next.toString("hexa"))!);
            }}
          >
            <ColorArea
              aria-label="Background color"
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
              className="h-32 w-full rounded-md"
            >
              <ColorThumb className={THUMB} />
            </ColorArea>
            {(
              [
                ["hue", "Hue"],
                ["alpha", "Opacity"],
              ] as const
            ).map(([channel, label]) => (
              <ColorSlider
                key={channel}
                colorSpace="hsb"
                channel={channel}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <Label>{label}</Label>
                  <SliderOutput />
                </div>
                <div className="pico-color-checker rounded-full">
                  <SliderTrack className="h-3 rounded-full">
                    <ColorThumb className={cn(THUMB, "top-1/2")} />
                  </SliderTrack>
                </div>
              </ColorSlider>
            ))}
          </ColorPicker>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
