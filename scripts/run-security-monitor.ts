import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { parseAudit, syncIssues, type Issue } from "./security-monitor.ts";

const repository = process.env.GITHUB_REPOSITORY;
assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/);
// Request the complete report so metadata and advisory counts stay comparable.
// Notification filtering happens only after validating the complete audit.
const audit = spawnSync("pnpm", ["audit", "--json", "--audit-level", "info"], {
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
) as Issue[][];
syncIssues(findings, pages.flat(), (method, path, payload) => {
  execFileSync("gh", ["api", "--method", method, `repos/${repository}${path}`, "--input", "-"], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: 30_000,
  });
});
console.log(`Security monitor completed: ${findings.size} moderate-or-higher advisories.`);
