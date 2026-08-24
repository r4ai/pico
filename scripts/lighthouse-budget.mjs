export const PERFORMANCE_BUDGETS = {
  score: { level: "warn", min: 0.85 },
  fcp: { level: "error", max: 3000 },
  lcp: { level: "error", max: 4000 },
  speedIndex: { level: "error", max: 3400 },
  tbt: { level: "error", max: 200 },
  cls: { level: "error", max: 0.1 },
  transferredBytes: { level: "error", max: 450_000 },
};

export function median(values) {
  if (values.length === 0) {
    throw new RangeError("Cannot take the median of no measurements.");
  }

  return values.toSorted((left, right) => left - right)[Math.floor(values.length / 2)];
}

export function evaluateBudgets(metrics) {
  const violations = [];

  for (const [metric, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
    const actual = metrics[metric];
    if (!Number.isFinite(actual)) {
      throw new TypeError(`${metric} must be a finite number.`);
    }

    const limit = "min" in budget ? budget.min : budget.max;
    const violates = "min" in budget ? actual < limit : actual > limit;

    if (violates) {
      violations.push({ actual, level: budget.level, limit, metric });
    }
  }

  return violations;
}
