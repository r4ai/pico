import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { renderReport, upsertComment, validateSummary } from "./lighthouse-comment.mjs";

const exec = promisify(execFile);

export async function findCurrentPullRequest(github, context) {
  const run = context.payload.workflow_run;
  if (run.event !== "pull_request" || run.path !== ".github/workflows/ci.yml") return null;
  const { data: latest } = await github.rest.actions.getWorkflowRun({
    ...context.repo,
    run_id: run.id,
  });
  if (latest.run_attempt !== run.run_attempt) return null;
  // Fork runs can omit pull_requests. Resolve candidates from GitHub, never artifact data.
  const candidates = run.pull_requests.length
    ? run.pull_requests
    : await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
        ...context.repo,
        commit_sha: run.head_sha,
        per_page: 100,
      });
  for (const candidate of candidates) {
    const { data: pr } = await github.rest.pulls.get({
      ...context.repo,
      pull_number: candidate.number,
    });
    if (
      pr.state === "open" &&
      pr.head.sha === run.head_sha &&
      pr.head.repo?.id === run.head_repository?.id &&
      pr.base.repo.full_name === `${context.repo.owner}/${context.repo.repo}`
    )
      return pr.number;
  }
  return null;
}

export async function readSummaries(archive, warn) {
  const reports = { pr: null, main: null };
  for (const name of Object.keys(reports)) {
    try {
      // Read exact entries to stdout; never extract or execute PR-supplied files.
      const { stdout } = await exec("unzip", ["-p", archive, `${name}/summary.json`], {
        maxBuffer: 1024 * 1024,
        timeout: 10000,
      });
      reports[name] = validateSummary(JSON.parse(stdout));
    } catch {
      warn(`${name}: Lighthouse summary is missing or invalid.`);
    }
  }
  return reports;
}

export async function publishReport({ github, context, core }) {
  const issueNumber = await findCurrentPullRequest(github, context);
  if (issueNumber === null) return;
  const run = context.payload.workflow_run;
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
    ...context.repo,
    run_id: run.id,
    per_page: 100,
  });
  const artifact = artifacts.find(
    ({ name, expired }) => name === `lighthouse-reports-${run.run_attempt}` && !expired,
  );
  let reports = { pr: null, main: null };
  if (artifact) {
    if (artifact.size_in_bytes > 50 * 1024 * 1024)
      throw new RangeError("Lighthouse artifact exceeds 50 MiB.");
    const directory = await mkdtemp(join(tmpdir(), "lighthouse-comment-"));
    try {
      const { data } = await github.rest.actions.downloadArtifact({
        ...context.repo,
        artifact_id: artifact.id,
        archive_format: "zip",
      });
      const archive = join(directory, "reports.zip");
      await writeFile(archive, Buffer.from(data));
      reports = await readSummaries(archive, (message) => core.warning(message));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  const metadata = {
    runId: run.id,
    attempt: run.run_attempt,
    serverUrl: context.serverUrl,
    repository: `${context.repo.owner}/${context.repo.repo}`,
  };
  const body = renderReport(reports, metadata);
  // Recheck after downloading, in case the PR advanced while we were reading reports.
  if ((await findCurrentPullRequest(github, context)) !== issueNumber) return;
  await upsertComment(github, { ...context.repo, issue_number: issueNumber }, body, metadata);
}
