import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { deflateSync, strToU8 } from "fflate";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js", {
  paths: ["node_modules/.pnpm/axe-core@4.13.0/node_modules/axe-core"],
});
const axeSource = readFileSync(axePath, "utf8");

const code = `export function greet(name: string) {\n  return \`Hello, \${name}\`;\n}`;
const b64 = Buffer.from(deflateSync(strToU8(code)))
  .toString("base64")
  .replaceAll("+", "-")
  .replaceAll("/", "_")
  .replace(/=+$/, "");

const scenarios = [
  { name: "first load (1280)", width: 1280, height: 900, setup: async () => {} },
  {
    name: "settings open (1280)",
    width: 1280,
    height: 900,
    setup: async (page) => {
      await page.getByRole("button", { name: "Open settings" }).click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "save menu open (1280)",
    width: 1280,
    height: 900,
    setup: async (page) => {
      await page.getByRole("button", { name: "Save options" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "language picker open (1280)",
    width: 1280,
    height: 900,
    setup: async (page) => {
      await page.getByRole("combobox", { name: "Language" }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    name: "drawer open (420)",
    width: 420,
    height: 900,
    setup: async (page) => {
      await page.getByRole("button", { name: "Open settings" }).click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "light mode (1280)",
    width: 1280,
    height: 900,
    query: "&mode=light",
    setup: async () => {},
  },
];

const browser = await chromium.launch();
for (const scenario of scenarios) {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:4173/?c=${b64}${scenario.query ?? ""}`, { waitUntil: "load" });
  await page.waitForSelector(".cm-content");
  await page.waitForTimeout(700);
  await scenario.setup(page);
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () => {
    // @ts-ignore
    return await window.axe.run(document, { resultTypes: ["violations"] });
  });
  console.log(`\n### ${scenario.name}`);
  if (results.violations.length === 0) console.log("  no violations");
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 4)) {
      console.log(`     ${n.target.join(" ")}`);
      console.log(`       ${n.failureSummary?.split("\n").join(" | ").slice(0, 240)}`);
    }
  }
  await context.close();
}
await browser.close();
