import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("the CI test job enforces the coverage thresholds", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

  assert.match(workflow, /- name: Test\n\s+script: test:coverage/);
});
