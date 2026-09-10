import { parseHexColor } from "@/features/settings/background";
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
  // nuqs batches URL writes. Finish the app's pending write before a subsequent
  // case replaces history, or that write can overwrite the next shared URL.
  const background = document.querySelector('[aria-label="Use theme background"]');
  if (background) {
    const expected =
      background.getAttribute("aria-checked") === "true" ? "theme" : frameBackground();
    await expect
      .poll(() => {
        const value = new URLSearchParams(window.location.search).get("background");
        return value === "transparent" ? value : (parseHexColor(value ?? "") ?? "theme");
      })
      .toBe(expected);
  }
  await cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  window.localStorage.clear();
  await page.viewport(1280, 900);
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
  await page.getByRole("radio", { name: "Custom background" }).click();
  const hex = page.getByRole("textbox", { name: "Background HEX" });
  await hex.fill("#AbC");
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => frameBackground()).toBe("#aabbcc");
  expect(frameBackground(".pico-export-host .pico-frame")).toBe("#aabbcc");
  await hex.fill("#xyz");
  await page.getByText("Background", { exact: true }).click();
  await expect.element(hex).toHaveAttribute("aria-invalid", "true");
  expect(frameBackground()).toBe("#aabbcc");
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await expect.poll(() => frameBackground()).toBe("#aabbcc");
  await page.getByRole("radio", { name: "Use theme background" }).click();
  await expect.poll(() => frameBackground()).toBe(THEMES.vitesse.colors.light.background);
  await expect.element(hex).not.toBeInTheDocument();
  await page.getByRole("radio", { name: "Custom background" }).click();
  await expect.element(hex).not.toHaveAttribute("aria-invalid", "true");
});

it("keeps a custom color when the theme changes", async () => {
  await openApp();
  await page.getByRole("radio", { name: "Custom background" }).click();
  await page.getByRole("textbox", { name: "Background HEX" }).fill("24292e");
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => frameBackground()).toBe("#24292e");
  await page.getByRole("combobox", { name: "Theme", exact: true }).fill("Catppuccin");
  await page.getByRole("option", { name: "Catppuccin" }).click();
  await expect.poll(() => frameBackground()).toBe("#24292e");
  await page.getByRole("radio", { name: "Use theme background" }).click();
  await expect.poll(() => frameBackground()).toBe(THEMES.catppuccin.colors.dark.background);
});

it.each(["%23123456", "%2312345680", "transparent", "invalid"])(
  "restores background=%s from a shared URL",
  async (value) => {
    await openApp(`?background=${value}`);
    const expected =
      value === "invalid" ? THEMES.vitesse.colors.dark.background : decodeURIComponent(value);
    await expect.poll(() => frameBackground()).toBe(expected);
  },
);

it.each([
  ["#12345600", 0],
  ["#12345680", 128],
] as const)("exports %s with matching PNG and SVG alpha", async (background, alpha) => {
  await openApp("?shadow=none");
  await page.getByRole("textbox", { name: "Code", exact: true }).fill("const color = 42;");
  await expect
    .poll(() => document.querySelector(".pico-export-host")?.textContent)
    .toContain("const color = 42;");
  await page.getByRole("radio", { name: "Custom background" }).click();
  await page.getByRole("textbox", { name: "Background HEX" }).fill(background);
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => frameBackground()).toBe(background);
  await expect
    .poll(() => new URLSearchParams(window.location.search).get("background"))
    .toBe(background);
  const node = document.querySelector<HTMLElement>(".pico-export-host")!;
  const request = {
    node,
    settings: { ...DEFAULT_SETTINGS, background, shadow: "none" },
    scale: 1,
  } as const;
  const png = await renderImage({ ...request, format: "png" });
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  expect(context.getImageData(10, 10, 1, 1).data[3]).toBe(alpha);
  bitmap.close();
  const svg = await (await renderImage({ ...request, format: "svg" })).text();
  const exported = new DOMParser().parseFromString(svg, "image/svg+xml");
  const frame = exported.querySelector<HTMLElement>(".pico-frame")!;
  expect(frame.style.backgroundColor).toBe(
    getComputedStyle(document.querySelector(".pico-shell-canvas .pico-frame")!).backgroundColor,
  );
});

it("commits valid HEX when focus leaves the input", async () => {
  await openApp();
  await page.getByRole("radio", { name: "Custom background" }).click();
  await page.getByRole("textbox", { name: "Background HEX" }).fill("abcdef");
  await page.getByText("Background", { exact: true }).click();
  await expect.poll(() => frameBackground()).toBe("#abcdef");
});

it("hides color editing in Theme and clears drafts when resetting", async () => {
  await openApp();
  const hex = page.getByRole("textbox", { name: "Background HEX" });
  await expect.element(hex).not.toBeInTheDocument();
  await page.getByRole("radio", { name: "Custom background" }).click();
  await expect.element(hex).toHaveValue("#121212");
  await hex.fill("invalid");
  await page.getByRole("radio", { name: "Use theme background" }).click();
  await expect.element(hex).not.toBeInTheDocument();
  await expect.poll(() => frameBackground()).toBe(THEMES.vitesse.colors.dark.background);
  await page.getByRole("radio", { name: "Custom background" }).click();
  await expect.element(hex).toHaveValue("#121212");
  await expect.element(hex).not.toHaveAttribute("aria-invalid", "true");
});

it.each(["%23123456", "transparent"])(
  "opens Custom for shared background=%s and supports keyboard return to Theme",
  async (background) => {
    await openApp(`?background=${background}`);
    const custom = page.getByRole("radio", { name: "Custom background" });
    await expect.element(custom).toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Background HEX" }))
      .toHaveValue(background === "transparent" ? "#00000000" : "#123456");
    await custom.click();
    await userEvent.keyboard("{ArrowLeft} ");
    await expect.element(page.getByRole("radio", { name: "Use theme background" })).toBeChecked();
    await expect
      .element(page.getByRole("textbox", { name: "Background HEX" }))
      .not.toBeInTheDocument();
  },
);

// The color editor is nested in Theme. Its popup owns opacity and the first
// Escape; the settings panel stays open and focus returns to the swatch.
it.each([1280, 390])("edits opacity and restores focus at %spx", async (width) => {
  await page.viewport(width, 900);
  await openApp("?background=%23314159");
  await expect.element(page.getByRole("radiogroup", { name: "Presets" })).not.toBeInTheDocument();
  const picker = page.getByRole("button", { name: "Background color picker" });
  await picker.click();
  const opacity = page.getByRole("slider", { name: "Opacity", exact: true });
  opacity.element().focus();
  await userEvent.keyboard("{Home}");
  await expect.poll(() => frameBackground()).toBe("#31415900");
  await userEvent.keyboard("{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}");
  await expect.poll(() => frameBackground()).toBe("#31415980");
  await expect.element(opacity).toHaveValue("0.5");
  await userEvent.keyboard("{End}");
  await expect.poll(() => frameBackground()).toBe("#314159");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("dialog", { name: "Background color", exact: true }))
    .not.toBeInTheDocument();
  await expect.element(picker).toHaveFocus();
  await expect
    .element(
      page.getByRole(width < 896 ? "dialog" : "complementary", { name: "Settings", exact: true }),
    )
    .toBeVisible();
  const section = picker.element().closest("section");
  expect(section?.querySelector("h3")?.textContent).toBe("Theme");
});

// A black/gray RGB value cannot encode hue. Moving hue before the other
// channels must still affect the resulting color, without snapping the slider.
it("retains hue through black and resynchronizes after an external HEX edit", async () => {
  await openApp("?background=%23000000");
  const picker = page.getByRole("button", { name: "Background color picker" });
  await picker.click();
  const hue = page.getByRole("slider", { name: "Hue", exact: true });
  hue.element().focus();
  await userEvent.keyboard("{Home}{PageUp}");
  await expect.element(hue).toHaveValue("15");
  expect(frameBackground()).toBe("#000000");
  const axes = page
    .getByRole("group", { name: "Background color, Color picker", exact: true })
    .element()
    .querySelectorAll<HTMLInputElement>('input[type="range"]');
  axes[0]!.focus();
  await userEvent.keyboard("{End}".repeat(10));
  await userEvent.keyboard("{PageUp}".repeat(10));
  await expect.poll(() => frameBackground()).toBe("#ff4000");
  await expect.element(hue).toHaveValue("15");
  await userEvent.keyboard("{Escape}");
  await page.getByRole("textbox", { name: "Background HEX" }).fill("0000ff80");
  await userEvent.keyboard("{Enter}");
  await picker.click();
  await expect.element(hue).toHaveValue("240");
  await expect
    .element(page.getByRole("slider", { name: "Opacity", exact: true }))
    .toHaveAttribute("aria-valuetext", "50%");
  await userEvent.keyboard("{Escape}");
});
