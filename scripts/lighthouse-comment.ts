import type { Budget, MetricName, Metrics } from "./lighthouse-budget.ts";

const MARKER = "<!-- pico-lighthouse -->";

/** How one metric is written in the comment. */
type Presentation = {
  readonly key: MetricName;
  readonly label: string;
  /** Multiplies the measured value into the unit below: bytes to kB, and so on. */
  readonly scale: number;
  /** Empty for CLS, which is a ratio. */
  readonly unit: string;
  readonly digits: number;
  readonly explanation: string;
};

/** The rows of the table, in the order they are read. */
const METRICS: readonly Presentation[] = [
  {
    key: "score",
    label: "スコア",
    scale: 100,
    unit: "点",
    digits: 1,
    explanation: "Performanceの総合スコア（0〜100）",
  },
  { key: "fcp", label: "FCP", scale: 1, unit: "ms", digits: 0, explanation: "最初の描画" },
  {
    key: "lcp",
    label: "LCP",
    scale: 1,
    unit: "ms",
    digits: 0,
    explanation: "主要コンテンツの描画",
  },
  {
    key: "speedIndex",
    label: "SI",
    scale: 1,
    unit: "ms",
    digits: 0,
    explanation: "Speed Index：画面が埋まる速さ",
  },
  {
    key: "tbt",
    label: "TBT",
    scale: 1,
    unit: "ms",
    digits: 0,
    explanation: "操作を妨げる処理時間",
  },
  {
    key: "cls",
    label: "CLS",
    scale: 1,
    unit: "",
    digits: 3,
    explanation: "レイアウトのずれ（単位なし）",
  },
  {
    key: "transferredBytes",
    label: "転送量",
    scale: 0.001,
    unit: "kB",
    digits: 1,
    explanation: "読み込み時の転送量",
  },
];

/** One measured build, as `scripts/lighthouse.mjs` writes it to summary.json. */
export type Summary = {
  readonly commit: string;
  readonly median: Metrics;
  readonly budgets: Record<MetricName, Budget>;
  readonly runs: readonly unknown[];
};

/** The two builds compared, either of which may have failed to measure. */
export type Reports = {
  readonly pr: Summary | null;
  readonly main: Summary | null;
};

/** Which run produced the comment, and where its reports can be read. */
export type RunMetadata = {
  readonly runId: number;
  readonly attempt: number;
  readonly serverUrl: string;
  readonly repository: string;
};

/**
 * The summary, once it is safe to put in a comment.
 *
 * This reads a file that a pull request's own CI run produced, so nothing in it
 * is trusted: a commit is 40 hex digits or it is not rendered, and every metric
 * and budget must be a finite, non-negative number before it reaches Markdown.
 * An invalid summary is reported as unavailable rather than shown as zero.
 */
export function validateSummary(summary: unknown): Summary {
  const candidate = summary as Partial<Summary> | null;
  if (!/^[a-f0-9]{40}$/.test(candidate?.commit ?? "") || candidate?.runs?.length !== 3) {
    throw new TypeError("Expected a commit SHA and three Lighthouse runs.");
  }
  for (const { key } of METRICS) {
    const actual = candidate.median?.[key];
    const budget = candidate.budgets?.[key];
    const limit = key === "score" ? budget?.min : budget?.max;
    if (
      actual === undefined ||
      !Number.isFinite(actual) ||
      actual < 0 ||
      limit === undefined ||
      !Number.isFinite(limit) ||
      limit < 0
    ) {
      throw new TypeError(`Invalid Lighthouse metric or budget: ${key}`);
    }
    if (key === "score" && (actual > 1 || limit > 1)) {
      throw new TypeError("Performance score must be between zero and one.");
    }
    if (budget?.level !== (key === "score" ? "warn" : "error")) {
      throw new TypeError(`Invalid Lighthouse budget level: ${key}`);
    }
  }
  return candidate as Summary;
}

function format(value: number, { scale, digits }: Presentation): string {
  return (value * scale).toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** The signed change, or an em dash where it rounds away or cannot be taken. */
function difference(pr: number, main: number, metric: Presentation): string {
  const delta = pr - main;
  if (Number((delta * metric.scale).toFixed(metric.digits)) === 0) return "—";
  const improved = metric.key === "score" ? delta > 0 : delta < 0;
  return `${delta > 0 ? "+" : ""}${format(delta, metric)} ${improved ? "🟢" : "🟠"}`;
}

/** The limit a metric is held to, which is a floor only for the score. */
function limitOf(budget: Budget, { key }: Presentation): number {
  return (key === "score" ? budget.min : budget.max) ?? Number.NaN;
}

export function renderReport(
  { pr, main }: Reports,
  { runId, attempt, serverUrl, repository }: RunMetadata,
): string {
  const lines = [MARKER, `<!-- lighthouse-run:${runId}:${attempt} -->`, "### Lighthouse", ""];
  if (!pr)
    lines.push("⚠️ PRの計測結果を取得できないため、判定できません。CIログを確認してください。", "");
  if (!main)
    lines.push(
      "⚠️ mainの計測結果を取得できないため、差分は表示できません。CIログを確認してください。",
      "",
    );

  const budgetRows: string[] = [];
  if (pr) {
    const rows = METRICS.map((metric) => {
      const { key, label, unit } = metric;
      const actual = pr.median[key];
      const budget = pr.budgets[key];
      const limit = limitOf(budget, metric);
      const violates = key === "score" ? actual < limit : actual > limit;
      const status = violates ? (budget.level === "error" ? "❌ 超過" : "⚠️ 警告") : "✅ 合格";
      budgetRows.push(
        `| ${label} | ${key === "score" ? "≥" : "≤"} ${format(limit, metric)} ${unit} | ${status} |`,
      );
      return {
        level: violates ? budget.level : null,
        text: `| ${label}${unit ? ` (${unit})` : ""} | ${main ? format(main.median[key], metric) : "—"} | ${format(actual, metric)} | ${main ? difference(actual, main.median[key], metric) : "—"} |`,
      };
    });
    const hasErrors = rows.some(({ level }) => level === "error");
    const hasWarnings = rows.some(({ level }) => level === "warn");
    lines.push(hasErrors ? "❌ PRは既存基準を超過しています。" : "✅ 既存基準を満たしています。");
    if (hasWarnings) lines.push("⚠️ スコアは目安未満（警告のみ）。");
    lines.push(
      "",
      "| 指標 | main | PR | 差分 |",
      "| --- | ---: | ---: | ---: |",
      ...rows.map(({ text }) => text),
      "",
    );
  }

  lines.push(
    "🟢 改善 ／ 🟠 悪化",
    "",
    `[詳細レポート・CIログ](${serverUrl}/${repository}/actions/runs/${runId}/attempts/${attempt})`,
    "",
    "<details>",
    "<summary>指標・基準・計測条件</summary>",
    "",
    ...METRICS.map(({ label, explanation }) => `- **${label}**：${explanation}`),
    "",
    "スコアは高いほど、ほかの指標は低いほど良好です。差分はPR − main。— は表示精度内で変化なし、または比較不可を表します。",
    "",
    ...(budgetRows.length
      ? ["**PRの既存基準**", "", "| 指標 | 基準 | 判定 |", "| --- | --- | --- |", ...budgetRows, ""]
      : []),
    "各3回の計測の中央値。同じランナー・Lighthouse・Chromiumで、モバイル相当の条件で順番に計測しています。",
    "差分は参考情報で、mainからの悪化だけではCIを失敗させません。計測にはばらつきがあります。PRはマージ結果、mainは比較用チェックアウト時点のビルドです。",
    "",
    `計測コミット：main \`${main?.commit.slice(0, 12) ?? "取得不可"}\` ／ PRのマージ結果 \`${pr?.commit.slice(0, 12) ?? "取得不可"}\``,
    `HTML/JSON：Artifactsの \`lighthouse-reports-${attempt}\`（保存期間14日）。`,
    "",
    "</details>",
  );
  return lines.join("\n");
}

/** A comment as the issues API returns it, narrowed to what is read here. */
export type IssueComment = {
  readonly id: number;
  readonly body?: string;
  readonly user?: { readonly login?: string } | null;
};

export type CommentTarget = {
  readonly owner: string;
  readonly repo: string;
  readonly issue_number: number;
};

/** The part of github-script's Octokit this needs. */
export type CommentApi = {
  paginate: (
    route: unknown,
    options: CommentTarget & { per_page: number },
  ) => Promise<IssueComment[]>;
  rest: {
    issues: {
      listComments: unknown;
      createComment: (options: CommentTarget & { body: string }) => Promise<unknown>;
      updateComment: (options: {
        owner: string;
        repo: string;
        comment_id: number;
        body: string;
      }) => Promise<unknown>;
    };
  };
};

/**
 * Leaves one comment per pull request, whatever order the runs finish in.
 *
 * Only this bot's own comment is ever rewritten, and only by a run at least as
 * recent as the one that wrote it: a slow attempt finishing after a newer one
 * would otherwise replace the current numbers with stale ones.
 */
export async function upsertComment(
  github: CommentApi,
  target: CommentTarget,
  body: string,
  { runId, attempt }: Pick<RunMetadata, "runId" | "attempt">,
): Promise<void> {
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...target,
    per_page: 100,
  });
  const existing = comments.find(
    (comment) => comment.user?.login === "github-actions[bot]" && comment.body?.startsWith(MARKER),
  );
  if (!existing) {
    await github.rest.issues.createComment({ ...target, body });
    return;
  }
  const previous = /<!-- lighthouse-run:(\d+):(\d+) -->/.exec(existing.body ?? "");
  if (
    previous &&
    (Number(previous[1]) > runId ||
      (Number(previous[1]) === runId && Number(previous[2]) > attempt))
  )
    return;
  await github.rest.issues.updateComment({
    owner: target.owner,
    repo: target.repo,
    comment_id: existing.id,
    body,
  });
}
