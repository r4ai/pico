import { chromium } from "playwright";
import { deflateSync, strToU8 } from "fflate";

const code = `import { useState } from "react";

export function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <button type="button" onClick={() => setCount((n) => n + 1)}>
      Pressed {count} times
    </button>
  );
}`;

const b64 = Buffer.from(deflateSync(strToU8(code)))
  .toString("base64")
  .replaceAll("+", "-")
  .replaceAll("/", "_")
  .replace(/=+$/, "");
const url = `http://localhost:4173/?c=${b64}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__shifts.push({
        t: Math.round(entry.startTime),
        value: Number(entry.value.toFixed(5)),
        recent: entry.hadRecentInput,
        sources: entry.sources?.map((s) => ({
          node: s.node
            ? `${s.node.nodeName.toLowerCase()}.${(s.node.className || "").toString().split(" ")[0]}`
            : "?",
          from: [
            Math.round(s.previousRect.x),
            Math.round(s.previousRect.y),
            Math.round(s.previousRect.width),
            Math.round(s.previousRect.height),
          ],
          to: [
            Math.round(s.currentRect.x),
            Math.round(s.currentRect.y),
            Math.round(s.currentRect.width),
            Math.round(s.currentRect.height),
          ],
        })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(6000);
const shifts = await page.evaluate(() => window.__shifts);
console.log(JSON.stringify(shifts, null, 1));
console.log(
  "CLS",
  shifts
    .filter((s) => !s.recent)
    .reduce((a, s) => a + s.value, 0)
    .toFixed(5),
);
await browser.close();
