import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBudgets, median, PERFORMANCE_BUDGETS } from "./lighthouse-budget.mjs";

const boundaryMetrics = Object.fromEntries(
  Object.entries(PERFORMANCE_BUDGETS).map(([name, budget]) => [name, budget.min ?? budget.max]),
);

await test("median selects the middle measurement", () => {
  assert.equal(median([3, 1, 2]), 2);
});

await test("budget boundaries pass", () => {
  assert.deepEqual(evaluateBudgets(boundaryMetrics), []);
});

await test("a low performance score warns without blocking", () => {
  const violations = evaluateBudgets({ ...boundaryMetrics, score: 0.84 });

  assert.deepEqual(violations, [
    {
      actual: 0.84,
      level: "warn",
      limit: 0.85,
      metric: "score",
    },
  ]);
});

await test("an individual metric over budget blocks", () => {
  const violations = evaluateBudgets({ ...boundaryMetrics, lcp: 4001 });

  assert.deepEqual(violations, [
    {
      actual: 4001,
      level: "error",
      limit: 4000,
      metric: "lcp",
    },
  ]);
});

await test("a missing measurement fails at the boundary", () => {
  assert.throws(
    () => evaluateBudgets({ ...boundaryMetrics, lcp: undefined }),
    /lcp must be a finite number/,
  );
});
