import { App } from "@/app";
import { renderImage } from "@/features/export/export-image";
import { familyNameOf, fontFaceCss, FONTS } from "@/features/settings/fonts";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import "@/global.css";
import { NuqsAdapter } from "nuqs/adapters/react";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { cleanup, render } from "vitest-browser-react/pure";

const addedFonts = ["hackgen", "plemoljp", "firge"] as const;

beforeEach(async () => {
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  const fonts = document.createElement("style");
  fonts.dataset.testFonts = "";
  fonts.textContent = fontFaceCss();
  document.head.append(fonts);
  await render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
  await page.getByRole("button", { name: "Open settings" }).click();
});

afterEach(async () => {
  await cleanup();
  document.querySelector("style[data-test-fonts]")?.remove();
});

it("keeps unselected Japanese fonts unloaded when opening the picker", async () => {
  await page.getByRole("combobox", { name: "Font", exact: true }).click();
  for (const id of addedFonts) {
    await expect
      .element(
        page.getByRole("option", { name: `${FONTS[id].label} ${FONTS[id].note}`, exact: true }),
      )
      .toBeVisible();
  }
  const families = addedFonts.map((id) => familyNameOf(FONTS[id]));
  const faces = [...document.fonts].filter((face) =>
    families.includes(face.family.replaceAll('"', "")),
  );
  expect(faces).toHaveLength(3);
  expect(faces.every((face) => face.status === "unloaded")).toBe(true);
});

it.each(addedFonts)("selects %s, loads its Japanese face and exports Japanese text", async (id) => {
  const font = FONTS[id];
  await page.getByRole("combobox", { name: "Font", exact: true }).click();
  await page.getByRole("combobox", { name: "Font", exact: true }).fill(id);
  await page.getByRole("option", { name: `${font.label} ${font.note}`, exact: true }).click();
  await expect.poll(() => new URLSearchParams(window.location.search).get("font")).toBe(id);
  const frame = document.querySelector<HTMLElement>(".pico-shell-canvas .pico-frame");
  expect(frame).not.toBeNull();
  expect(getComputedStyle(frame!).fontFamily).toContain(font.label);
  const faces = await document.fonts.load(
    `16px "${familyNameOf(font)}"`,
    "日本語の表示 あいうえお 漢字",
  );
  expect(faces).toHaveLength(1);
  expect(faces[0]?.status).toBe("loaded");

  await page
    .getByRole("textbox", { name: "Code", exact: true })
    .fill("// 日本語の表示 あいうえお 漢字");
  const exportNode = document.querySelector<HTMLElement>(".pico-export-host");
  await expect.poll(() => exportNode?.textContent).toContain("日本語の表示");
  const blob = await renderImage({
    node: exportNode!,
    settings: { ...DEFAULT_SETTINGS, font: id },
    format: "svg",
    scale: 1,
  });
  const svg = await blob.text();
  expect(svg).toContain(`font-family:"${familyNameOf(font)}"`);
  expect(svg).toContain("data:font/woff2;base64,");
  expect(svg).toContain("日本語の表示");
  const png = await renderImage({
    node: exportNode!,
    settings: { ...DEFAULT_SETTINGS, font: id },
    format: "png",
    scale: 1,
  });
  const bitmap = await createImageBitmap(png);
  expect(bitmap.width).toBeGreaterThan(0);
  expect(bitmap.height).toBeGreaterThan(0);
  bitmap.close();
});
