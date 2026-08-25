import { toast } from "@/components/toast";
import { useBriefFlag } from "@/components/use-brief-flag";
import { buildShareUrl, hasBrokenCodeParam } from "@/features/settings/search-params";
import type { Settings } from "@/features/settings/settings";
import { useCallback, useEffect } from "react";

export type UseShareLinkOptions = {
  settings: Settings;
  code: string;
};

export type ShareLink = {
  readonly copyLink: () => void;
  /** True for a moment after the link lands on the clipboard. */
  readonly linkCopied: boolean;
};

/**
 * Putting the picture on the clipboard as a link rather than as an image.
 *
 * Everything on screen is in the URL, so this is the whole of Pico's sharing:
 * there is nothing on a server to point at. A long one is still copied — it is
 * a working link, and a warning is more use than a refusal.
 */
export function useShareLink({ settings, code }: UseShareLinkOptions): ShareLink {
  const copied = useBriefFlag();
  const { raise } = copied;

  const copyLink = useCallback(async () => {
    const { url, tooLong } = buildShareUrl(
      settings,
      code,
      `${window.location.origin}${window.location.pathname}`,
    );
    try {
      await navigator.clipboard.writeText(url);
      raise();
      if (tooLong) {
        toast.warning("Copied, but this link is very long.", {
          description: "Some apps and browsers cut off links this size.",
        });
      } else {
        toast.success("Copied the link.");
      }
    } catch {
      toast.error("Could not copy the link.");
    }
  }, [code, raise, settings]);

  return { copyLink, linkCopied: copied.on };
}

/**
 * Says so when the link that was followed could not be read.
 *
 * Reported rather than repaired, and reported once: what the editor holds after
 * this is an empty document, and the reason it is empty is not something the
 * page can otherwise show. See {@link hasBrokenCodeParam}.
 */
export function useBrokenLinkNotice() {
  useEffect(() => {
    if (hasBrokenCodeParam(window.location.search)) {
      toast.error("That link's code could not be read.", {
        description: "It looks truncated or altered, so the editor started empty.",
      });
    }
  }, []);
}
