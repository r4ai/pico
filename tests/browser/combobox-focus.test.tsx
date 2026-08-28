import { ComboboxFocus } from "@/components/combobox-focus";
import { createRef, useLayoutEffect } from "react";
import { ComboBoxStateContext } from "react-aria-components";
import { afterEach, expect, it } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react/pure";

afterEach(cleanup);

function LayoutProbe({ read }: { read: () => void }) {
  useLayoutEffect(read, [read]);
  return null;
}

it("focuses the first filtered option before Enter can follow the filter commit", async () => {
  let focusedKey: string | null = null;
  let focusedAtLayout: string | null = null;
  const firstKey = "rust";
  const state = {
    isOpen: true,
    collection: {
      getFirstKey: () => firstKey,
      getItem: (key: string) => (key === firstKey ? { key } : null),
    },
    selectionManager: {
      get focusedKey() {
        return focusedKey;
      },
      setFocusedKey(key: string) {
        focusedKey = key;
      },
    },
  };

  await render(
    <ComboBoxStateContext.Provider value={state as never}>
      <ComboboxFocus popover={createRef<HTMLElement>()} />
      <LayoutProbe
        read={() => {
          focusedAtLayout = focusedKey;
        }}
      />
    </ComboBoxStateContext.Provider>,
  );

  expect(focusedAtLayout).toBe(firstKey);
});
