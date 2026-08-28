import { App } from "@/app";
import "@/global.css";
import { SIDEBAR_INSET_QUERY } from "@/features/settings/use-sidebar-mode";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

let unmount: (() => Promise<void>) | undefined;

beforeEach(async () => {
  await page.viewport(1280, 900);
  expect(window.matchMedia(SIDEBAR_INSET_QUERY).matches).toBe(true);
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  const rendered = await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  unmount = rendered.unmount;
  await expect.element(page.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
});

afterEach(async () => {
  await unmount?.();
  unmount = undefined;
  await cleanup();
  await page.viewport(1280, 900);
});

async function resizeTo(width: number, role: "complementary" | "dialog"): Promise<void> {
  await page.viewport(width, 900);
  await expect.poll(() => document.querySelector(".pico-sidebar")?.getAttribute("role")).toBe(role);
}

async function openSettings(): Promise<void> {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect.element(page.getByRole("button", { name: "Close settings" })).toBeInTheDocument();
}

function focusLineNumbers(): HTMLInputElement {
  const lineNumbers = document.querySelector<HTMLInputElement>('input[aria-label="Line numbers"]');
  if (!lineNumbers) throw new Error("the line-number switch is missing");
  lineNumbers.focus();
  expect(document.activeElement).toBe(lineNumbers);
  return lineNumbers;
}

it("leaves outside focus alone when a closed panel changes mode", async () => {
  const editor = page.getByRole("textbox", { name: "Code" });
  await editor.click();

  await resizeTo(420, "dialog");

  await expect.element(editor).toHaveFocus();
});

it("takes outside focus into an open panel when it becomes modal", async () => {
  await openSettings();
  await page.getByRole("textbox", { name: "Code" }).click();

  await resizeTo(420, "dialog");

  await expect.element(page.getByRole("button", { name: "Close settings" })).toHaveFocus();
});

it("keeps focus in place when an open panel becomes modal around it", async () => {
  await openSettings();
  const lineNumbers = focusLineNumbers();

  await resizeTo(420, "dialog");

  expect(document.activeElement).toBe(lineNumbers);
});

it("keeps focus in place when an open modal becomes an inset panel", async () => {
  await openSettings();
  await resizeTo(420, "dialog");
  const lineNumbers = focusLineNumbers();

  await resizeTo(1280, "complementary");

  expect(document.activeElement).toBe(lineNumbers);
});
