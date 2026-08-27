import { warmTheme } from "@/lib/shiki";
import { expect, it, vi } from "vite-plus/test";

vi.mock("@shikijs/themes/solarized-light", () => {
  throw new Error("theme download failed");
});

it("keeps speculative theme download failures isolated from the caller", async () => {
  expect(warmTheme("solarized-light")).toBeUndefined();
  await new Promise((resolve) => setTimeout(resolve, 0));
});
