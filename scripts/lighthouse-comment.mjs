const MARKER = "<!-- pico-lighthouse -->";
const METRICS = [
  ["score", "Performance（総合スコア）", 100, "点", 1],
  ["fcp", "FCP（最初の描画）", 1, "ms", 0],
  ["lcp", "LCP（主要コンテンツの描画）", 1, "ms", 0],
  ["speedIndex", "Speed Index（画面が埋まる速さ）", 1, "ms", 0],
  ["tbt", "TBT（操作を妨げる処理時間）", 1, "ms", 0],
  ["cls", "CLS（レイアウトのずれ）", 1, "", 3],
  ["transferredBytes", "転送量", 0.001, "kB", 1],
];

export function validateSummary(summary) {
  if (!/^[a-f0-9]{40}$/.test(summary.commit) || summary.runs?.length !== 3) {
    throw new TypeError("Expected a commit SHA and three Lighthouse runs.");
  }
  for (const [key] of METRICS) {
    const actual = summary.median?.[key];
    const budget = summary.budgets?.[key];
    const limit = key === "score" ? budget?.min : budget?.max;
    if (!Number.isFinite(actual) || actual < 0 || !Number.isFinite(limit) || limit < 0) {
      throw new TypeError(`Invalid Lighthouse metric or budget: ${key}`);
    }
    if (key === "score" && (actual > 1 || limit > 1)) {
      throw new TypeError("Performance score must be between zero and one.");
    }
    if (budget.level !== (key === "score" ? "warn" : "error")) {
      throw new TypeError(`Invalid Lighthouse budget level: ${key}`);
    }
  }
  return summary;
}

function format(value, [, , scale, unit, digits]) {
  return `${(value * scale).toLocaleString("en-US", { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;
}

function difference(pr, main, metric) {
  const [key, , scale, , digits] = metric;
  const delta = pr - main;
  if (Number((delta * scale).toFixed(digits)) === 0) return "変化なし（表示精度内）";
  const improved = key === "score" ? delta > 0 : delta < 0;
  return `${delta > 0 ? "+" : ""}${format(delta, metric)} ${improved ? "🟢 改善" : "🟠 悪化"}`;
}

export function renderReport({ pr, main }, { runId, attempt, serverUrl, repository }) {
  const lines = [
    MARKER,
    `<!-- lighthouse-run:${runId}:${attempt} -->`,
    "## Lighthouse：mainとの比較",
    "",
  ];
  if (!pr)
    lines.push("⚠️ PRの計測結果を取得できないため、判定できません。CIログを確認してください。", "");
  if (!main)
    lines.push(
      "⚠️ mainの計測結果を取得できないため、差分は表示できません。CIログを確認してください。",
      "",
    );

  if (pr) {
    const rows = METRICS.map((metric) => {
      const [key, label] = metric;
      const actual = pr.median[key];
      const budget = pr.budgets[key];
      const limit = key === "score" ? budget.min : budget.max;
      const violates = key === "score" ? actual < limit : actual > limit;
      const status = violates ? (budget.level === "error" ? "❌ 超過" : "⚠️ 警告") : "✅ 合格";
      return {
        level: violates ? budget.level : null,
        text: `| ${label} | ${main ? format(main.median[key], metric) : "—"} | ${format(actual, metric)} | ${main ? difference(actual, main.median[key], metric) : "—"} | ${key === "score" ? "≥" : "≤"} ${format(limit, metric)}：${status} |`,
      };
    });
    const hasErrors = rows.some(({ level }) => level === "error");
    const hasWarnings = rows.some(({ level }) => level === "warn");
    lines.push(
      hasErrors
        ? "❌ PRは既存基準を超過しています。"
        : "✅ PRはCIを失敗させる既存基準を満たしています。",
    );
    if (hasWarnings) lines.push("⚠️ Performanceスコアは目安を下回っています（警告のみ）。");
    lines.push(
      "",
      "| 指標 | main | PR（マージ結果） | 差分（PR − main） | PRの既存基準 |",
      "| --- | ---: | ---: | --- | --- |",
      ...rows.map(({ text }) => text),
      "",
    );
  }

  lines.push(
    "各3回の計測の中央値。同じランナー・Lighthouse・Chromiumで、モバイル相当の条件で順番に計測しています。",
    "スコアは高いほど、ほかの指標は低いほど良好です。差分は参考情報で、mainからの悪化だけではCIを失敗させません。計測にはばらつきがあります。",
    "",
    `計測コミット：main \`${main?.commit.slice(0, 12) ?? "取得不可"}\` ／ PRのマージ結果 \`${pr?.commit.slice(0, 12) ?? "取得不可"}\``,
    `[CIログ・詳細HTML/JSONレポート](${serverUrl}/${repository}/actions/runs/${runId}/attempts/${attempt})（Artifactsの \`lighthouse-reports-${attempt}\`、保存期間14日）`,
  );
  return lines.join("\n");
}

export async function upsertComment(github, target, body, { runId, attempt }) {
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
  const previous = existing.body.match(/<!-- lighthouse-run:(\d+):(\d+) -->/);
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
