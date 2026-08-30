import { loadToaster } from "@/components/toast-loader";
import "@/global.css";
import { expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react/pure";

it("shows a fallback when the notification UI cannot load", async () => {
  const { default: OfflineToaster } = await loadToaster(
    Promise.reject(new Error("The notification chunk is offline")),
  );
  await render(<OfflineToaster position="top-center" theme="dark" />);

  await expect.element(page.getByRole("alert")).toHaveTextContent("could not be shown");
});
