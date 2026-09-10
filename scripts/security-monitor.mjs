import assert from "node:assert/strict";

const severities = ["info", "low", "moderate", "high", "critical"];
const marker = /^<!-- pico-security-audit:(GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}) -->\n/;

export function parseAudit(output, status) {
  assert.ok(status === 0 || status === 1, "pnpm audit did not complete");
  const report = JSON.parse(output);
  assert.ok(!report.error, "pnpm audit returned an error");
  assert.ok(
    report.advisories && typeof report.advisories === "object" && !Array.isArray(report.advisories),
    "Missing advisories",
  );
  const advisories = Object.values(report.advisories);
  const counts = report.metadata?.vulnerabilities;
  for (const severity of severities) {
    assert.ok(
      Number.isInteger(counts?.[severity]) && counts[severity] >= 0,
      "Missing vulnerability counts",
    );
    assert.equal(
      counts[severity],
      advisories.filter((advisory) => advisory.severity === severity).length,
      "Incomplete audit findings",
    );
  }
  const groups = new Map();
  for (const advisory of advisories) {
    assert.ok(severities.includes(advisory.severity), "Unknown severity");
    const id = advisory.github_advisory_id;
    assert.match(id, /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
    for (const field of ["module_name", "vulnerable_versions", "patched_versions"]) {
      assert.equal(typeof advisory[field], "string", `Missing ${field}`);
    }
    if (severities.indexOf(advisory.severity) < 2) continue;
    const entries = groups.get(id) ?? new Set();
    entries.add(
      JSON.stringify({
        package: advisory.module_name,
        severity: advisory.severity,
        affected: advisory.vulnerable_versions,
        patched: advisory.patched_versions,
      }),
    );
    groups.set(id, entries);
  }
  assert.equal(status, Number(groups.size > 0), "Audit exit status contradicts findings");
  return new Map(
    [...groups].map(([id, entries]) => [
      id,
      `<!-- pico-security-audit:${id} -->\n` +
        `The scheduled audit detected [${id}](https://github.com/advisories/${id}) in main's locked dependencies.\n\n` +
        [...entries]
          .sort((left, right) => left.localeCompare(right, "en"))
          .map((entry) => `- ${entry}`)
          .join("\n") +
        "\n\nUpdate the affected dependency chain, preserve supply-chain policies, and validate with security:audit and the relevant tests.\n\n" +
        "This issue is updated only when findings change, closed when a completed audit no longer reports this advisory at moderate or higher, and reopened if it returns.\n",
    ]),
  );
}

export async function syncIssues(findings, issues, request) {
  const managed = new Map();
  for (const issue of issues) {
    if (issue.pull_request || issue.user?.login !== "github-actions[bot]") continue;
    const match = marker.exec(issue.body);
    if (match) managed.set(match[1], issue);
  }
  for (const [id, body] of findings) {
    const issue = managed.get(id);
    const title = `Security audit: ${id}`;
    if (!issue) {
      await request("POST", "/issues", { title, body });
    } else if (issue.state !== "open" || issue.body !== body) {
      await request("PATCH", `/issues/${issue.number}`, { title, body, state: "open" });
    }
  }
  for (const [id, issue] of managed) {
    if (!findings.has(id) && issue.state === "open") {
      await request("PATCH", `/issues/${issue.number}`, {
        state: "closed",
        state_reason: "completed",
      });
    }
  }
}
