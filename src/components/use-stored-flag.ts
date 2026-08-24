import { useCallback, useState } from "react";

/**
 * What a previous visit left under this key.
 *
 * `undefined` covers all three ways there is nothing to go on: nobody has
 * written one yet, what is there is not one of the two spellings this hook
 * writes, and the browser refuses to be asked at all — Safari throws on
 * `localStorage` in private mode rather than handing back an empty store.
 */
function read(key: string): boolean | undefined {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // A preference that cannot be stored is still a preference for this visit.
  }
}

/**
 * A flag that outlives the tab.
 *
 * The stored value is read while the first render is being built rather than
 * from an effect, so whatever it describes is already in place on the first
 * frame. Restoring a layout one frame late is the same thing as changing it
 * under someone who has just arrived.
 *
 * @param resolve what to start at, given what was stored — `undefined` when
 * there was nothing to go on. It runs once, on the first render, so the caller
 * decides what a remembered value is worth in the situation the page has
 * actually come up in, rather than being handed it unconditionally.
 *
 * @returns the flag and its setter. Every write goes to storage as well; a
 * browser that refuses to keep it is not an error worth telling anyone about.
 */
export function useStoredFlag(
  key: string,
  resolve: (stored: boolean | undefined) => boolean,
): readonly [boolean, (next: boolean) => void] {
  const [flag, setFlag] = useState(() => resolve(read(key)));

  const change = useCallback(
    (next: boolean) => {
      setFlag(next);
      write(key, next);
    },
    [key],
  );

  return [flag, change];
}
