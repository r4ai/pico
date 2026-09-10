import { App } from "@/app";
import "@/global.css";
import { renderImage } from "@/features/export/export-image";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { THEMES } from "@/features/settings/theme";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, expect, it } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

afterEach(async () => {
  await cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
});

async function openApp(query = "") {
  window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  window.localStorage.clear();
  await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  await page.getByRole("button", { name: "Open settings" }).click();
}

function frameBackground(selector = ".pico-shell-canvas .pico-frame") {
  const frame = document.querySelector<HTMLElement>(selector);
  if (!frame) throw new Error("Missing code frame");
  return frame.style.getPropertyValue("--pico-bg");
}

it("applies HEX on Enter, keeps invalid drafts out of the frame, and resets to the active theme", async () => {
  await openApp();
  const hex = page.getByRole("textbox", { name: "Background HEX" });
  await hex.fill("#AbC");
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => frameBackground()).toBe("#aabbcc");
  expect(frameBackground(".pico-export-host .pico-frame")).toBe("#aabbcc");
  await hex.fill("#xyz");
  await page.getByText("Custom color", { exact: true }).click();
  await expect.element(hex).toHaveAttribute("aria-invalid", "true");
  expect(frameBackground()).toBe("#aabbcc");
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await expect.poll(() => frameBackground()).toBe("#aabbcc");
  await page.getByRole("radio", { name: "Use theme background" }).click();
  await expect.poll(() => frameBackground()).toBe(THEMES.vitesse.colors.light.background);
  await expect.element(hex).not.toHaveAttribute("aria-invalid", "true");
});

it("uses a preset and keeps that explicit color when the theme changes", async () => {
  await openApp();
  await page.getByRole("radio", { name: "GitHub background" }).click();
  await expect.poll(() => frameBackground()).toBe("#24292e");
  await page.getByRole("combobox", { name: "Theme", exact: true }).fill("Catppuccin");
  await page.getByRole("option", { name: "Catppuccin" }).click();
  await expect.poll(() => frameBackground()).toBe("#24292e");
  await page.getByRole("radio", { name: "Use theme background" }).click();
  await expect.poll(() => frameBackground()).toBe(THEMES.catppuccin.colors.dark.background);
});

it.each(["%23123456", "transparent", "invalid"])(
  "restores background=%s from a shared URL",
  async (value) => {
    await openApp(`?background=${value}`);
    const expected =
      value === "invalid" ? THEMES.vitesse.colors.dark.background : decodeURIComponent(value);
    await expect.poll(() => frameBackground()).toBe(expected);
  },
);

it("exports transparent PNG pixels and SVG without a background fill", async () => {
  await openApp("?shadow=none");
  await page.getByRole("textbox", { name: "Code", exact: true }).fill("const color = 42;");
  await expect
    .poll(() => document.querySelector(".pico-export-host")?.textContent)
    .toContain("const color = 42;");
  await page.getByRole("radio", { name: "Transparent background" }).click();
  await expect.poll(() => frameBackground()).toBe("transparent");
  await expect
    .poll(() => new URLSearchParams(window.location.search).get("background"))
    .toBe("transparent");
  const node = document.querySelector<HTMLElement>(".pico-export-host")!;
  const request = {
    node,
    settings: { ...DEFAULT_SETTINGS, background: "transparent", shadow: "none" },
    scale: 1,
  } as const;
  const png = await renderImage({ ...request, format: "png" });
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  expect(context.getImageData(10, 10, 1, 1).data[3]).toBe(0);
  bitmap.close();
  const svg = await (await renderImage({ ...request, format: "svg" })).text();
  const exported = new DOMParser().parseFromString(svg, "image/svg+xml");
  const frame = exported.querySelector<HTMLElement>(".pico-frame")!;
  expect(frame.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
});

it("applies native color-picker input immediately without moving keyboard focus", async () => {
  await openApp();
  const picker = document.querySelector<HTMLInputElement>('input[type="color"]')!;
  picker.focus();
  // The OS color dialog is outside the document; deliver its native input event.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
    picker,
    "#314159",
  );
  picker.dispatchEvent(new Event("input", { bubbles: true }));
  await expect.poll(() => frameBackground()).toBe("#314159");
  await expect
    .element(page.getByRole("textbox", { name: "Background HEX" }))
    .toHaveValue("#314159");
  expect(document.activeElement).toBe(picker);
});

it("commits valid HEX when focus leaves the input", async () => {
  await openApp();
  await page.getByRole("textbox", { name: "Background HEX" }).fill("abcdef");
  await page.getByText("Custom color", { exact: true }).click();
  await expect.poll(() => frameBackground()).toBe("#abcdef");
});
