import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBudgets,
  median,
  PERFORMANCE_BUDGETS,
  type Budget,
  type MetricName,
  type Metrics,
} from "./lighthouse-budget.ts";

const budgets = Object.entries(PERFORMANCE_BUDGETS) as [MetricName, Budget][];

/** A measurement sitting exactly on every budget, which is the passing edge. */
const boundaryMetrics = Object.fromEntries(
  budgets.map(([name, budget]) => [name, budget.min ?? budget.max]),
) as Metrics;

await test("median selects the middle measurement", () => {
  assert.equal(median([3, 1, 2]), 2);
});

await test("no measurement has no median", () => {
  assert.throws(() => median([]), /Cannot take the median/);
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

for (const missing of [undefined, Number.NaN, Number.POSITIVE_INFINITY] as const) {
  await test(`a ${String(missing)} measurement fails at the boundary`, () => {
    assert.throws(
      () => evaluateBudgets({ ...boundaryMetrics, lcp: missing } as Partial<Metrics>),
      /lcp must be a finite number/,
    );
  });
}

await test("every budgeted metric is checked", () => {
  for (const [metric] of budgets) {
    const missing: Partial<Metrics> = { ...boundaryMetrics, [metric]: undefined };
    assert.throws(() => evaluateBudgets(missing), new RegExp(`${metric} must be a finite number`));
  }
});
