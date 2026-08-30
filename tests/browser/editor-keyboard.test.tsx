import { App } from "@/app";
import { CODE_PARAM, recoverPendingCode } from "@/features/settings/search-params";
import "@/global.css";
import { decodeCode } from "@/lib/url-codec";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;

function inEditor(): boolean {
  return document.activeElement?.classList.contains("cm-content") ?? false;
}

function codeInUrl(): string {
  const encoded = new URLSearchParams(window.location.search).get(CODE_PARAM);
  return encoded === null ? "" : decodeCode(encoded);
}

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  window.sessionStorage.clear();
  // The sidebar remembers whether it was open, and these tests share a page:
  // left behind, the panel arrives at the next test already open.
  window.localStorage.clear();
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  // The dock is loaded on its own; there is nothing to tab to until it lands.
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
});

it("lets the keyboard out of the editor", async () => {
  await page.getByRole("textbox", { name: "Code" }).click();
  expect(inEditor()).toBe(true);

  // Tab is the editor's, which is what makes the escape hatch necessary.
  await userEvent.keyboard("{Tab}");
  expect(inEditor()).toBe(true);

  await userEvent.keyboard("{Escape}");
  await userEvent.keyboard("{Tab}");
  expect(inEditor()).toBe(false);
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Language");
});

it("says how to get out, for anyone who cannot see the dock", async () => {
  const content = document.querySelector(".cm-content");
  const describedBy = content?.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  expect(document.getElementById(describedBy ?? "")?.textContent).toContain("Escape");
});

it("persists the latest edit when the page leaves before the URL throttle flushes", async () => {
  const editor = page.getByRole("textbox", { name: "Code" });
  await editor.fill("const persisted = 1;");
  await expect.poll(codeInUrl).toBe("const persisted = 1;");

  await editor.fill("const persisted = 2;");
  expect(codeInUrl()).toBe("const persisted = 1;");

  recoverPendingCode();

  expect(codeInUrl()).toBe("const persisted = 2;");
});
