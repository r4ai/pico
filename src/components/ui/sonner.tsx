import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Pico drives light and dark from its own `mode` setting rather than
 * next-themes, so the caller passes `theme` in.
 *
 * `unstyled`, and the surface drawn by `.pico-toast` instead: a toast floats
 * over the picture the way the dock does, and is made of the same glass at the
 * same corner radius. Asking sonner for no card is what makes that a
 * stylesheet rule rather than a pile of overrides — its own card rules are two
 * attribute selectors deep and its stylesheet is injected at runtime, after
 * this app's, so it wins every tie. What it keeps doing is the part it is here
 * for: stacking, lifting on hover, and swiping away.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "pico-toast",
          icon: "pico-toast-icon",
          content: "pico-toast-content",
          title: "pico-toast-title",
          description: "pico-toast-description",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
