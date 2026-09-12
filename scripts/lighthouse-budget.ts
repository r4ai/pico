/** What a metric is held to, and whether missing it blocks CI or only warns. */
export type Budget = { readonly level: "warn" | "error" } & (
  | { readonly min: number; readonly max?: undefined }
  | { readonly max: number; readonly min?: undefined }
);

export const PERFORMANCE_BUDGETS = {
  score: { level: "warn", min: 0.85 },
  fcp: { level: "error", max: 3000 },
  lcp: { level: "error", max: 4000 },
  speedIndex: { level: "error", max: 3400 },
  tbt: { level: "error", max: 200 },
  cls: { level: "error", max: 0.1 },
  transferredBytes: { level: "error", max: 450_000 },
} as const satisfies Record<string, Budget>;

/** The metrics this repository measures, which is every budgeted one. */
export type MetricName = keyof typeof PERFORMANCE_BUDGETS;

/** One measurement of the whole set, or the median of several. */
export type Metrics = Record<MetricName, number>;

export type Violation = {
  readonly actual: number;
  readonly level: Budget["level"];
  readonly limit: number;
  readonly metric: MetricName;
};

/**
 * The middle measurement.
 *
 * The middle of an even count is the upper of the two, which matters not at
 * all for the three runs this is used on.
 */
export function median(values: readonly number[]): number {
  const middle = values.toSorted((left, right) => left - right)[Math.floor(values.length / 2)];
  if (middle === undefined) {
    throw new RangeError("Cannot take the median of no measurements.");
  }
  return middle;
}

/**
 * Every budget the measurement misses.
 *
 * A metric that is missing or not finite throws rather than passing: a budget
 * that cannot be evaluated has not been met.
 */
export function evaluateBudgets(metrics: Partial<Metrics>): Violation[] {
  const violations: Violation[] = [];

  for (const [metric, budget] of Object.entries(PERFORMANCE_BUDGETS) as [MetricName, Budget][]) {
    const actual = metrics[metric];
    if (actual === undefined || !Number.isFinite(actual)) {
      throw new TypeError(`${metric} must be a finite number.`);
    }

    // A floor for the score, a ceiling for everything else: the score is the
    // one metric where more is better.
    if (budget.min !== undefined) {
      if (actual < budget.min) {
        violations.push({ actual, level: budget.level, limit: budget.min, metric });
      }
    } else if (actual > budget.max) {
      violations.push({ actual, level: budget.level, limit: budget.max, metric });
    }
  }

  return violations;
}
