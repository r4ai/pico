import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { parseAudit, syncIssues } from "./security-monitor.mjs";

const repository = process.env.GITHUB_REPOSITORY;
assert.match(repository, /^[\w.-]+\/[\w.-]+$/);
const audit = spawnSync("pnpm", ["audit", "--json", "--audit-level", "moderate"], {
  encoding: "utf8",
  timeout: 120_000,
  maxBuffer: 20 * 1024 * 1024,
});
const findings = parseAudit(audit.stdout, audit.status);
const pages = JSON.parse(
  execFileSync(
    "gh",
    ["api", `repos/${repository}/issues?state=all&per_page=100`, "--paginate", "--slurp"],
    { encoding: "utf8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024 },
  ),
);
await syncIssues(findings, pages.flat(), async (method, path, payload) => {
  execFileSync("gh", ["api", "--method", method, `repos/${repository}${path}`, "--input", "-"], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 30_000,
  });
});
console.log(`Security monitor completed: ${findings.size} moderate-or-higher advisories.`);
