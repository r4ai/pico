import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAudit,
  syncIssues,
  type Issue,
  type IssuePayload,
  type WriteIssue,
} from "./security-monitor.ts";

const id = "GHSA-82fw-gwwq-j7x9";
const advisory = {
  github_advisory_id: id,
  module_name: "vitest",
  severity: "moderate",
  vulnerable_versions: "<4.1.11",
  patched_versions: ">=4.1.11",
};
function report(advisories: unknown = {}) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const entry of Object.values(advisories as Record<string, { severity: string }>)) {
    vulnerabilities[entry.severity as keyof typeof vulnerabilities]++;
  }
  return JSON.stringify({ advisories, metadata: { vulnerabilities } });
}

await test("groups affected packages by advisory", () => {
  const findings = parseAudit(
    report({
      a: advisory,
      b: { ...advisory, module_name: "@vitest/mocker" },
    }),
    1,
  );
  assert.equal(findings.size, 1);
  assert.ok(findings.get(id)?.includes("@vitest/mocker"));
  assert.ok(findings.get(id)?.includes("vitest"));
});

for (const [name, output, status] of [
  ["invalid JSON", "unavailable", 1],
  ["registry failure", JSON.stringify({ error: { message: "offline" } }), 1],
  ["missing advisories", JSON.stringify({ metadata: { vulnerabilities: {} } }), 0],
  ["missing metadata", JSON.stringify({ advisories: {} }), 0],
  ["invalid advisories type", report(true), 0],
  ["missing package name", report({ a: { ...advisory, module_name: undefined } }), 1],
  ["contradictory success", report({ a: advisory }), 0],
  ["unexpected exit", report(), 2],
  ["terminated process", report(), null],
  ["failed empty audit", report(), 1],
  [
    "incomplete audit",
    JSON.stringify({
      advisories: {},
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 0, critical: 0 } },
    }),
    0,
  ],
  ["unknown severity", report({ a: { ...advisory, severity: "unknown" } }), 1],
  ["missing advisory identity", report({ a: { ...advisory, github_advisory_id: undefined } }), 1],
] as const) {
  await test(`rejects ${name} before changing issues`, () =>
    assert.throws(() => parseAudit(output, status)));
}

/** An issue the fake below keeps, which unlike the API's is writable. */
type StoredIssue = { -readonly [Field in keyof Issue]: Issue[Field] };

/** A repository's issues, and the writes this monitor makes to them. */
function github() {
  const issues: StoredIssue[] = [];
  let writes = 0;
  const write: WriteIssue = (method, path, payload) => {
    writes++;
    if (method === "POST") {
      issues.push(applied(opened(null, issues.length + 1), payload));
      return;
    }
    const issue = issues.find((candidate) => path === `/issues/${candidate.number}`);
    assert.ok(issue, `No issue at ${path}`);
    Object.assign(issue, applied(issue, payload));
  };
  return {
    issues,
    get writes() {
      return writes;
    },
    write,
  };
}

/** An open issue owned by the monitor, which is the only kind it will touch. */
function opened(body: string | null, number = 1): StoredIssue {
  return { number, body, state: "open", user: { login: "github-actions[bot]" } };
}

/** An issue as it stands after a write, the way the API would store it. */
function applied(issue: StoredIssue, payload: IssuePayload): StoredIssue {
  return { ...issue, body: payload.body ?? issue.body, state: payload.state ?? issue.state };
}

await test("creates, deduplicates, updates, closes and reopens the same issue", () => {
  const api = github();
  const findings = parseAudit(report({ a: advisory }), 1);
  syncIssues(new Map(), api.issues, api.write);
  assert.equal(api.writes, 0);

  syncIssues(findings, api.issues, api.write);
  assert.equal(api.issues.length, 1);
  assert.equal(api.issues[0]?.state, "open");

  syncIssues(findings, api.issues, api.write);
  assert.equal(api.writes, 1);

  const changed = parseAudit(report({ a: { ...advisory, severity: "high" } }), 1);
  syncIssues(changed, api.issues, api.write);
  assert.equal(api.writes, 2);
  assert.ok(api.issues[0]?.body?.includes("high"));

  syncIssues(new Map(), api.issues, api.write);
  assert.equal(api.issues[0]?.state, "closed");

  syncIssues(new Map(), api.issues, api.write);
  assert.equal(api.writes, 3);

  syncIssues(changed, api.issues, api.write);
  assert.equal(api.issues.length, 1);
  assert.equal(api.issues[0]?.state, "open");
  assert.equal(api.writes, 4);
});

await test("issues created without a body are left alone", () => {
  const api = github();
  api.issues.push(opened(null));
  syncIssues(parseAudit(report({ a: advisory }), 1), api.issues, api.write);
  assert.equal(api.writes, 1);
  assert.equal(api.issues.length, 2);
});

await test("does not manage human issues or pull requests", () => {
  const api = github();
  const body = parseAudit(report({ a: advisory }), 1).get(id) ?? "";
  api.issues.push(
    { ...opened(body), user: { login: "human" } },
    { ...opened(body, 2), pull_request: {} },
  );
  syncIssues(new Map(), api.issues, api.write);
  assert.equal(api.writes, 0);
});

await test("propagates GitHub API errors", () => {
  assert.throws(
    () =>
      syncIssues(parseAudit(report({ a: advisory }), 1), [], () => {
        throw new Error("rate limited");
      }),
    /rate limited/,
  );
});

for (const [severity, expected] of [
  ["info", 0],
  ["low", 0],
  ["moderate", 1],
  ["high", 1],
  ["critical", 1],
] as const) {
  await test(`monitor threshold for ${severity}`, () => {
    assert.equal(parseAudit(report({ a: { ...advisory, severity } }), 1).size, expected);
  });
}

await test("advisory ordering does not cause issue updates", () => {
  const second = { ...advisory, module_name: "@vitest/mocker" };
  assert.deepEqual(
    parseAudit(report({ a: advisory, b: second }), 1),
    parseAudit(report({ b: second, a: advisory }), 1),
  );
});
