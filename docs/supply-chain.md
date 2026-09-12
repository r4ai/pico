# Supply-chain security

The repository uses pnpm's native controls to reduce dependency supply-chain
risk:

- dependency versions must be at least 24 hours old, including transitive
  dependencies;
- direct dependencies and tool versions are pinned exactly;
- packages without registry publication timestamps are rejected;
- releases whose publisher trust evidence regresses are rejected;
- transitive dependencies cannot use arbitrary Git or tarball sources;
- only the packages explicitly listed in `allowBuilds` may run install scripts;
- CI installs the committed lockfile without resolving new versions;
- GitHub Actions are pinned to full commit SHAs and checked by pinact;
- pull requests receive dependency review, and CI rejects moderate-or-higher
  known vulnerabilities.

`trustPolicyExclude` contains narrowly versioned exceptions for legacy
transitive releases that predate consistent publisher trust evidence. Do not
broaden an exception to a package name or version range.

## Updating dependencies

Run updates only with the pnpm version pinned in `mise.toml`:

```sh
mise exec -- pnpm update --latest
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm run check
mise exec -- pnpm run test
mise exec -- pnpm run build
mise exec -- pnpm run build-storybook
mise exec -- pnpm run security:audit
```

pnpm selects the newest versions that satisfy `minimumReleaseAge`. Review every
manifest and lockfile change before committing it. If an update introduces an
install script, pnpm fails until that exact package is deliberately approved or
denied in `allowBuilds`.

`@vitest/coverage-v8` is excluded from bulk updates because Vite+ requires its
version to exactly match the Vitest version bundled by Vite+. Update the
provider together with Vite+, then verify with `pnpm run test:coverage`.

The `miniflare>sharp` override pins the patched release for
[GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
Remove it once the pinned Wrangler version brings in Miniflare with
`sharp >=0.35.4` and the dependency audit passes without the override.

Update workflow action pins with:

```sh
mise exec -- pinact run
mise exec -- pinact run --check
```

## Proactive security maintenance

[Security monitor](../.github/workflows/security-monitor.yml) audits main every
six hours, at approximately 03:17, 09:17, 15:17 and 21:17 JST. It also supports a
manual run from the Actions tab. Scheduled Actions can be delayed and GitHub can
disable them after 60 days of inactivity in public repositories.

The monitor uses the pinned pnpm and frozen lockfile, with install scripts
disabled. It creates one `Security audit: GHSA-…` issue per moderate-or-higher
advisory, grouping all affected packages. Its body marker and GitHub Actions bot
author identify managed issues; unrelated issues and pull requests are untouched.
Repeated findings produce no writes or comments. Changed findings update the
existing issue, resolved findings close it, and recurrence reopens the same issue.
Registry, process, malformed-response and GitHub API errors fail the workflow;
an incomplete audit never closes issues. Finding a vulnerability succeeds once
its issue is synchronized, avoiding repeated failure notifications. The existing
push/PR audit continues to block moderate-or-higher vulnerabilities.

The external Codex automation `pico` checks security issues and ongoing fixes
daily at 10:00 JST. It checks monitor health, including stale or disabled runs,
and continues existing PRs before opening another. Broader maintenance remains
weekly on Mondays. No change means no notification; new findings, completed
fixes, failures and required decisions are reported. This automation requires
its Codex host to be available; GitHub detection runs independently of that host.

Repairs preserve the 24-hour release age and audit policy. Vite+, its Vite core,
and matching Vitest adapters must be updated together. PRs adding overrides or
requiring breaking changes are left for human review rather than automatically
merged. Renovate is a later extension for routine version updates; it is not
installed by this initial monitoring setup.

Run the monitor's behavior tests locally with:

```sh
mise exec -- node --test --experimental-test-coverage scripts/security-monitor.test.ts
```

To start a monitor run manually using the GitHub Actions bot identity:

```sh
gh workflow run security-monitor.yml --ref main
```
