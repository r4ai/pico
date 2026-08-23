import { atom } from "jotai";

/**
 * Whether the sidebar is open.
 *
 * Deliberately not a search param: it is about the person looking at the page,
 * not about the picture, so it has no business in a shared link.
 */
export const sidebarOpenAtom = atom(false);
