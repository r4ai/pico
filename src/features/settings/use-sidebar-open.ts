import { useStoredFlag } from "@/components/use-stored-flag";
import { SIDEBAR_INSET_QUERY } from "@/features/settings/use-sidebar-mode";

/**
 * Where the panel's open state is kept between visits.
 *
 * Namespaced, because Pico is one origin among however many a browser profile
 * has and the key space is shared.
 */
const STORAGE_KEY = "pico:sidebar-open";

/**
 * Whether the settings are open, remembered from the last visit.
 *
 * Someone who works with the settings beside the picture should not have to
 * open them again every time they come back, and the state is about the person
 * rather than the picture — which is why it is here and not in the URL, where
 * it would travel with a shared link.
 *
 * Only where the panel is a column of its own, though. As a drawer it lies over
 * the picture behind a scrim, with the canvas out of the keyboard's reach and
 * the dock hidden behind it — so restoring it on a phone would mean arriving at
 * a link and being shown the settings instead of what the link was for. The
 * preference is still kept; it is only what it means on arrival that depends on
 * the room there is. See {@link useSidebarMode}.
 */
export function useSidebarOpen(): readonly [boolean, (open: boolean) => void] {
  return useStoredFlag(
    STORAGE_KEY,
    (stored) => stored === true && window.matchMedia(SIDEBAR_INSET_QUERY).matches,
  );
}
