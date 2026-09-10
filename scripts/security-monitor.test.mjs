import assert from "node:assert/strict";
import test from "node:test";
import { parseAudit, syncIssues } from "./security-monitor.mjs";

const id = "GHSA-82fw-gwwq-j7x9";
const advisory = {
  github_advisory_id: id,
  module_name: "vitest",
  severity: "moderate",
  vulnerable_versions: "<4.1.11",
  patched_versions: ">=4.1.11",
};
function report(advisories = {}) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const advisory of Object.values(advisories)) vulnerabilities[advisory.severity]++;
  return JSON.stringify({ advisories, metadata: { vulnerabilities } });
}

await test("groups affected packages by advisory and ignores low severity", () => {
  const findings = parseAudit(
    report({
      a: advisory,
      b: { ...advisory, module_name: "@vitest/mocker" },
      c: { ...advisory, severity: "low" },
    }),
    1,
  );
  assert.equal(findings.size, 1);
  assert.ok(findings.get(id).includes("@vitest/mocker"));
  assert.ok(findings.get(id).includes("vitest"));
});

for (const [name, output, status] of [
  ["invalid JSON", "unavailable", 1],
  ["registry failure", JSON.stringify({ error: { message: "offline" } }), 1],
  ["missing advisories", JSON.stringify({ metadata: { vulnerabilities: {} } }), 0],
  ["missing metadata", JSON.stringify({ advisories: {} }), 0],
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
]) {
  await test(`rejects ${name} before changing issues`, () =>
    assert.throws(() => parseAudit(output, status)));
}

function github() {
  const issues = [];
  let writes = 0;
  return {
    issues,
    get writes() {
      return writes;
    },
    request: async (method, path, payload) => {
      writes++;
      if (method === "POST") {
        issues.push({
          number: issues.length + 1,
          state: "open",
          user: { login: "github-actions[bot]" },
          ...payload,
        });
      } else {
        Object.assign(
          issues.find((issue) => path === `/issues/${issue.number}`),
          payload,
        );
      }
    },
  };
}

await test("creates, deduplicates, updates, closes and reopens the same issue", async () => {
  const api = github();
  const findings = parseAudit(report({ a: advisory }), 1);
  await syncIssues(new Map(), api.issues, api.request);
  assert.equal(api.writes, 0);
  await syncIssues(findings, api.issues, api.request);
  assert.equal(api.issues.length, 1);
  assert.equal(api.issues[0].state, "open");
  await syncIssues(findings, api.issues, api.request);
  assert.equal(api.writes, 1);
  const changed = parseAudit(report({ a: { ...advisory, severity: "high" } }), 1);
  await syncIssues(changed, api.issues, api.request);
  assert.equal(api.writes, 2);
  assert.ok(api.issues[0].body.includes("high"));
  await syncIssues(new Map(), api.issues, api.request);
  assert.equal(api.issues[0].state, "closed");
  await syncIssues(new Map(), api.issues, api.request);
  assert.equal(api.writes, 3);
  await syncIssues(changed, api.issues, api.request);
  assert.equal(api.issues.length, 1);
  assert.equal(api.issues[0].state, "open");
  assert.equal(api.writes, 4);
});

await test("does not manage human issues or pull requests", async () => {
  const api = github();
  const findings = parseAudit(report({ a: advisory }), 1);
  api.issues.push(
    { number: 1, body: findings.get(id), state: "open", user: { login: "human" } },
    {
      number: 2,
      body: findings.get(id),
      state: "open",
      user: { login: "github-actions[bot]" },
      pull_request: {},
    },
  );
  await syncIssues(new Map(), api.issues, api.request);
  assert.equal(api.writes, 0);
});

await test("propagates GitHub API errors", async () => {
  await assert.rejects(
    syncIssues(parseAudit(report({ a: advisory }), 1), [], async () => {
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
]) {
  await test(`monitor threshold for ${severity}`, () => {
    assert.equal(parseAudit(report({ a: { ...advisory, severity } }), expected).size, expected);
  });
}

await test("advisory ordering does not cause issue updates", () => {
  const second = { ...advisory, module_name: "@vitest/mocker" };
  assert.deepEqual(
    parseAudit(report({ a: advisory, b: second }), 1),
    parseAudit(report({ b: second, a: advisory }), 1),
  );
});
