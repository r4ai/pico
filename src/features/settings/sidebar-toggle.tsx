import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { SlidersHorizontalIcon } from "lucide-react";

export type SidebarToggleProps = {
  hidden: boolean;
  onOpen: () => void;
};

/** The only thing standing between the first-run screen and every setting. */
export function SidebarToggle({ hidden, onOpen }: SidebarToggleProps) {
  return (
    <GlassPanel className="pico-sidebar-toggle p-1" data-hidden={hidden} inert={hidden}>
      <Button aria-label="Open settings" onClick={onOpen} size="icon" variant="ghost">
        <SlidersHorizontalIcon className="size-4" />
      </Button>
    </GlassPanel>
  );
}
