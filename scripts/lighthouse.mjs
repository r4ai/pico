import { mkdir, rm, writeFile } from "node:fs/promises";

import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";
import { preview } from "vite";

import { evaluateBudgets, median, PERFORMANCE_BUDGETS } from "./lighthouse-budget.mjs";

const REPORT_DIRECTORY = new URL("../lighthouse-results/", import.meta.url);
const RUN_COUNT = 3;
const TARGET_URL = "http://127.0.0.1:4173/";

function metricsFrom(lhr) {
  return {
    score: lhr.categories.performance.score,
    fcp: lhr.audits["first-contentful-paint"].numericValue,
    lcp: lhr.audits["largest-contentful-paint"].numericValue,
    speedIndex: lhr.audits["speed-index"].numericValue,
    tbt: lhr.audits["total-blocking-time"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    transferredBytes: lhr.audits["total-byte-weight"].numericValue,
  };
}

function medianMetrics(runs) {
  return Object.fromEntries(
    Object.keys(PERFORMANCE_BUDGETS).map((metric) => [
      metric,
      median(runs.map((run) => run[metric])),
    ]),
  );
}

async function measure(port, runNumber) {
  const result = await lighthouse(TARGET_URL, {
    logLevel: "error",
    onlyCategories: ["performance"],
    output: ["html", "json"],
    port,
  });

  if (!result || !Array.isArray(result.report)) {
    throw new Error(`Lighthouse run ${runNumber} did not produce reports.`);
  }

  const [html, json] = result.report;
  await Promise.all([
    writeFile(new URL(`run-${runNumber}.report.html`, REPORT_DIRECTORY), html),
    writeFile(new URL(`run-${runNumber}.report.json`, REPORT_DIRECTORY), json),
  ]);

  return metricsFrom(result.lhr);
}

async function main() {
  await rm(REPORT_DIRECTORY, { force: true, recursive: true });
  await mkdir(REPORT_DIRECTORY, { recursive: true });

  const server = await preview({
    logLevel: "silent",
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  });
  const chromeFlags = ["--headless", "--no-first-run"];
  if (process.env.CI) {
    // GitHub-hosted Linux runners do not provide a usable Chrome sandbox.
    chromeFlags.push("--no-sandbox");
  }
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags,
  });

  try {
    const runs = [];
    for (let runNumber = 1; runNumber <= RUN_COUNT; runNumber += 1) {
      process.stdout.write(`Lighthouse run ${runNumber}/${RUN_COUNT}... `);
      runs.push(await measure(chrome.port, runNumber));
      console.log("done");
    }

    const medianResult = medianMetrics(runs);
    const violations = evaluateBudgets(medianResult);
    await writeFile(
      new URL("summary.json", REPORT_DIRECTORY),
      `${JSON.stringify({ budgets: PERFORMANCE_BUDGETS, median: medianResult, runs, violations }, null, 2)}\n`,
    );

    console.table(runs.map((run, index) => ({ run: index + 1, ...run })));
    console.log("Median", medianResult);
    for (const violation of violations) {
      const message = `${violation.metric}: ${violation.actual} violates ${violation.limit}`;
      console[violation.level === "error" ? "error" : "warn"](message);
    }

    if (violations.some(({ level }) => level === "error")) {
      process.exitCode = 1;
    }
  } finally {
    chrome.kill();
    await server.close();
  }
}

await main();
