import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("every pushed commit triggers the non-deployment CI workflows", async () => {
  const ciWorkflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const doctorWorkflow = await readFile(
    new URL("../.github/workflows/react-doctor.yml", import.meta.url),
    "utf8",
  );

  assert.match(ciWorkflow, /on:\n  push:\n  pull_request:/);
  assert.match(
    doctorWorkflow,
    /on:\n  pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review\]\n  push:/,
  );
});

void test("deployment jobs remain restricted to their intended events", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /preview:\n    name: Deploy preview\n    if: github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/,
  );
  assert.match(
    workflow,
    /production:\n    name: Deploy production\n    if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
  );
});

void test("the CI test job enforces the coverage thresholds", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

  assert.match(workflow, /- name: Test\n\s+script: test:coverage/);
});

void test("the CI test job uploads coverage only for trusted events", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /if: >-\n\s+matrix\.script == 'test:coverage' &&\n\s+\(github\.event_name == 'push' \|\|\n\s+\(github\.actor != 'dependabot\[bot\]' &&\n\s+github\.event\.pull_request\.head\.repo\.full_name == github\.repository\)\)/,
  );
});

void test("the CI test job uploads the Clover report with pinned Codecov tools", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /uses: codecov\/codecov-action@fb8b3582c8e4def4969c97caa2f19720cb33a72f # v7\.0\.0/,
  );
  assert.match(workflow, /token: \$\{\{ secrets\.CODECOV_TOKEN \}\}/);
  assert.match(workflow, /files: \.\/coverage\/clover\.xml/);
  assert.match(workflow, /disable_search: true/);
  assert.match(workflow, /fail_ci_if_error: true/);
  assert.match(workflow, /version: v11\.3\.1/);
});
