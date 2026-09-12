import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findCurrentPullRequest, publishReport, readSummaries } from "./lighthouse-publish.mjs";
import { PERFORMANCE_BUDGETS } from "./lighthouse-budget.ts";

const run = {
  id: 42,
  run_attempt: 1,
  event: "pull_request",
  path: ".github/workflows/ci.yml",
  head_sha: "a".repeat(40),
  head_repository: { id: 7 },
  pull_requests: [{ number: 3 }],
};
const pr = {
  number: 3,
  state: "open",
  head: { sha: run.head_sha, repo: { id: 7 } },
  base: { repo: { full_name: "r4ai/pico" } },
};
const context = { repo: { owner: "r4ai", repo: "pico" }, payload: { workflow_run: run } };
const summary = {
  commit: run.head_sha,
  median: Object.fromEntries(
    Object.entries(PERFORMANCE_BUDGETS).map(([key, budget]) => [key, budget.min ?? budget.max]),
  ),
  budgets: PERFORMANCE_BUDGETS,
  runs: [{}, {}, {}],
};

function githubState(pull = pr, latestAttempt = 1) {
  return {
    paginate: async () => [pull],
    rest: {
      actions: { getWorkflowRun: async () => ({ data: { run_attempt: latestAttempt } }) },
      pulls: { get: async () => ({ data: pull }) },
      repos: { listPullRequestsAssociatedWithCommit() {} },
    },
  };
}

await test("selects an open PR at the measured head, including forks with no run PR metadata", async () => {
  assert.equal(await findCurrentPullRequest(githubState(), context), 3);
  assert.equal(
    await findCurrentPullRequest(githubState(), {
      ...context,
      payload: { workflow_run: { ...run, pull_requests: [] } },
    }),
    3,
  );
});

for (const { name, pull, attempt = 1 } of [
  { name: "closed PR", pull: { ...pr, state: "closed" } },
  { name: "superseded commit", pull: { ...pr, head: { ...pr.head, sha: "b".repeat(40) } } },
  { name: "different fork", pull: { ...pr, head: { ...pr.head, repo: { id: 8 } } } },
  {
    name: "different base repository",
    pull: { ...pr, base: { repo: { full_name: "other/repo" } } },
  },
  { name: "superseded attempt", pull: pr, attempt: 2 },
]) {
  await test(`skips ${name}`, async () =>
    assert.equal(await findCurrentPullRequest(githubState(pull, attempt), context), null));
}

for (const override of [{ event: "push" }, { path: ".github/workflows/untrusted.yml" }]) {
  await test(`rejects unexpected trigger ${JSON.stringify(override)}`, async () => {
    assert.equal(
      await findCurrentPullRequest(githubState(), {
        ...context,
        payload: { workflow_run: { ...run, ...override } },
      }),
      null,
    );
  });
}

async function reportArchive(t, entries) {
  const directory = await mkdtemp(join(tmpdir(), "lighthouse-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const files = [];
  for (const [name, content] of Object.entries(entries)) {
    await mkdir(join(directory, name));
    const file = `${name}/summary.json`;
    await writeFile(join(directory, file), content);
    files.push(file);
  }
  const archive = join(directory, "reports.zip");
  execFileSync("zip", [archive, ...files], { cwd: directory });
  return archive;
}

await test("reads invalid and missing ZIP entries as unavailable", async (t) => {
  const archive = await reportArchive(t, { pr: "{invalid" });
  const warnings = [];
  assert.deepEqual(await readSummaries(archive, (message) => warnings.push(message)), {
    pr: null,
    main: null,
  });
  assert.equal(warnings.length, 2);
});

function publisherState(data) {
  const github = githubState();
  const comments = [];
  const artifacts = [
    { id: 1, name: "lighthouse-reports-1", expired: false, size_in_bytes: data.length },
  ];
  const warnings = [];
  github.rest.actions.listWorkflowRunArtifacts = () => artifacts;
  github.rest.actions.downloadArtifact = async () => ({ data });
  github.rest.issues = {
    listComments: () => comments,
    createComment: async ({ body }) => comments.push({ body }),
  };
  github.paginate = async (endpoint) => endpoint();
  return {
    comments,
    artifacts,
    warnings,
    input: {
      github,
      context: { ...context, serverUrl: "https://github.com" },
      core: { warning: (message) => warnings.push(message) },
    },
  };
}

await test("publishes a validated real ZIP comparison", async (t) => {
  const archive = await reportArchive(t, {
    pr: JSON.stringify(summary),
    main: JSON.stringify(summary),
  });
  const { input, comments } = publisherState(await readFile(archive));
  await publishReport(input);
  assert.equal(comments.length, 1);
  assert.match(comments[0].body, /\| LCP.*合格/);
  assert.match(comments[0].body, /aaaaaaaaaaaa/);
});

await test("publishes the valid side when the other summary is invalid", async (t) => {
  const archive = await reportArchive(t, { pr: JSON.stringify(summary), main: "null" });
  const { input, comments, warnings } = publisherState(await readFile(archive));
  await publishReport(input);
  assert.match(comments[0].body, /\| LCP.*合格/);
  assert.match(comments[0].body, /mainの計測結果を取得できない/);
  assert.equal(warnings.length, 1);
});

await test("reports a missing current-attempt artifact instead of reusing stale data", async () => {
  const { input, comments, artifacts } = publisherState(Buffer.alloc(0));
  artifacts[0].name = "lighthouse-reports-previous-attempt";
  await publishReport(input);
  assert.match(comments[0].body, /PRの計測結果を取得できない/);
});

await test("does not publish when the PR advances during download", async (t) => {
  const archive = await reportArchive(t, {
    pr: JSON.stringify(summary),
    main: JSON.stringify(summary),
  });
  const data = await readFile(archive);
  const { input, comments } = publisherState(data);
  input.github.rest.actions.downloadArtifact = async () => {
    input.github.rest.pulls.get = async () => ({ data: { ...pr, state: "closed" } });
    return { data };
  };
  await publishReport(input);
  assert.equal(comments.length, 0);
});

await test("skips a superseded run before reading artifacts", async () => {
  const { input, comments } = publisherState(Buffer.alloc(0));
  input.github.rest.actions.getWorkflowRun = async () => ({ data: { run_attempt: 2 } });
  await publishReport(input);
  assert.equal(comments.length, 0);
});

await test("rejects an oversized artifact", async () => {
  const { input, artifacts } = publisherState(Buffer.alloc(0));
  artifacts[0].size_in_bytes = 51 * 1024 * 1024;
  await assert.rejects(publishReport(input), /exceeds 50 MiB/);
});
