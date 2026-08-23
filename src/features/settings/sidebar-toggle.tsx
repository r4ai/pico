import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { SlidersHorizontalIcon } from "lucide-react";

export type SidebarToggleProps = {
  hidden: boolean;
  onOpen: () => void;
};

/**
 * The only thing standing between the first-run screen and every setting.
 *
 * Taken out of the tab order by `visibility: hidden` in the stylesheet rather
 * than by `inert`, which React Aria overwrites on this element while a popover
 * is open; see `.pico-sidebar-toggle`.
 */
export function SidebarToggle({ hidden, onOpen }: SidebarToggleProps) {
  return (
    <GlassPanel className="pico-sidebar-toggle p-1" data-hidden={hidden}>
      <Button aria-label="Open settings" onPress={onOpen} size="icon" variant="ghost">
        <SlidersHorizontalIcon />
      </Button>
    </GlassPanel>
  );
}
