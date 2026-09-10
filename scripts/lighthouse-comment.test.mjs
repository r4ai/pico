import assert from "node:assert/strict";
import test from "node:test";

import { renderReport, upsertComment, validateSummary } from "./lighthouse-comment.mjs";

const summary = {
  commit: "a".repeat(40),
  median: {
    score: 0.9,
    fcp: 1200,
    lcp: 2000,
    speedIndex: 2300,
    tbt: 50,
    cls: 0.01,
    transferredBytes: 300000,
  },
  budgets: {
    score: { min: 0.85, level: "warn" },
    fcp: { max: 3000, level: "error" },
    lcp: { max: 4000, level: "error" },
    speedIndex: { max: 3400, level: "error" },
    tbt: { max: 200, level: "error" },
    cls: { max: 0.1, level: "error" },
    transferredBytes: { max: 450000, level: "error" },
  },
  runs: [{}, {}, {}],
};
const metadata = {
  runId: 42,
  attempt: 1,
  serverUrl: "https://github.com",
  repository: "r4ai/pico",
};

await test("report explains improvements, regressions, unchanged metrics and absolute budgets", () => {
  const pr = { ...summary, median: { ...summary.median, score: 0.8, lcp: 1500, tbt: 201 } };
  const body = renderReport({ pr, main: summary }, metadata);
  assert.match(body, /\| Performance.*\| 90.*\| 80.*\|.*悪化/);
  assert.match(body, /\| LCP.*\| 2,000 ms.*\| 1,500 ms.*\|.*改善/);
  assert.match(body, /\| FCP.*変化なし/);
  assert.match(body, /警告/);
  assert.match(body, /超過/);
  assert.match(body, /既存基準を超過/);
  assert.match(body, /差分は参考情報/);
  assert.match(body, /3回.*中央値/);
  assert.match(body, /actions\/runs\/42/);
  assert.match(body, /aaaaaaaaaaaa/);
});

await test("passing boundaries and a zero baseline are rendered without invalid percentages", () => {
  const main = { ...summary, median: { ...summary.median, tbt: 0 } };
  const pr = { ...summary, median: { ...summary.median, score: 0.85, tbt: 200, cls: 0.1 } };
  const body = renderReport({ pr, main }, metadata);
  assert.match(body, /既存基準を満たしています/);
  assert.doesNotMatch(body, /NaN|Infinity|超過|警告/);
  assert.match(body, /\+200 ms/);
});

for (const [name, reports, expected] of [
  ["main unavailable", { pr: summary, main: null }, /main.*計測結果を取得できない/],
  ["PR unavailable", { pr: null, main: summary }, /PR.*計測結果を取得できない/],
  ["both unavailable", { pr: null, main: null }, /PR.*計測結果を取得できない/],
]) {
  await test(name, () => assert.match(renderReport(reports, metadata), expected));
}

for (const { name, invalid } of [
  { name: "missing metric", invalid: { ...summary, median: { ...summary.median, score: null } } },
  { name: "score out of range", invalid: { ...summary, median: { ...summary.median, score: 2 } } },
  { name: "invalid SHA", invalid: { ...summary, commit: "<script>" } },
  { name: "missing budgets", invalid: { ...summary, budgets: {} } },
  { name: "wrong run count", invalid: { ...summary, runs: [] } },
  {
    name: "invalid severity",
    invalid: { ...summary, budgets: { ...summary.budgets, score: { min: 0.85, level: "error" } } },
  },
]) {
  await test(`rejects ${name}`, () => {
    assert.throws(() => validateSummary(invalid));
  });
}

// This stateful fake represents only the external GitHub comment store.
function commentStore(initial = []) {
  const comments = structuredClone(initial);
  return {
    comments,
    paginate: async () => comments,
    rest: {
      issues: {
        listComments() {},
        async createComment({ body }) {
          comments.push({ id: 100, body, user: { login: "github-actions[bot]" } });
        },
        async updateComment({ comment_id, body }) {
          comments.find(({ id }) => id === comment_id).body = body;
        },
      },
    },
  };
}

await test("creates once, updates on rerun, preserves human comments and ignores older runs", async () => {
  const github = commentStore([
    { id: 1, body: "<!-- pico-lighthouse --> user comment", user: { login: "someone" } },
  ]);
  const target = { owner: "r4ai", repo: "pico", issue_number: 1 };
  const first = renderReport({ pr: summary, main: summary }, metadata);
  await upsertComment(github, target, first, metadata);
  const second = renderReport({ pr: summary, main: null }, { ...metadata, attempt: 2 });
  await upsertComment(github, target, second, { ...metadata, attempt: 2 });
  await upsertComment(github, target, first, metadata);
  await upsertComment(github, target, first, { ...metadata, runId: 41 });
  assert.equal(github.comments.length, 2);
  assert.equal(github.comments[0].body, "<!-- pico-lighthouse --> user comment");
  assert.equal(github.comments[1].body, second);
});
