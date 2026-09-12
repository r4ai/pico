import assert from "node:assert/strict";

/** The severities `pnpm audit` reports, from least to most serious. */
const SEVERITIES = ["info", "low", "moderate", "high", "critical"] as const;

type Severity = (typeof SEVERITIES)[number];

/** Below this, an advisory is recorded by the audit but not worth an issue. */
const NOTIFY_FROM: Severity = "moderate";

const marker = /^<!-- pico-security-audit:(GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}) -->\n/;

/** What this monitor reads out of one `pnpm audit` advisory. */
type Advisory = {
  readonly github_advisory_id: string;
  readonly module_name: string;
  readonly severity: Severity;
  readonly vulnerable_versions: string;
  readonly patched_versions: string;
};

/** An issue as the GitHub API returns it, narrowed to what is read here. */
export type Issue = {
  readonly number: number;
  /** Null for an issue somebody opened with an empty body. */
  readonly body: string | null;
  readonly state: string;
  readonly user?: { readonly login?: string } | null;
  /** Present only on pull requests, which the issues endpoint also returns. */
  readonly pull_request?: unknown;
};

/** The body of an issue write, as the GitHub API takes it. */
export type IssuePayload = {
  readonly title?: string;
  readonly body?: string;
  readonly state?: "open" | "closed";
  readonly state_reason?: "completed";
};

/**
 * Writes one issue change and returns once it has landed.
 *
 * Synchronous on purpose. The only caller shells out to `gh api`, which is
 * itself synchronous, and GitHub asks that issue writes for one account be
 * made one at a time rather than concurrently — so there is no concurrency
 * here to express, and a promise would only suggest otherwise.
 */
export type WriteIssue = (method: "POST" | "PATCH", path: string, payload: IssuePayload) => void;

/** An advisory id and the issue body that reports it. */
export type Findings = ReadonlyMap<string, string>;

function isSeverity(value: unknown): value is Severity {
  return SEVERITIES.includes(value as Severity);
}

/**
 * The advisories worth an issue, as the issue body each one gets.
 *
 * The whole report is validated before any of it is used: a monitor that
 * quietly reported half an audit would close issues for advisories it simply
 * failed to read. Anything unexpected throws instead, and the workflow fails
 * with the issues it already has left alone.
 */
export function parseAudit(output: string, status: number | null): Findings {
  assert.ok(status === 0 || status === 1, "pnpm audit did not complete");
  const report: unknown = JSON.parse(output);
  assert.ok(report !== null && typeof report === "object", "Missing audit report");
  const { error, advisories: rawAdvisories, metadata } = report as Record<string, unknown>;
  assert.ok(!error, "pnpm audit returned an error");
  assert.ok(
    rawAdvisories !== null &&
      typeof rawAdvisories === "object" &&
      !Array.isArray(rawAdvisories) &&
      rawAdvisories !== undefined,
    "Missing advisories",
  );
  const advisories = Object.values(rawAdvisories) as Advisory[];
  const counts = (metadata as { vulnerabilities?: unknown } | undefined)?.vulnerabilities;
  assert.ok(counts !== null && typeof counts === "object", "Missing vulnerability counts");
  for (const severity of SEVERITIES) {
    const count: unknown = (counts as Record<string, unknown>)[severity];
    assert.ok(Number.isInteger(count) && (count as number) >= 0, "Missing vulnerability counts");
    assert.equal(
      count,
      advisories.filter((advisory) => advisory.severity === severity).length,
      "Incomplete audit findings",
    );
  }

  const groups = new Map<string, Set<string>>();
  for (const advisory of advisories) {
    assert.ok(isSeverity(advisory.severity), "Unknown severity");
    const id = advisory.github_advisory_id;
    assert.match(id, /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
    for (const field of ["module_name", "vulnerable_versions", "patched_versions"] as const) {
      assert.equal(typeof advisory[field], "string", `Missing ${field}`);
    }
    if (SEVERITIES.indexOf(advisory.severity) < SEVERITIES.indexOf(NOTIFY_FROM)) continue;
    const entries = groups.get(id) ?? new Set<string>();
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
  assert.equal(status, Number(advisories.length > 0), "Audit exit status contradicts findings");

  return new Map([...groups].map(([id, entries]) => [id, issueBody(id, entries)]));
}

/**
 * What an advisory's issue says.
 *
 * Byte-for-byte stable for an unchanged advisory: the body is what
 * {@link syncIssues} compares against to decide whether an issue needs
 * updating at all, so the packages are sorted rather than left in the order
 * the audit happened to list them.
 */
function issueBody(id: string, entries: ReadonlySet<string>): string {
  // `entries` is a Set: the spread is how it becomes an array to sort, not a
  // copy of one, and `Set` has no `toSorted`. See .react-doctor/false-positives.md.
  // react-doctor-disable-next-line react-doctor/js-tosorted-immutable
  const packages = [...entries].sort((left, right) => left.localeCompare(right, "en"));
  return (
    `<!-- pico-security-audit:${id} -->\n` +
    `The scheduled audit detected [${id}](https://github.com/advisories/${id}) in main's locked dependencies.\n\n` +
    packages.map((entry) => `- ${entry}`).join("\n") +
    "\n\nUpdate the affected dependency chain, preserve supply-chain policies, and validate with security:audit and the relevant tests.\n\n" +
    "This issue is updated only when findings change, closed when a completed audit no longer reports this advisory at moderate or higher, and reopened if it returns.\n"
  );
}

/**
 * Brings this repository's audit issues in line with the findings.
 *
 * Only issues this monitor opened are touched, recognized by the marker in
 * their body: an advisory somebody wrote up by hand is theirs to close. One
 * issue per advisory, updated only when its body changes, so a repeat finding
 * is not a notification.
 */
export function syncIssues(findings: Findings, issues: readonly Issue[], write: WriteIssue): void {
  const managed = new Map<string, Issue>();
  for (const issue of issues) {
    if (issue.pull_request || issue.user?.login !== "github-actions[bot]") continue;
    const match = marker.exec(issue.body ?? "");
    if (match?.[1]) managed.set(match[1], issue);
  }

  for (const [id, body] of findings) {
    const issue = managed.get(id);
    const title = `Security audit: ${id}`;
    if (!issue) {
      write("POST", "/issues", { title, body });
    } else if (issue.state !== "open" || issue.body !== body) {
      write("PATCH", `/issues/${issue.number}`, { title, body, state: "open" });
    }
  }

  for (const [id, issue] of managed) {
    if (!findings.has(id) && issue.state === "open") {
      write("PATCH", `/issues/${issue.number}`, { state: "closed", state_reason: "completed" });
    }
  }
}
