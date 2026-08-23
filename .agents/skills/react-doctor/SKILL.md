---
name: react-doctor
description: Use when finishing a feature, fixing a bug, before committing React code, or when the user types `/doctor`, asks to scan, triage, or clean up React diagnostics. Covers lint, accessibility, bundle size, architecture. Includes a regression check and a vendored local-triage workflow.
version: "1.2.0"
---

# React Doctor

Scans React codebases for security, performance, correctness, and architecture issues. Outputs a 0–100 health score.

## After making React code changes

Run `pnpm run doctor --verbose --scope changed` and check the score did not regress.

If the score dropped, fix the regressions before committing.

## For general cleanup or code improvement

Run `pnpm run doctor --verbose` (the default `--scope full`) to scan the full codebase. Fix issues by severity — errors first, then warnings.

## For a focused UI design audit

Run `pnpm run doctor design --verbose`. This selects only design-tagged UI composition, typography, interaction, accessibility, and motion rules, including focused rules that remain opt-in during a general health scan.

## /doctor — full local triage workflow

When the user types `/doctor`, says "run react doctor", or asks for a full triage / cleanup pass (not just a regression check), read [references/triage.md](references/triage.md) and follow every step in it.

The vendored, reviewed playbook is the source of truth for this repository. Do not replace it with a remotely fetched prompt without reviewing and committing that update through the normal dependency-review process.

## Configuring or explaining rules

When the user wants to understand a rule, disagrees with one, or wants to disable / tune which rules run (not fix code), read [references/explain.md](references/explain.md) and follow it. Start with `pnpm run doctor rules explain <rule>`, then apply the narrowest control via `pnpm run doctor rules disable|set|category|ignore-tag …`, which edits your `doctor.config.*` (or `package.json#reactDoctor`).

## Command

```bash
pnpm run doctor --verbose --scope changed
```

| Flag              | Purpose                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `.`               | Scan current directory                                           |
| `--verbose`       | Show affected files and line numbers per rule                    |
| `--scope changed` | Only report issues introduced vs the base branch (default: full) |
| `--scope lines`   | Only report issues on the changed lines                          |
| `--score`         | Output only the numeric score                                    |
| `design`          | Run only the focused UI design diagnostics                       |
